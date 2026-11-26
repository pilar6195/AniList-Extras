import Cache from '@/utils/Cache';
import { $, $$, waitFor, observe, createElement, anilistApi, jitterDuration } from '@/utils/Helpers';
import { ONE_HOUR, ONE_DAY } from '@/utils/Constants';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';
import SvgIcons from '@/utils/SvgIcons';

import moduleStyles from '@/styles/addActivityScores.scss';

type scoreFormat = 'POINT_3' | 'POINT_5' | 'POINT_10_DECIMAL' | 'POINT_10' | 'POINT_100';

type AnilistUserScoresResponse = {
	data: {
		Page: {
			mediaList: {
				score: number;
				user: {
					mediaListOptions: {
						scoreFormat: scoreFormat;
					};
				};
			}[];
		};
	};
};

type ActivityScore = {
	username: string;
	mediaId: string;
	score: number;
	scoreFormat: scoreFormat | undefined;
};

const activitySelector = '.activity-feed .activity-anime_list, .activity-feed .activity-manga_list';

// How long a card has to stay on screen before its score is fetched, so scrolling past cards doesn't fetch all of them.
const visibleFetchDelayMs = 300;

let running = false;
let observer: MutationObserver;
let visibilityObserver: IntersectionObserver | undefined;

// Timers for cards that just came on screen, so they can be cancelled if the card scrolls away first.
const visibleFetchTimers = new Map<HTMLElement, Timer>();

// Entries ("username:mediaId") being fetched right now, so cards for the same entry share one request.
const scoreIdsBeingFetched = new Set<string>();

// Entries whose fetch failed, so they aren't fetched again every time they come on screen. Cleared when the module unloads.
const failedScoreIds = new Set<string>();

/**
 * Formats a score the way the user's score format shows it.
 */
const formatScoreLabel = ({ score, scoreFormat }: ActivityScore): string => {
	// This shouldn't ever happen but in the case it does we fallback to the plain score.
	if (!scoreFormat) {
		return `${score}`;
	}

	switch (scoreFormat) {
		case 'POINT_100': {
			return `${score}/100`;
		}

		case 'POINT_10_DECIMAL':
		case 'POINT_10': {
			return `${score}/10`;
		}

		case 'POINT_5': {
			return `${score} ${SvgIcons.star}`;
		}

		case 'POINT_3': {
			if (score === 1) {
				return `${SvgIcons.frown}`;
			}

			if (score === 2) {
				return `${SvgIcons.meh}`;
			}

			if (score === 3) {
				return `${SvgIcons.smile}`;
			}

			return '';
		}

		// Again, should never get here but in the case anilist adds a new
		// score type we don't handle, we'll fallback to the plain score.
		default: {
			return `${score}`;
		}
	}
};

/**
 * Shows the score on an activity card and stops waiting for the card to come on screen. Unrated entries don't get a label.
 */
const showActivityScore = (activityElement: HTMLElement, activityScore: ActivityScore) => {
	visibilityObserver?.unobserve(activityElement);
	clearTimeout(visibleFetchTimers.get(activityElement));
	visibleFetchTimers.delete(activityElement);

	activityElement.dataset['scoreFetched'] = 'true';
	activityElement.querySelector('.alextras--activity-score')?.remove();

	if (activityScore.score === 0) {
		return;
	}

	createElement('span', {
		attributes: {
			class: 'alextras--activity-score',
		},
		innerHTML: formatScoreLabel(activityScore),
		appendTo: activityElement.querySelector('.status')!,
	});
};

/**
 * Fetches a user's score for a media from AniList and caches it.
 */
const fetchActivityScore = async (username: string, mediaId: string): Promise<ActivityScore> => {
	// Using Page since it returns an empty list when the user has no list entry instead of an error.
	const { data } = await anilistApi(`
		query ($userName: String, $mediaId: Int) {
			Page {
				mediaList(userName: $userName, mediaId: $mediaId) {
					score
					user {
						mediaListOptions {
							scoreFormat
						}
					}
				}
			}
		}
	`, { userName: username, mediaId: Number(mediaId) }) as AnilistUserScoresResponse;

	const mediaListEntry = data.Page.mediaList[0];

	const activityScore: ActivityScore = {
		username,
		mediaId,
		score: mediaListEntry?.score || 0,
		scoreFormat: mediaListEntry?.user.mediaListOptions.scoreFormat,
	};

	// Scores rarely change once set, so cache them for about a day. Unrated entries are only cached for
	// about an hour since users usually rate shortly after finishing.
	const cacheTime = activityScore.score === 0 ? ONE_HOUR : ONE_DAY;
	await Cache.set('activity-score', `${username}:${mediaId}`, activityScore, jitterDuration(cacheTime));

	return activityScore;
};

/**
 * Fetches the score for a card that's been on screen for a moment, and shows it on every card for the same entry.
 */
