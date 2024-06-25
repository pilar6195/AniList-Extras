import { $, waitFor, createElement, addViewToggle } from '@/utils/Helpers';
import { registerModule, getModule, activeModules, ModuleTags } from '@/utils/ModuleLoader';

// This is a dummy module that is used to add the setting for the view toggles.
// We have to do this since this file consists of multiple modules and I don't
// want each module have it's own section in the settings page.
// This is a bit of a hack but it works.
registerModule.anilist({
	id: 'addViewToggles',
	name: 'View Toggles',
	description: 'Adds grid/list view toggles for characters and staff pages.',
	togglable: true,
	tags: [
		ModuleTags.Media,
		ModuleTags.Utiliy,
	],
	validate: () => false,
	load() {},
});

const viewSwitchModule = getModule.anilist('addViewToggles')!;

registerModule.anilist({
	id: 'addCharactersViewSwitch',

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+\/.+\/$/.test(currentPage.pathname)
			&& !viewSwitchModule.disabled;
	},

	async load() {
		const dependentModule = getModule.anilist('addMalCharacters');

		if (dependentModule && !dependentModule.disabled) {
			await waitFor(() => activeModules.has(dependentModule.id));
		}

		const targetLoaded = await waitFor('.characters .link');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		addViewToggle('.characters .link', '.characters .grid-wrap');
	},
});

registerModule.anilist({
	id: 'addCharactersViewSwitchCharPage',

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+\/.+\/characters$/.test(currentPage.pathname)
			&& !viewSwitchModule.disabled;
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
		return /^\/(anime|manga)\/\d+\/.+\/$/.test(currentPage.pathname)
			&& !viewSwitchModule.disabled;
	},

	async load() {
		const targetLoaded = await waitFor('.staff .link');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		addViewToggle('.staff .link', '.staff .grid-wrap');
	},
});

registerModule.anilist({
	id: 'addStaffViewSwitchStaffPage',

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+\/.+\/staff$/.test(currentPage.pathname)
			&& !viewSwitchModule.disabled;
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
