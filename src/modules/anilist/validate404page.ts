import { $, anilistApi } from '@/utils/Helpers';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';

type AnilistResponse = {
	errors?: {
		message: string;
	}[];
	data: {
		user: {
			users: {
				id: number;
			}[];
		};
		mediaList: {
			userId: number;
		}[];
	};
};

registerModule.anilist({
	id: 'validate404page',
	name: 'Validate 404 Page',
	description: 'Checks if the 404 page for a user is due to a private profile, user not found, or if the user has blocked you.',
	tags: [
		ModuleTags.Global,
		ModuleTags.Profile,
	],
	toggleable: true,
	styles: `
		.not-found[data-content]:after {
			content: attr(data-content);
			position: absolute;
			top: 0;
			right: 0;
			background: rgba(var(--color-overlay), 0.4);
			font-size: 1.5em;
			font-weight: 4;
			letter-spacing: 1.4px;
			color: white;
			padding: 11px 33px;
		}
	`,

	validate({ currentPage, previousPage }) {
		if (!previousPage) {
			return false;
		}

		return currentPage.pathname === '/404' &&
			/^\/user\/.+/.test(previousPage.pathname);
	},

	async load({ previousPage }) {
		const type = previousPage!.pathname.split('/')[1];
		const id = previousPage!.pathname.split('/')[2];

		if (type !== 'user') return;

		// ModChan is a fake account used by site moderators.
		if (id.toLowerCase() === 'modchan') {
			$('.not-found')!.dataset['content'] = 'ModChan';
			return;
		}

		// This query is constructed in a way that it will return an error with "Private User"
		// if the user's profile is private, return a 404 if the user doesn't exist,
		// or return a user if the user has blocked you.
		const response = await anilistApi(`
			query ($username: String) {
				user: Page {
					users(name: $username) {
						id
					}
				}
				mediaList: Page {
					mediaList(userName: $username, mediaId: 1) {
						userId
					}
				}
			}
		`, {
			username: id,
		}, false, false).catch(error => error.json) as AnilistResponse;

		let content = '';

		if (response.errors) {
			if (response.errors.some((error: any) => error.message === 'Private User')) {
				content = 'Private Profile';
			} else {
				content = 'User not found';
			}
		} else if (response.data.user.users.length !== 0) {
			content = 'User blocked you';
		}

		if (content) {
			$('.not-found')!.dataset['content'] = content;
		}
	},
});
