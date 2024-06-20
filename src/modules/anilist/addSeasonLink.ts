import { $, waitFor, createElement, removeElements, isUI } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addSeasonLink',
	name: 'Seasonal Link',
	description: 'Add a link to the seasonal anime page in the browse dropdown in the navbar.',
	togglable: true,

	validate() {
		// Load on any page assuming we haven't already created the element.
		return !$('.alextras--seasonal-anime') && isUI.desktop;
	},

	validateUnload() {
		// Only unload if the the desktop UI is not active.
		return !isUI.desktop;
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

	// We only have this so we can remove the element when the module is disabled.
	unload() {
		removeElements('.alextras--seasonal-anime');
	},
});
