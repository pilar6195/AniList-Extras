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
	createSwitch,
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

		const settingsBody = createElement('div', {
			attributes: {
				class: 'alextras--settings-body',
			},
			appendTo: settingsContainer,
		});


		for (const module of anilistModules) {
			if (!module.togglable && !Object.keys(module.settingsPage ?? {}).length) continue;

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
				appendTo: settingsBody,
			});

			const moduleOptions = createElement('div', {
				attributes: {
					class: 'alextras--module-options',
				},
				appendTo: moduleContainer,
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

				createElement('div', {
					attributes: {
						class: 'alextras--module-setting',
					},
					children: [
						toggleModuleSwitch.element,
					],
					appendTo: moduleOptions,
				});
			}

			/* Other Settings */

			if (module.settingsPage && Object.keys(module.settingsPage).length) {
				const cogElement = createElement('div', {
					attributes: {
						class: 'alextras--module-cog',
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
					appendTo: moduleOptions,
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
						const ModuleSettings = new SettingsManager(module.id);
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
									width: '40%',
								});

								optionElement = input.element;

								input.on('change', (event) => {
									const value = (event.target as HTMLInputElement).value;
									ModuleSettings.set(key, Number.parseFloat(value));
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
									width: '40%',
								});

								optionElement = input.element;

								input.on('change', (event) => {
									const value = (event.target as HTMLInputElement).value;
									ModuleSettings.set(key, value);
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
								class: 'alextras--module-setting',
							},
							children: [optionElement],
							appendTo: modelBody,
						});
					}
				});
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
		removeElements('.alextras--settings, .alextras--module-model');
	},
});

addStyles(`
	.alextras--settings-description {
		color: rgb(var(--color-text-light));
	}

	.alextras--settings-body {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.alextras--module {
		display: flex;
		flex-direction: column;
		background: rgb(var(--color-background));
		border-radius: 5px;
		padding: 0.75em;
	}

	.alextras--module-title {
		margin: 0 0 0.5em 0;
	}

	.alextras--module-missing-title:after {
		content: '「 MISSING MODULE TITLE 」';
		color: red;
	}

	.alextras--module > .alextras--module-description {
		flex-grow: 1;
		min-height: 3em;
	}

	.alextras--module-description {
		color: rgb(var(--color-text-light));
		margin: 0 0 1em 0;
	}

	.alextras--module .alextras--switch {
		margin: 0;
		float: left;
	}

	.alextras--module-cog {
		cursor: pointer;
		float: right;
		color: rgb(var(--color-gray-600));
	}

	.alextras--module-model {
		position: fixed;
		display: flex;
		justify-content: center;
		align-items: center;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		z-index: 9000;
	}

	.alextras--module-model-container {
		display: flex;
		flex-direction: column;
		background: rgb(var(--color-foreground));
		padding: 1em;
		width: 100%;
		max-width: 600px;
		max-height: 80%;
		border-radius: 4px;
		box-shadow: 0 2px 33px rgba(0,0,0,.48);
		animation: in .25s ease-in-out;
		z-index: 9001;
	}

	.alextras--module-model .alextras--module-title {
		display: flex;
	}

	.alextras--module-model .alextras--module-title span {
		flex: 1;
	}

	.alextras--module-model .alextras--module-title .el-icon-close {
		cursor: pointer;
	}

	.alextras--module-model-body {
		overflow: auto;
		padding-right: 0.5em;
	}
`);
