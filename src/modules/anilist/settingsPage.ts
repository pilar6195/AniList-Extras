import Storage from '@/utils/Storage';
import Cache from '@/utils/Cache';
import SettingsManager from '@/utils/Settings';
import {
	$,
	waitFor,
	createElement,
	removeElements,
	createCheckbox,
	createInput,
	createDropdown,
	addStyles,
} from '@/utils/Helpers';
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
					attributes: {
						class: 'alextras--settings-title',
					},
					textContent: 'AniList Extras Settings',
				}),
				createElement('p', {
					attributes: {
						class: 'alextras--settings-description',
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

					let optionElement: HTMLElement;

					switch (setting.type) {
						case 'checkbox': {
							const checkbox = createCheckbox({
								label: setting.label,
								description: setting.description,
								checked: savedSetting,
								appendTo: moduleBody,
							});

							optionElement = checkbox.element;

							checkbox.on('change', (event) => {
								const checked = (event.target as HTMLInputElement).checked;
								ModuleSettings.set(key, checked);
							});

							break;
						}

						case 'number':
						case 'password':
						case 'text': {
							const input = createInput({
								type: setting.type,
								label: setting.label,
								description: setting.description,
								value: savedSetting,
								width: setting.type === 'number' ? '20%' : '40%',
							});

							optionElement = input.element;

							input.on('change', (event) => {
								const value = (event.target as HTMLInputElement).value;
								ModuleSettings.set(key, setting.type === 'number' ? Number.parseFloat(value) : value);
							});

							break;
						}

						case 'textarea': {
							const textarea = createInput({
								type: 'textarea',
								label: setting.label,
								description: setting.description,
								value: savedSetting,
								height: '100px',
							});

							optionElement = textarea.element;

							textarea.on('change', (event) => {
								const value = (event.target as HTMLTextAreaElement).value;
								ModuleSettings.set(key, value);
							});

							break;
						}

						case 'select': {
							const select = createDropdown({
								label: setting.label,
								description: setting.description,
								options: setting.options,
								selected: savedSetting,
							});

							select.on('change', (event) => {
								const value = (event.target as HTMLSelectElement).value;
								ModuleSettings.set(key, value);
							});

							optionElement = select.element;

							break;
						}

						default: {
							// This should never happen. If it does, it's a developer error.
							optionElement = createElement('div');
						}
					}

					createElement('div', {
						attributes: {
							class: 'alextras--module-settings',
						},
						children: [optionElement],
						appendTo: moduleBody,
					});
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

		createElement('div', {
			children: [
				createElement('h4', {
					textContent: 'AniList Extras Version: ',
					children: [
						createElement('a', {
							attributes: {
								href: `https://github.com/pilar6195/AniList-Extras/releases/tag/v${ALEXTRAS_VERSION}`,
								target: '_blank',
								rel: 'noopener noreferrer',
							},
							styles: {
								color: 'rgb(var(--color-blue))',
							},
							textContent: `v${ALEXTRAS_VERSION}`,
						}),
					],
				}),
				createElement('h4', {
					textContent: 'Developed by: ',
					children: [
						createElement('a', {
							attributes: {
								href: 'https://github.com/pilar6195',
								target: '_blank',
								rel: 'noopener noreferrer',
							},
							styles: {
								color: 'rgb(var(--color-blue))',
							},
							textContent: 'pilar6195',
						}),
					],
				}),
				createElement('h4', {
					textContent: 'Github: ',
					children: [
						createElement('a', {
							attributes: {
								href: 'https://github.com/pilar6195/AniList-Extras',
								target: '_blank',
								rel: 'noopener noreferrer',
							},
							styles: {
								color: 'rgb(var(--color-blue))',
							},
							textContent: 'https://github.com/pilar6195/AniList-Extras',
						}),
					],
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
	.alextras--settings-description {
		color: rgb(var(--color-text-light));
	}

	.alextras--module-title {
		margin: 0 0 0.5em 0;
	}

	.alextras--module-missing-title:after {
		content: '「 MISSING MODULE TITLE 」';
		color: red;
	}

	.alextras--module-description {
		color: rgb(var(--color-text-light));
		margin: 0 0 1em 0;
	}
`);
