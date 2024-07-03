import Cache from '@/utils/Cache';
import { $, $$, waitFor, observe, createElement, anilistApi } from '@/utils/Helpers';
import { ONE_HOUR } from '@/utils/Constants';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';
import SvgIcons from '@/utils/SvgIcons';

import moduleStyles from '@/styles/addActivityScores.scss';

type scoreFormat = 'POINT_3' | 'POINT_5' | 'POINT_10_DECIMAL' | 'POINT_10' | 'POINT_100';

type AnilistUserScoresResponse = {
	data: {
		[key: string]: {
			mediaList: {
				score: number;
				user: {
					mediaListOptions: {
						scoreFormat: scoreFormat
					}
				}
			}[];
		};
	}
};

type ActivityScore = {
	username: string;
	mediaId: string;
	score: number;
	scoreFormat: scoreFormat;
};

let running = false;
let observer: MutationObserver;

const processActivity = async () => {
	if (running) return;

	running = true;

	try {
		const activityElements = $$('.activity-feed .activity-anime_list, .activity-feed .activity-manga_list');
		const activities: {
			username: string;
			mediaId: string;
			container: HTMLElement;
		}[] = [];

		for (const activityElement of activityElements) {
			let username = activityElement.querySelector('.name')!.getAttribute('href')!;
			username = (/^\/user\/(.+)\/$/.exec(username))![1];
			let mediaId = activityElement.querySelector('.title')!.getAttribute('href')!;
			mediaId = (/^\/(?:anime|manga)\/(\d+)\//.exec((mediaId!)))![1];

			// Due to how vue works, the element may have been updated with new data so we need to check if the
			// data in the container is still the same as before and if not we'd need to reset this element.
			if (
				activityElement.dataset['scoreId'] &&
				activityElement.dataset['scoreId'] !== `${username}:${mediaId}`
			) {
				activityElement.dataset['scoreFetched'] = '';
				activityElement.dataset['scoreId'] = '';
				activityElement.querySelector('.alextras--activity-score')?.remove();
			}

			if (activityElement.dataset['scoreFetched']) continue;

			activities.push({
				username,
				mediaId,
				container: activityElement,
			});
		}

		if (!activities.length) return;

		const activityScores: ActivityScore[] = [];

		const uncachedActivityScores: {
			username: string;
			mediaId: string;
		}[] = [];

		for (const activity of activities) {
			const activityScore = await Cache.get('activity-score', `${activity.username}:${activity.mediaId}`) as ActivityScore;

			if (activityScore) {
				if (activityScores.some(a => {
					return a.username === activity.username && a.mediaId === activity.mediaId;
				})) continue;

				activityScores.push(activityScore);
			} else {
				if (uncachedActivityScores.some(a => {
					return a.username === activity.username && a.mediaId === activity.mediaId;
				})) continue;

				uncachedActivityScores.push({
					username: activity.username,
					mediaId: activity.mediaId,
				});
			}
		}

		if (uncachedActivityScores.length) {
			const queries = uncachedActivityScores.map(a => {
				return `score_${a.username}_${a.mediaId}: Page {
					mediaList(userName: "${a.username}", mediaId: ${a.mediaId}) {
						score
						user {
							mediaListOptions {
								scoreFormat
							}
						}
					}
				}`;
			});

			const { data } = await anilistApi(`{ ${queries.join('\n')} }`) as AnilistUserScoresResponse;

			const newActivityScores = Object.entries(data).map(entry => {
				const [username, mediaId] = entry[0].split('_').slice(1);
				return {
					username,
					mediaId,
					score: entry[1].mediaList[0]?.score || 0,
					scoreFormat: entry[1].mediaList[0]?.user.mediaListOptions.scoreFormat,
				};
			});

			activityScores.push(...newActivityScores);

			for (const activityScore of newActivityScores) {
				// Cache the score for 1 hour. This may be to short, we can adjust it later.
				await Cache.set('activity-score', `${activityScore.username}:${activityScore.mediaId}`, activityScore, ONE_HOUR);
			}
		}

		for (const activityScore of activityScores) {
			const matchedActivities = activities.filter(a => {
				return a.username === activityScore.username && a.mediaId === activityScore.mediaId;
			});

			for (const activity of matchedActivities) {
				activity.container.dataset['scoreFetched'] = 'true';
				activity.container.dataset['scoreId'] = `${activityScore.username}:${activityScore.mediaId}`;

				if (activityScore.score === 0) continue;

				let scoreLabel = '';

				switch (activityScore.scoreFormat) {
					case 'POINT_100': {
						scoreLabel = `${activityScore.score}/100`;
						break;
					}

					case 'POINT_10_DECIMAL':
					case 'POINT_10': {
						scoreLabel = `${activityScore.score}/10`;
						break;
					}

					case 'POINT_5': {
						scoreLabel = `${activityScore.score} ${SvgIcons.star}`;
						break;
					}

					case 'POINT_3': {
						if (activityScore.score === 1) {
							scoreLabel = `${SvgIcons.frown}`;
						} else if (activityScore.score === 2) {
							scoreLabel = `${SvgIcons.meh}`;
						} else if (activityScore.score === 3) {
							scoreLabel = `${SvgIcons.smile}`;
						}

						break;
					}

					default: {
						scoreLabel = `${activityScore.score}`;
					}
				}

				createElement('span', {
					attributes: {
						class: 'alextras--activity-score',
					},
					innerHTML: scoreLabel,
					appendTo: activity.container.querySelector('.status')!,
				});
			}
		}

		console.log(`Fetched score for ${activityScores.length} activities.`);
	} catch (error: any) {
		console.error(error);
	} finally {
		// eslint-disable-next-line require-atomic-updates
		running = false;
	}
};

registerModule.anilist({
	id: 'addActivityScores',
	name: 'Media Activity Scores',
	description: 'Displays the score a user gives to an anime or manga in activity feeds.',
	notice: 'Scores are cached for 1 hour to avoid API rate limits.',
	tags: [
		ModuleTags.Media,
		ModuleTags.Social,
		ModuleTags.Metadata,
	],
	toggleable: true,
	styles: moduleStyles,

	validate({ currentPage }) {
		return currentPage.pathname.startsWith('/home') ||
			currentPage.pathname.endsWith('/social') ||
			/^\/user\/[^/]+\/?$/.test(currentPage.pathname);
	},

	async load() {
		const targetLoaded = await waitFor('.activity-feed');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		observer = observe($('.activity-feed')!, () => void processActivity());
		void processActivity();
	},

	unload() {
		observer?.disconnect();
		running = false;
	},
});
