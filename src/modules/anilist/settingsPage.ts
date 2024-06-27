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
	addStyles,
} from '@/utils/Helpers';
import { registerModule, anilistModules, ModuleStates, ModuleEmitter, ModuleEvents } from '@/utils/ModuleLoader';
import settingsStyles from '@/styles/settingsPage.scss';

addStyles(settingsStyles);

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

		const settingsBody = createElement('div', {
			attributes: {
				class: 'alextras--settings-body',
			},
			appendTo: settingsContainer,
		});


		for (const module of anilistModules) {
			const hasSettings = Object.keys(module.settingsPage ?? {}).length;
			if (!module.togglable && !hasSettings) continue;

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

			if (module.togglable) {
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
				// https://github.com/FortAwesome/Font-Awesome/blob/master/LICENSE.txt
				innerHTML: `
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="icon svg-inline--fa fa-minus fa-w-16 fa-fw">
						<path fill="currentColor" d="M416 208H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33
						32-32v-32c0-17.67-14.33-32-32-32z"></path>
					</svg>
				`,
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

				if (module.togglable && (module.disabled !== !defaultModuleState)) {
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
					// https://github.com/FortAwesome/Font-Awesome/blob/master/LICENSE.txt
					innerHTML: `
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon svg-inline--fa fa-question-circle fa-w-16 fa-fw">
							<path fill="currentColor" d="M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248
							111.083 248 248zM262.655 90c-54.497 0-89.255 22.957-116.549 63.758-3.536 5.286-2.353 12.415 2.715 16.258l34.699
							26.31c5.205 3.947 12.621 3.008 16.665-2.122 17.864-22.658 30.113-35.797 57.303-35.797 20.429 0 45.698 13.148 45.698
							32.958 0 14.976-12.363 22.667-32.534 33.976C247.128 238.528 216 254.941 216 296v4c0 6.627 5.373 12 12 12h56c6.627 0
							12-5.373 12-12v-1.333c0-28.462 83.186-29.647 83.186-106.667 0-58.002-60.165-102-116.531-102zM256 338c-25.365 0-46
							20.635-46 46 0 25.364 20.635 46 46 46s46-20.636 46-46c0-25.365-20.635-46-46-46z"></path>
						</svg>
					`,
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
					// https://github.com/FortAwesome/Font-Awesome/blob/master/LICENSE.txt
					innerHTML: `
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon svg-inline--fa fa-cog fa-w-16 fa-fw">
							<path fill="currentColor" d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8
							110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7
							85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30
							67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1
							9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1
							0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"></path>
						</svg>
					`,
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
