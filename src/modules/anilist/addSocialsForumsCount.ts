import Cache from '@/utils/Cache';
import { $, waitFor, createElement, anilistApi, getUserId } from '@/utils/Helpers';
import { ONE_MINUTE } from '@/utils/Constants';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addSocialsForumsCount',
	name: 'Forums Threads/Comments Count',
	description: 'Adds the number of threads/comments to the user social page.',
	togglable: true,
	tags: [
		ModuleTags.Profile,
		ModuleTags.Social,
	],

	validate({ currentPage }) {
		return /^\/user\/.+\/social$/.test(currentPage.pathname);
	},

	async load() {
		const targetLoaded = await waitFor('.user-social .filters');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		// Get the username from the URL.
		const username = /\/user\/(.+)\/social/.exec(location.pathname)?.[1];

		// If the username is not found, return.
		if (!username) return;

		// Get the user ID from the username.
		const userId = await getUserId(username);

		// If the user ID is not found, return.
		if (!userId) return;

		let threadsCount: number | undefined = await Cache.get('user-threads-count', userId.toString());
		let threadCommentsCount: number | undefined = await Cache.get('user-threadComments-count', userId.toString());

		if (!threadsCount) {
			const { data: threadsData } = await anilistApi(`
				query ($userId: Int!) {
					Page {
						pageInfo {
							total
						}
						threads(userId: $userId) {
							id
						}
					}
				}
			`, { userId }) as AnilistUserThreadsResponse;

			threadsCount = threadsData.Page.pageInfo.total;

			await Cache.set('user-threads-count', userId.toString(), threadsCount, ONE_MINUTE * 5);
		}

		if (!threadCommentsCount) {
			const { data: threadCommentsData } = await anilistApi(`
				query ($userId: Int!) {
					Page {
						pageInfo {
							total
						}
						threadComments(userId: $userId) {
							id
						}
					}
				}
			`, { userId }) as AnilistUserThreadCommentsResponse;

			threadCommentsCount = threadCommentsData.Page.pageInfo.total;

			await Cache.set('user-threadComments-count', userId.toString(), threadCommentsCount, ONE_MINUTE * 5);
		}

		createElement('span', {
			textContent: ` (${threadsCount})`,
			appendTo: $('.user-social .filter-group span:nth-of-type(3)')!,
		});

		createElement('span', {
			textContent: ` (${threadCommentsCount})`,
			appendTo: $('.user-social .filter-group span:nth-of-type(4)')!,
		});
	},
});
