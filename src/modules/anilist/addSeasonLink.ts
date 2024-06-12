import { $, waitFor, createElement } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addSeasonLink',

	validate() {
		// Load on any page assuming we haven't already created the element.
		return !$('.alextras--seasonal-anime');
	},

	async load() {
		const targetLoaded = await waitFor('.browse-wrap .dropdown .primary-links .secondary-links');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		const attrName = $('.secondary-links > a')!.attributes[0].name;

		createElement('a', {
			attributes: {
				[attrName]: '',
				class: 'alextras--seasonal-anime',
				href: '/search/anime/this-season',
			},
			styles: {
				'margin-top': '5px',
			},
			textContent: 'Seasonal',
			appendTo: $('.secondary-links')!,
		});
	},
});
