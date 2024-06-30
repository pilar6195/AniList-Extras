/* eslint-disable no-alert, @typescript-eslint/no-dynamic-delete */
import Storage from '@/utils/Storage';
import Cache from '@/utils/Cache';
import SettingsManager, { purgeUnusedSettings } from '@/utils/Settings';
import {
	$,
	waitFor,
	createElement,
	removeElements,
	createCheckbox,
	createInput,
	createDropdown,
	createSwitch,
} from '@/utils/Helpers';
import { registerModule, anilistModules, ModuleStates, ModuleEmitter, ModuleEvents } from '@/utils/ModuleLoader';
import SvgIcons from '@/utils/SvgIcons';

import settingsStyles from '@/styles/settingsPage.scss';

registerModule.anilist({
	id: 'settingsPage',
	styles: settingsStyles,

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

		const settingsBody = createElement('div', {
			attributes: {
				class: 'alextras--settings-body',
			},
			appendTo: settingsContainer,
		});


		for (const module of anilistModules) {
			const hasSettings = Object.keys(module.settingsPage ?? {}).length;
			if (!module.toggleable && !hasSettings) continue;

			const ModuleSettings = new SettingsManager(module.id);

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
					createElement('div', {
						attributes: {
							class: 'alextras--module-tag-group',
						},
						children: module.tags?.map(tag => {
							return createElement('span', {
								attributes: {
									class: 'alextras--module-tag',
								},
								textContent: tag,
							});
						}),
					}),
					createElement('h5', {
						attributes: {
							class: 'alextras--module-description',
						},
						textContent: module.description,
					}),
				],
				appendTo: settingsBody,
			});

			const optionsContainer = createElement('div', {
				attributes: {
					class: 'alextras--module-options',
				},
				appendTo: moduleContainer,
			});

			const optionsLeftContainer = createElement('div', {
				attributes: {
					class: 'alextras--module-options-left',
				},
				appendTo: optionsContainer,
			});

			const optionsRightContainer = createElement('div', {
				attributes: {
					class: 'alextras--module-options-right',
				},
				appendTo: optionsContainer,
			});

			/* Module Toggle */

			if (module.toggleable) {
				const toggleModuleSwitch = createSwitch({
					enabled: !module.disabled,
				});

				toggleModuleSwitch.on('change', async (event) => {
					const checked = (event.target as HTMLInputElement).checked;

					if (checked) {
						module.enable();
					} else {
						void module.disable();
					}
				});

				// We watch the moduleStates to update the switch if the module's state is updated/reset.
				const unwatch = Storage.watch('moduleStates', (moduleStates) => {
					const moduleState = moduleStates?.[module.id] ?? !(module.disabledDefault ?? false);
					toggleModuleSwitch.enabled = moduleState;
				});

				// We remove the watch when the user navigates to a different page.
				ModuleEmitter.once(ModuleEvents.Navigate, () => unwatch());

				createElement('div', {
					attributes: {
						class: 'alextras--module-setting',
					},
					children: [
						toggleModuleSwitch.element,
					],
					appendTo: optionsLeftContainer,
				});
			}

			/* Reset Settings */

			const resetSettingsElement = createElement('div', {
				attributes: {
					class: 'alextras--module-action-icon',
				},
				innerHTML: SvgIcons.minus,
				tooltip: 'Reset Module Settings.',
				events: {
					click() {
						const confirmResponse = window.confirm('Are you sure you want to reset this module settings? OK to confirm, Cancel to cancel.');
						if (!confirmResponse) return;
						ModuleSettings.clear();
						ModuleStates.remove(module.id);
					},
				},
				appendTo: optionsRightContainer,
			});

			const hasDefaultSettings = () => {
				let hasDefault = true;

				const defaultModuleState = !(module.disabledDefault ?? false);

				if (module.toggleable && (module.disabled !== !defaultModuleState)) {
					hasDefault = false;
				}

				for (const [key, setting] of Object.entries(module.settingsPage ?? {})) {
					const savedSetting = ModuleSettings.get(key);

					if (savedSetting !== setting.default) {
						hasDefault = false;
						break;
					}
				}

				return hasDefault;
			};

			if (hasDefaultSettings()) {
				resetSettingsElement.style.display = 'none';
			}

			const unwatchModuleStates = Storage.watch('moduleStates', () => {
				if (hasDefaultSettings()) {
					resetSettingsElement.style.display = 'none';
				} else {
					resetSettingsElement.style.display = '';
				}
			});

			const unwatchModuleSettings = Storage.watch('settings', (settings) => {
				if (!hasSettings || !settings?.[module.id]) return;
				if (hasDefaultSettings()) {
					resetSettingsElement.style.display = 'none';
				} else {
					resetSettingsElement.style.display = '';
				}
			});

			// We remove the watch when the user navigates to a different page.
			ModuleEmitter.once(ModuleEvents.Navigate, () => {
				unwatchModuleStates();
				unwatchModuleSettings();
			});

			/* Notice */

			if (module.notice) {
				createElement('div', {
					attributes: {
						class: 'alextras--module-action-icon',
					},
					innerHTML: SvgIcons.questionCircle,
					tooltip: module.notice,
					appendTo: optionsRightContainer,
				});
			}

			/* Other Settings */

			if (hasSettings) {
				const cogElement = createElement('div', {
					attributes: {
						class: 'alextras--module-action-icon',
					},
					innerHTML: SvgIcons.cog,
					tooltip: 'Module Settings',
					appendTo: optionsRightContainer,
				});

				let modelOpen = false;

				cogElement.addEventListener('click', () => {
					if (modelOpen) return;
					modelOpen = true;
					document.body.style.overflow = 'hidden';

					// eslint-disable-next-line prefer-const
					let model: HTMLElement;

					const closeModel = () => {
						model.remove();
						modelOpen = false;
						document.body.style.overflow = '';
					};

					model = createElement('div', {
						attributes: {
							class: 'alextras--module-model',
							role: 'dialog',
						},
						events: {
							click() {
								closeModel();
							},
						},
						appendTo: document.body,
					});

					const modelContainer = createElement('div', {
						attributes: {
							class: 'alextras--module-model-container',
						},
						children: [
							createElement('h3', {
								attributes: {
									class: 'alextras--module-title',
								},
								children: [
									createElement('span', {
										textContent: module.name ?? module.id,
									}),
									createElement('i', {
										attributes: {
											class: 'el-icon el-icon-close',
										},
										events: {
											click() {
												closeModel();
											},
										},
									}),
								],
							}),

							createElement('p', {
								attributes: {
									class: 'alextras--module-description',
								},
								textContent: module.description,
							}),
						],
						events: {
							click(event) {
								event.stopPropagation();
							},
						},
						appendTo: model,
					});

					const modelBody = createElement('div', {
						attributes: {
							class: 'alextras--module-model-body',
						},
						appendTo: modelContainer,
					});

					/* Other Settings */

					for (const [key, setting] of Object.entries(module.settingsPage!)) {
						const savedSetting = ModuleSettings.get(key);

						let optionElement: HTMLElement;

						switch (setting.type) {
							case 'checkbox': {
								const checkbox = createCheckbox({
									label: setting.label,
									description: setting.description,
									checked: savedSetting,
									appendTo: modelBody,
								});

								optionElement = checkbox.element;

								checkbox.on('change', (event) => {
									const checked = (event.target as HTMLInputElement).checked;
									ModuleSettings.set(key, checked);
								});

								break;
							}

							case 'switch': {
								const switchToggle = createSwitch({
									label: setting.label,
									description: setting.description,
									enabled: savedSetting,
									appendTo: modelBody,
								});

								optionElement = switchToggle.element;

								switchToggle.on('change', (event) => {
									const checked = (event.target as HTMLInputElement).checked;
									ModuleSettings.set(key, checked);
								});

								break;
							}

							case 'number': {
								const input = createInput({
									type: setting.type,
									label: setting.label,
									description: setting.description,
									value: savedSetting,
									min: setting.min,
									max: setting.max,
									step: setting.step,
									validate: setting.validate?.bind(module),
									width: '10em',
								});

								optionElement = input.element;

								input.on('change', (event) => {
									const value = (event.target as HTMLInputElement).value;
									if (input.isValidInput) {
										if (value === '') {
											ModuleSettings.remove(key);
										} else {
											ModuleSettings.set(key, Number.parseFloat(value));
										}
									}
								});

								break;
							}

							case 'color': {
								const input = createInput({
									type: setting.type,
									label: setting.label,
									description: setting.description,
									value: savedSetting,
									validate: setting.validate?.bind(module),
								});

								optionElement = input.element;

								input.on('change', (event) => {
									const value = (event.target as HTMLInputElement).value;
									if (input.isValidInput) {
										if (value === '') {
											ModuleSettings.remove(key);
										} else {
											ModuleSettings.set(key, value);
										}
									}
								});

								break;
							}

							case 'password':
							case 'text': {
								const input = createInput({
									type: setting.type,
									label: setting.label,
									description: setting.description,
									value: savedSetting,
									minLength: setting.minLength,
									maxLength: setting.maxLength,
									validate: setting.validate?.bind(module),
									width: '15em',
								});

								optionElement = input.element;

								input.on('change', (event) => {
									const value = (event.target as HTMLInputElement).value;
									if (input.isValidInput) {
										if (value === '') {
											ModuleSettings.remove(key);
										} else {
											ModuleSettings.set(key, value);
										}
									}
								});

								break;
							}

							case 'textarea': {
								const textarea = createInput({
									type: 'textarea',
									label: setting.label,
									description: setting.description,
									value: savedSetting,
									minLength: setting.minLength,
									maxLength: setting.maxLength,
									validate: setting.validate?.bind(module),
									height: '100px',
								});

								optionElement = textarea.element;

								textarea.on('change', (event) => {
									const value = (event.target as HTMLTextAreaElement).value;
									if (textarea.isValidInput) {
										if (value === '') {
											ModuleSettings.remove(key);
										} else {
											ModuleSettings.set(key, value);
										}
									}
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
								class: 'alextras--module-setting',
							},
							children: [optionElement],
							appendTo: modelBody,
						});
					}
				});
			}
		}

		/* Backup and Restore Settings */

		const restoreSettingsInput = createElement('input', {
			attributes: {
				type: 'file',
				accept: '.json',
			},
			events: {
				change(event) {
					const file = (event.target as HTMLInputElement).files?.[0];

					if (!file) return;

					if (file.type !== 'application/json') {
						window.alert('Invalid file type. Please select a valid JSON file.');
						return;
					}

					const fileReader = new FileReader();

					fileReader.onload = event => {
						const result = event.target?.result;
						try {
							const fileContents = JSON.parse(result as string);

							if (!fileContents.alextrasMeta) {
								window.alert('Invalid JSON file. Please select a valid JSON file.');
								return;
							}

							Storage.set('settings', fileContents.settings ?? {});
							Storage.set('moduleStates', fileContents.moduleStates ?? {});
							window.alert('AniList Extras settings have been restored. Page will refresh.');
							location.reload();
						} catch {
							window.alert('Invalid JSON file. Please select a valid JSON file.');
						}
					};

					fileReader.readAsText(file);
				},
			},
		});

		createElement('section', {
			styles: {
				textAlign: 'center',
			},
			children: [
				createElement('div', {
					attributes: {
						class: 'button',
					},
					textContent: 'Backup Settings',
					events: {
						async click() {
							purgeUnusedSettings();

							const storage = Storage.getAll();

							// Remove API token from backup.
							if (storage.apiToken) {
								delete storage.apiToken;
							}

							storage.alextrasMeta = {
								version: ALEXTRAS_VERSION,
								createdAt: new Date().toISOString(),
							};

							const settingsBackup = JSON.stringify(storage, null, '\t');

							const settingsBlob = new Blob([settingsBackup], {
								type: 'application/json',
							});

							const aElement = createElement('a', {
								attributes: {
									download: `anilist-extras-settings-${new Date().toISOString()}.json`,
									href: URL.createObjectURL(settingsBlob),
								},
							});

							aElement.click();
						},
					},
				}),
				createElement('div', {
					attributes: {
						class: 'button',
					},
					styles: {
						background: 'rgb(var(--color-background-600))',
					},
					textContent: 'Restore Settings',
					tooltip: 'Restoring settings will overwrite your current settings.',
					events: {
						click() {
							restoreSettingsInput.click();
						},
					},
				}),
				createElement('div', {
					attributes: {
						class: 'button danger',
					},
					textContent: 'Reset All Settings',
					tooltip: 'Reset all AniList Extras settings. Page will refresh.',
					events: {
						async click() {
							const confirmResponse = window.confirm('Are you sure you want to reset all AniList Extras settings? OK to confirm, Cancel to cancel.');
							if (!confirmResponse) return;
							Storage.clear();
						},
					},
				}),
				createElement('div', {
					attributes: {
						class: 'button danger',
					},
					textContent: 'Clear Anilist Extras Cache',
					tooltip: 'Clear AniList Extras Cache. Use this if you encounter any caching issues.',
					events: {
						async click() {
							await Cache.dropDatabase();
							window.alert('AniList Extras cache has been cleared.');
						},
					},
				}),
			],
			appendTo: settingsContainer,
		});

		/* Anilist Token */

		const accessToken = location.hash.split('&')[0].replaceAll('#access_token=', '');

		if (accessToken) {
			Storage.set('apiToken', accessToken);
			window.history.replaceState(null, '', location.pathname);
		}

		const tokenContainer = createElement('section', {
			children: [
				createElement('h3', {
					textContent: 'Authenticate with AniList',
				}),
				createElement('p', {
					attributes: {
						class: 'alextras--settings-description',
					},
					textContent: `
						Some modules use the AniList API to fetch various types of data.
						In some cases, they may require you to authenticate with AniList to work properly.
					`,
				}),
				createElement('p', {
					attributes: {
						class: 'alextras--settings-description',
					},
					textContent: `
						Click the Login button below to authenticate with AniList.
						You will be redirected to an authorization page where you will be asked to authorize AniList Extras.
						After you authorize, you will be redirected back to this page.

					`,
				}),
				createElement('p', {
					attributes: {
						class: 'alextras--settings-description',
					},
					styles: {
						marginBottom: '0',
					},
					textContent: `
						If you are already authenticated, you can log out by clicking the Logout button below.
						You can also revoke access by clicking "Revoke App" at the top of this page.
					`,
				}),
			],
			appendTo: settingsContainer,
		});

		const loginElement = createElement('a', {
			attributes: {
				class: 'button',
				href: 'https://anilist.co/api/v2/oauth/authorize?client_id=19391&response_type=token',
			},
			textContent: 'Login to AniList',
			appendTo: tokenContainer,
		});

		const logoutElement = createElement('div', {
			attributes: {
				class: 'button danger',
			},
			textContent: 'Logout from AniList',
			events: {
				click() {
					Storage.remove('apiToken');
					loginElement.style.display = '';
					logoutElement.style.display = 'none';
				},
			},
			appendTo: tokenContainer,
		});

		if (Storage.get('apiToken')) {
			loginElement.style.display = 'none';
		} else {
			logoutElement.style.display = 'none';
		}

		/* Footer Content */

		createElement('section', {
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
							textContent: `v${ALEXTRAS_VERSION}` + (ALEXTRAS_DEV ? ' (Dev Mode)' : ''),
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
							textContent: 'pilar6195/AniList-Extras',
						}),
					],
				}),
			],
			appendTo: settingsContainer,
		});
	},

	unload() {
		removeElements('.alextras--settings, .alextras--module-model');
	},
});
