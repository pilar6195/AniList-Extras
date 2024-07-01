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
		let activities: {
			username: string;
			mediaId: string;
			container: HTMLElement;
		}[] = [];

		for (const activityElement of activityElements) {
			if (activityElement.dataset['scoreFetched']) continue;

			let username = activityElement.querySelector('.name')!.getAttribute('href')!;
			username = (/^\/user\/(.+)\/$/.exec(username))![1];
			let mediaId = activityElement.querySelector('.title')!.getAttribute('href')!;
			mediaId = (/^\/(?:anime|manga)\/(\d+)\//.exec((mediaId!)))![1];

			activities.push({
				username,
				mediaId,
				container: activityElement,
			});
		}

		if (!activities.length) return;

		// Remove duplicates
		activities = activities.reduce((acc: typeof activities, val) => {
			if (!acc.some(a => a.username === val.username && a.mediaId === val.mediaId)) {
				acc.push(val);
			}

			return acc;
		}, []);

		const activityScores: ActivityScore[] = [];

		const uncachedActivityScores: {
			username: string;
			mediaId: string;
		}[] = [];

		for (const activity of activities) {
			const activityScore = await Cache.get('activity-score', `${activity.username}:${activity.mediaId}`) as ActivityScore;

			if (activityScore) {
				activityScores.push(activityScore);
			} else {
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
					score: entry[1].mediaList[0].score,
					scoreFormat: entry[1].mediaList[0].user.mediaListOptions.scoreFormat,
				};
			});

			activityScores.push(...newActivityScores);

			for (const activityScore of newActivityScores) {
				// Cache the score for 6 hours. This may be to long, we can adjust it later.
				await Cache.set('activity-score', `${activityScore.username}:${activityScore.mediaId}`, activityScore, ONE_HOUR * 6);
			}
		}

		for (const activityScore of activityScores) {
			const matchedActivities = activities.filter(a => {
				return a.username === activityScore.username && a.mediaId === activityScore.mediaId;
			});

			for (const activity of matchedActivities) {
				activity.container.dataset['scoreFetched'] = 'true';

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
						class: 'alextras--activity-score-container',
					},
					styles: {
						backgroundColor: 'rgb(var(--color-background))',
						color: 'rgb(var(--color-text))',
						padding: '0.3em 0.5em',
						borderRadius: '3px',
						marginLeft: '0.25em',
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
	description: 'Adds the score a user gave to a anime/manga in the activity feeds.',
	notice: 'Scores are cached for 6 hours to avoid API rate limits.',
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
