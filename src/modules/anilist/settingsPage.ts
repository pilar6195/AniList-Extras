import Storage from '@/utils/Storage';
import Cache from '@/utils/Cache';
import SettingsManager from '@/utils/Settings';
import { $, waitFor, createElement, removeElements, createCheckbox, createInput, addStyles } from '@/utils/Helpers';
import { registerModule, anilistModules } from '@/utils/ModuleLoader';

// TODO: Fix styles for inputs. A lot of them aren't spaced properly.

registerModule.anilist({
	id: 'settingsPage',

	validate({ currentPage }) {
		return /\/settings\/apps/i.test(currentPage.pathname);
	},

	async load() {
		const targetLoaded = await waitFor('.settings .content .apps');

		if (!targetLoaded) return;

		/* Create Settings Container */

		const settingsContainer = createElement('div', {
			attributes: {
				class: 'alextras--settings',
			},
			children: [
				createElement('hr'),
				createElement('h3', {
					textContent: 'AniList Extras Settings',
				}),
				createElement('p', {
					styles: {
						color: 'rgb(var(--color-text-light))',
					},
					textContent: 'Some settings may require a page refresh to take effect.',
				}),
			],
			appendTo: $('.settings .content')!,
		});

		const modulesToDisplay = anilistModules.filter(m => {
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			return m.togglable || Object.keys(m.settingsPage ?? {}).length;
		});

		for (const module of modulesToDisplay) {
			const moduleContainer = createElement('div', {
				attributes: {
					class: 'alextras--module',
				},
				children: [
					createElement('h4', {
						attributes: {
							class: 'alextras--module-title' + (module.name ? '' : ' alextras--module-missing-title'),
						},
						textContent: module.name ?? module.id,
					}),
					createElement('h5', {
						attributes: {
							class: 'alextras--module-description',
						},
						styles: {
							color: 'rgb(var(--color-text-light))',
						},
						textContent: module.description,
					}),
				],
				appendTo: settingsContainer,
			});

			const moduleBody = createElement('div', {
				attributes: {
					class: 'alextras--module-body',
				},
				appendTo: moduleContainer,
			});

			/* Module Toggle */

			if (module.togglable) {
				const toggleModuleCheckbox = createCheckbox({
					label: 'Enable Module',
					checked: !module.disabled,
				});

				toggleModuleCheckbox.on('change', async (event) => {
					const checked = (event.target as HTMLInputElement).checked;

					if (checked) {
						module.enable();
					} else {
						void module.disable();
					}
				});

				createElement('div', {
					attributes: {
						class: 'alextras--module-settings',
					},
					children: [
						toggleModuleCheckbox.element,
					],
					appendTo: moduleBody,
				});
			}

			/* Other Settings */

			if (module.settingsPage) {
				for (const [key, setting] of Object.entries(module.settingsPage)) {
					const ModuleSettings = new SettingsManager(module.id);
					const savedSetting = ModuleSettings.get(key);

					switch (setting.type) {
						case 'checkbox': {
							const checkbox = createCheckbox({
								label: setting.label,
								checked: savedSetting,
								appendTo: moduleBody,
							});

							checkbox.on('change', (event) => {
								const checked = (event.target as HTMLInputElement).checked;
								ModuleSettings.set(key, checked);
							});

							createElement('div', {
								attributes: {
									class: 'alextras--module-settings',
								},
								children: [
									checkbox.element,
								],
								appendTo: moduleBody,
							});

							continue;
						}

						case 'select': {
							continue;
						}

						case 'number': {
							const input = createInput({
								type: 'number',
								label: setting.label,
								value: savedSetting,
							});

							input.element.style.width = '20%';

							input.on('change', (event) => {
								const value = (event.target as HTMLInputElement).value;
								ModuleSettings.set(key, Number.parseFloat(value));
							});

							createElement('div', {
								attributes: {
									class: 'alextras--module-settings',
								},
								children: [
									input.element,
								],
								appendTo: moduleBody,
							});

							continue;
						}

						case 'text': {
							const input = createInput({
								type: 'text',
								label: setting.label,
								value: savedSetting,
							});

							input.on('change', (event) => {
								const value = (event.target as HTMLInputElement).value;
								ModuleSettings.set(key, value);
							});

							input.element.style.width = '40%';

							createElement('div', {
								attributes: {
									class: 'alextras--module-settings',
								},
								children: [
									input.element,
								],
								appendTo: moduleBody,
							});

							continue;
						}

						case 'textarea': {
							continue;
						}
					}
				}
			}
		}

		createElement('div', {
			children: [
				createElement('div', {
					attributes: {
						class: 'button danger',
					},
					textContent: 'Reset All Settings',
					events: {
						async click() {
							Storage.clear();
							// eslint-disable-next-line no-alert
							alert('AniList Extras settings have been reset. Page will refresh.');
							location.reload();
						},
					},
				}),
				createElement('div', {
					attributes: {
						class: 'button danger',
						title: 'Clear AniList Extras Cache. Use this if you encounter any caching issues.',
					},
					textContent: 'Clear Anilist Extras Cache',
					events: {
						async click() {
							await Cache.dropDatabase();
							// eslint-disable-next-line no-alert
							alert('AniList Extras cache has been cleared.');
						},
					},
				}),
			],
			appendTo: settingsContainer,
		});
	},

	unload() {
		removeElements('.alextras--settings');
	},
});

addStyles(`
	.alextras--module-title {
		margin-top: 0.5em;
		margin-bottom: 0.5em;
	}
	.alextras--module-missing-title:after {
		content: '「 MISSING MODULE TITLE 」';
		color: red;
	}
	.alextras--module-description {
		margin-top: 0.5em;
	}
	.alextras--module-body {
		margin-top: 1em;
		margin-bottom: 1em;
	}
`);
