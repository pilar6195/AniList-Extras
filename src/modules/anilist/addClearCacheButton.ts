import Cache from '@/utils/Cache';
import { $, waitFor, createElement } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addClearCacheButton',

	validate() {
		// Load on any page assuming we haven't already created the element.
		return !$('.alextras--clear-cache');
	},

	async load() {
		const targetLoaded = await waitFor('.footer .links');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		const attrName = $('.footer .links a')!.attributes[0].name;

		createElement('a', {
			attributes: {
				[attrName]: '',
				class: 'alextras--clear-cache',
				title: 'Clear AniList Extras Cache. Use this if you encounter any caching issues.',
			},
			styles: {
				cursor: 'pointer',
			},
			textContent: 'Clear ALExtras Cache',
			events: {
				async click() {
					await Cache.dropDatabase();
					console.log('AniList Extras cache cleared.');
				},
			},
			appendTo: $('.footer .links > section')!,
		});
	},
});
