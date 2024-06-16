import Cache from '@/utils/Cache';
import { $, waitFor, createElement, anilistApi, getUserId, ONE_MINUTE } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addSocialsFollowsCount',

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

		// let followingCount: number | undefined = await Cache.get('user-following-count', userId.toString());
		let followingCount: number | undefined;
		let followersCount: number | undefined = await Cache.get('user-followers-count', userId.toString());

		if (!followingCount) {
			const { data: followingData } = await anilistApi(`
				query ($userId: Int!) {
					Page {
						pageInfo {
							total
						}
						following(userId: $userId) {
							id
						}
					}
				}
			`, { userId }) as AnilistUserFollowingResponse;

			followingCount = followingData.Page.pageInfo.total;

			// Don't really know how effective this cache will be but better than making continuous requests.
			// We don't want this to be cached for too long as this is something that would update frequently.
			// Might end up removing this cache.
			await Cache.set('user-following-count', userId.toString(), followingCount, ONE_MINUTE * 5);
		}

		if (!followersCount) {
			const { data: followersData } = await anilistApi(`
				query ($userId: Int!) {
					Page {
						pageInfo {
							total
						}
						followers(userId: $userId) {
							id
						}
					}
				}
			`, { userId }) as AnilistUserFollowersResponse;

			followersCount = followersData.Page.pageInfo.total;

			await Cache.set('user-followers-count', userId.toString(), followersCount, ONE_MINUTE * 5);
		}

		createElement('span', {
			textContent: ` (${followingCount})`,
			appendTo: $('.user-social .filter-group span:nth-of-type(1)')!,
		});

		createElement('span', {
			textContent: ` (${followersCount})`,
			appendTo: $('.user-social .filter-group span:nth-of-type(2)')!,
		});
	},
});