const loadActivityScore = async (activityElement: HTMLElement) => {
	const scoreId = activityElement.dataset['scoreId'];

	if (!scoreId || activityElement.dataset['scoreFetched'] || scoreIdsBeingFetched.has(scoreId) || failedScoreIds.has(scoreId)) {
		return;
	}

	scoreIdsBeingFetched.add(scoreId);

	try {
		const [username, mediaId] = scoreId.split(':');
		const activityScore = await fetchActivityScore(username, mediaId);

		// Cards for the same entry (e.g. several episodes) get the score too, even if they haven't come on screen yet.
		for (const card of $$(activitySelector)) {
			if (card.dataset['scoreId'] === scoreId) {
				showActivityScore(card, activityScore);
			}
		}
	} catch (error) {
		// Don't retry failed entries. failed entries either failed multiple
		// times with the retry or returned a http 500 error.
		failedScoreIds.add(scoreId);
		console.error(error);
	} finally {
		scoreIdsBeingFetched.delete(scoreId);
	}
};

/**
 * Starts a short timer when a card comes on screen and cancels it when the card leaves before the timer is up.
 */
const handleVisibilityChange = (entries: IntersectionObserverEntry[]) => {
	for (const entry of entries) {
		if (!(entry.target instanceof HTMLElement)) {
			continue;
		}

		const activityElement = entry.target;
		clearTimeout(visibleFetchTimers.get(activityElement));
		visibleFetchTimers.delete(activityElement);

		if (entry.isIntersecting) {
			visibleFetchTimers.set(activityElement, setTimeout(() => {
				visibleFetchTimers.delete(activityElement);
				void loadActivityScore(activityElement);
			}, visibleFetchDelayMs));
		}
	}
};

/**
 * Shows cached scores on new activity cards right away, and waits for the rest to come on screen before fetching them.
 */
const prepareActivityCards = async () => {
	if (running) {
		return;
	}

	running = true;

	try {
		for (const activityElement of $$(activitySelector)) {
			let username = activityElement.querySelector('.name')!.getAttribute('href')!;
			username = /^\/user\/(.+)\/$/.exec(username)![1];
			let mediaId = activityElement.querySelector('.title')!.getAttribute('href')!;
			mediaId = /^\/(?:anime|manga)\/(\d+)\//.exec(mediaId!)![1];
			const scoreId = `${username}:${mediaId}`;

			// Due to how vue works, the element may have been updated with new data so we need to check if the
			// data in the container is still the same as before and if not we'd need to reset this element.
			if (activityElement.dataset['scoreId'] === scoreId) {
				// Observing an element that's already observed does nothing, but this picks waiting cards back up after the module reloads.
				if (!activityElement.dataset['scoreFetched']) {
					visibilityObserver?.observe(activityElement);
				}

				continue;
			}

			activityElement.dataset['scoreId'] = scoreId;
			activityElement.dataset['scoreFetched'] = '';
			activityElement.querySelector('.alextras--activity-score')?.remove();

			const cachedScore = await Cache.get('activity-score', scoreId) as ActivityScore | undefined;

			if (cachedScore) {
				showActivityScore(activityElement, cachedScore);
			} else if (!activityElement.dataset['scoreFetched']) {
				// Observing again makes the observer report whether the card is on screen right now, even if it already was.
				visibilityObserver?.unobserve(activityElement);
				visibilityObserver?.observe(activityElement);
			}
		}
	} catch (error) {
		console.error(error);
	} finally {
		running = false;
	}
};

registerModule.anilist({
	id: 'addActivityScores',
	name: 'Media Activity Scores',
	description: 'Displays the score a user gives to an anime or manga in activity feeds.',
	notice: 'Scores load once an activity is on screen and are cached for about a day (an hour for unrated entries) to avoid API rate limits.',
	tags: [
		ModuleTags.Media,
		ModuleTags.Social,
		ModuleTags.Metadata,
	],
	toggleable: true,
	styles: moduleStyles,

	validate({ currentPage }) {
		return currentPage.pathname.startsWith('/home')
			|| /^\/(anime|manga)\/\d+\/.+\/social$/.test(currentPage.pathname)
			|| /^\/user\/[^/]+\/?$/.test(currentPage.pathname);
	},

	async load() {
		const targetLoaded = await waitFor('.activity-feed');

		// If the target element is not found, return.
		if (!targetLoaded) {
			return;
		}

		visibilityObserver = new IntersectionObserver(handleVisibilityChange);
		observer = observe($('.activity-feed')!, () => void prepareActivityCards());
		void prepareActivityCards();
	},

	unload() {
		observer?.disconnect();
		visibilityObserver?.disconnect();
		visibilityObserver = undefined;

		for (const timer of visibleFetchTimers.values()) {
			clearTimeout(timer);
		}

		visibleFetchTimers.clear();
		failedScoreIds.clear();
		running = false;
	},
});
