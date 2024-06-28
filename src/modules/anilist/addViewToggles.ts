import { $, $$, waitFor, createElement } from '@/utils/Helpers';
import { registerModule, getModule, activeModules, ModuleTags } from '@/utils/ModuleLoader';
import SettingsManager from '@/utils/Settings';

import moduleStyles from '@/styles/addViewToggles.scss';

// This is a dummy module that is used to add the setting for the view toggles.
// We have to do this since this file consists of multiple modules and I don't
// want each module have it's own section in the settings page.
// This is a bit of a hack but it works.
registerModule.anilist({
	id: 'addViewToggles',
	name: 'View Toggles',
	description: 'Adds grid/list view toggles for characters and staff pages.',
	tags: [
		ModuleTags.Media,
		ModuleTags.Utiliy,
	],
	toggleable: true,
	styles: moduleStyles,
	validate: () => false,
	load() {},
});

const viewSwitchModule = getModule.anilist('addViewToggles')!;
const ModuleSettings = new SettingsManager('addViewToggles');

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

/**
 * Add a view toggle to the provided containers and targets.
 */
function addViewToggle(containers: string, targets: string) {
	const containerElements = $$(containers).filter(c => !c.querySelector('.alextras--view-switch-toggle'));
	const targetElements = $$(targets).filter(t => !t.classList.contains('alextras--view-switch-target'));

	if (!containerElements.length || !targetElements.length) return;

	for (const container of containerElements) {
		const viewSwitch = createElement('div', {
			attributes: {
				class: 'alextras--view-switch-toggle',
			},
			// https://github.com/FortAwesome/Font-Awesome/blob/master/LICENSE.txt
			innerHTML: `
				<span class="alextras--switch-grid">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon svg-inline--fa fa-th-large fa-w-16">
						<path fill="currentColor" d="M296 32h192c13.255 0 24 10.745 24 24v160c0 13.255-10.745 24-24 24H296c-13.255
						0-24-10.745-24-24V56c0-13.255 10.745-24 24-24zm-80 0H24C10.745 32 0 42.745 0 56v160c0 13.255 10.745 24 24
						24h192c13.255 0 24-10.745 24-24V56c0-13.255-10.745-24-24-24zM0 296v160c0 13.255 10.745 24 24 24h192c13.255
						0 24-10.745 24-24V296c0-13.255-10.745-24-24-24H24c-13.255 0-24 10.745-24 24zm296 184h192c13.255 0 24-10.745
						24-24V296c0-13.255-10.745-24-24-24H296c-13.255 0-24 10.745-24 24v160c0 13.255 10.745 24 24 24z" />
					</svg>
				</span>

				<span class="alextras--switch-list">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon svg-inline--fa fa-th-list fa-w-16">
						<path data-v-75ee63fe="" fill="currentColor" d="M149.333 216v80c0 13.255-10.745 24-24 24H24c-13.255
						0-24-10.745-24-24v-80c0-13.255 10.745-24 24-24h101.333c13.255 0 24 10.745 24 24zM0 376v80c0 13.255
						10.745 24 24 24h101.333c13.255 0 24-10.745 24-24v-80c0-13.255-10.745-24-24-24H24c-13.255 0-24 10.745-24
						24zM125.333 32H24C10.745 32 0 42.745 0 56v80c0 13.255 10.745 24 24 24h101.333c13.255 0 24-10.745
						24-24V56c0-13.255-10.745-24-24-24zm80 448H488c13.255 0 24-10.745 24-24v-80c0-13.255-10.745-24-24-24H205.333c-13.255
						0-24 10.745-24 24v80c0 13.255 10.745 24 24 24zm-24-424v80c0 13.255 10.745 24 24 24H488c13.255 0 24-10.745
						24-24V56c0-13.255-10.745-24-24-24H205.333c-13.255 0-24 10.745-24 24zm24 264H488c13.255 0 24-10.745
						24-24v-80c0-13.255-10.745-24-24-24H205.333c-13.255 0-24 10.745-24 24v80c0 13.255 10.745 24 24 24z" />
					</svg>
				</span>
			`,
			appendTo: container,
		});

		viewSwitch.querySelector('.alextras--switch-grid')!.addEventListener('click', (event) => {
			for (const el of $$('.alextras--view-switch-toggle .alextras--active')) {
				el.classList.remove('alextras--active');
			}

			for (const el of $$('.alextras--view-switch-toggle .alextras--switch-grid')) {
				el.classList.add('alextras--active');
			}

			for (const el of $$('.alextras--view-switch-target')) {
				el.style.gridTemplateColumns = '';
			}

			ModuleSettings.set('view', 'grid');
			event.stopPropagation();
		});

		viewSwitch.querySelector('.alextras--switch-list')!.addEventListener('click', (event) => {
			for (const el of $$('.alextras--view-switch-toggle .alextras--active')) {
				el.classList.remove('alextras--active');
			}

			for (const el of $$('.alextras--view-switch-toggle .alextras--switch-list')) {
				el.classList.add('alextras--active');
			}

			for (const el of $$('.alextras--view-switch-target')) {
				el.style.gridTemplateColumns = '1fr';
			}

			ModuleSettings.set('view', 'list');
			event.stopPropagation();
		});
	}

	for (const target of targetElements) {
		target.classList.add('alextras--view-switch-target');
	}

	switch (ModuleSettings.get('view')) {
		case 'list': {
			for (const s of $$('.alextras--view-switch-toggle .alextras--switch-list')) {
				s.classList.add('alextras--active');
			}

			for (const t of $$('.alextras--view-switch-target')) {
				t.style.gridTemplateColumns = '1fr';
			}

			break;
		}

		default: {
			for (const s of $$('.alextras--view-switch-toggle .alextras--switch-grid')) {
				s.classList.add('alextras--active');
			}
		}
	}
}
