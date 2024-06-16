import { $, waitFor, createElement, addViewToggle } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addCharactersViewSwitch',

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+\/.+\/characters$/.test(currentPage.pathname);
	},

	async load() {
		const targetLoaded = await waitFor('.media-characters .grid-wrap');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		const header = createElement('h2', {
			attributes: {
				class: 'link',
			},
			styles: {
				height: '16px',
				cursor: 'default',
			},
		});

		$('.media-characters .grid-wrap')!.before(header);

		addViewToggle('.media-characters .link', '.media-characters .grid-wrap');
	},
});

registerModule.anilist({
	id: 'addStaffViewSwitch',

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+\/.+\/$/.test(currentPage.pathname);
	},

	async load() {
		const targetLoaded = await waitFor('.staff .link');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		addViewToggle('.staff .link', '.staff .grid-wrap');
	},
});

registerModule.anilist({
	id: 'addStaffViewSwitch2',

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+\/.+\/staff$/.test(currentPage.pathname);
	},

	async load() {
		const targetLoaded = await waitFor('.media-staff .grid-wrap');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		const header = createElement('h2', {
			attributes: {
				class: 'link',
			},
			styles: {
				height: '16px',
				cursor: 'default',
			},
		});

		$('.media-staff .grid-wrap')!.before(header);

		addViewToggle('.media-staff .link', '.media-staff .grid-wrap');
	},
});
