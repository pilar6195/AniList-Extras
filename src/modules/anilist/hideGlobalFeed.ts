import { $, waitFor } from '@/utils/Helpers';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'hideGlobalFeed',
	name: 'Hide Global Feed',
	description: 'Hides the global feed on the home page.',
	tags: [
		ModuleTags.Home,
		ModuleTags.Social,
	],
	togglable: true,
	disabledDefault: true,

	validate({ currentPage }) {
		return currentPage.pathname.startsWith('/home');
	},

	async load() {
		const targetLoaded = await waitFor('.activity-feed-wrap .feed-select .feed-type-toggle');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		const target = $('.activity-feed-wrap .feed-select .feed-type-toggle')!;

		(target.firstChild as HTMLElement).click();
		(target.lastChild as HTMLElement).style.display = 'none';
	},
});
