/* eslint-disable no-param-reassign */
import Cache from './Cache';
import Storage from './Storage';

declare global {
	namespace Tampermonkey {
		// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
		interface Response<TContext, T = object> {
			json: any
		}
	}
}

export const ONE_MINUTE = 60 * 1000;
export const ONE_HOUR = ONE_MINUTE * 60;
export const ONE_DAY = ONE_HOUR * 24;
export const ONE_WEEK = ONE_DAY * 7;

export const $ = (selector: string): HTMLElement | null => document.querySelector(selector);
export const $$ = (selector: string): HTMLElement[] => Array.from(document.querySelectorAll(selector));

/**
 * Creates a new element using the provided parameters.
 */
export const createElement = (
	tag: string,
	options: {
		attributes?: Record<string, string>;
		styles?: Record<string, string>;
		textContent?: string;
		innerHTML?: string;
		events?: Record<string, EventListener>;
		children?: Element[] | HTMLElement[];
		appendTo?: Element | HTMLElement;
	} = {},
): HTMLElement => {
	if (!tag) {
		throw new Error('Missing tag.');
	}

	if (typeof options !== 'object' || options === null || Array.isArray(options)) {
		throw new TypeError('Options is not an object.');
	}

	const { attributes, styles, textContent, innerHTML, events, children, appendTo } = options;

	const element = document.createElement(tag);

	if (typeof attributes === 'object' && attributes !== null) {
		for (const [attribute, value] of Object.entries(attributes)) {
			element.setAttribute(attribute, value);
		}
	}

	if (typeof styles === 'object' && styles !== null) {
		for (const [propertyName, value] of Object.entries(styles)) {
			element.style.setProperty(propertyName, value);
			// @ts-expect-error - Ignore the error for now.
			element.style[propertyName] = value;
		}
	}

	if (typeof events === 'object' && events !== null) {
		for (const [event, func] of Object.entries(events)) {
			element.addEventListener(event, func);
		}
	}

	if (textContent) {
		element.textContent = textContent;
	}

	if (innerHTML) {
		element.innerHTML = innerHTML;
	}

	if (Array.isArray(children)) {
		element.append(...children);
	}

	if (appendTo instanceof HTMLElement) {
		appendTo.append(element);
	}

	return element;
};

/**
 * Remove elements using the provided selector.
 */
export const removeElements = (selector: string) => {
	for (const element of $$(selector)) {
		element.remove();
	}
};

/**
 * Create a style element using the provided css and append it to the document.
 */
export const addStyles = (styles: string, classNames: string = 'alextras--styles') => {
	const style = createElement('style', {
		attributes: {
			type: 'text/css',
			class: classNames,
		},
		textContent: styles,
	});
	(document.head || document.body || document.documentElement || document).append(style);
};

/**
 * Observe the provided node for mutations.
 */
export const observe = (
	node: Document | HTMLElement | Node,
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	cb: (mutations: MutationRecord[], ob: MutationObserver) => Promise<boolean | void> | boolean | void,
	options?: MutationObserverInit,
) => {
	const observer = new MutationObserver(async (mutations, ob) => {
		const result = await Promise.resolve(cb(mutations, ob));
		if (result) {
			observer.disconnect();
		}
	});

	observer.observe(node, {
		childList: true,
		subtree: true,
		...options,
	});

	return observer;
};

/**
 * Waits for an element that matches the provided selector to
 * exist in the DOM or for the provided function to be truthy.
 */
export const waitFor = async (selectorOrFn: string | (() => boolean), timeout = 5e3): Promise<boolean> => {
	return new Promise(resolve => {
		let observer: MutationObserver;
		let waitInterval: Timer;

		const waitTimeout = setTimeout(() => {
			observer?.disconnect();
			clearInterval(waitInterval);
			resolve(false);
		}, timeout);

		if (typeof selectorOrFn === 'string') {
			if ($(selectorOrFn)) {
				clearTimeout(waitTimeout);
				resolve(true);
				return;
			}

			observer = observe(document, () => {
				if (!$(selectorOrFn)) return;
				clearTimeout(waitTimeout);
				resolve(true);
				return true;
			});
		} else if (typeof selectorOrFn === 'function') {
			waitInterval = setInterval(async () => {
				if (!selectorOrFn()) return;
				clearInterval(waitInterval);
				clearTimeout(waitTimeout);
				resolve(true);
			}, 50);
		} else {
			resolve(false);
		}
	});
};

/**
 * Await this method to hold execution for the specified amount of time.
 */
export const sleep = async (ms: number): Promise<void> => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

/**
 * Send an HTTP request using the userscript manager.
 */
export const request = async (
	url: string,
	options?: Omit<Tampermonkey.Request, 'url'>,
) => {
	const response = await GM.xmlHttpRequest({
		url,
		method: 'GET',
		...options,
	});

	try {
		response.json = JSON.parse(response.responseText);
	} catch {
		response.json = null;
	}

	return response;
};

/**
 * Send a request to the AniList API.
 */
export const anilistApi = async (query: string, variables?: Record<string, any>) => {
	const response = await request('https://graphql.anilist.co', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		data: JSON.stringify({ query, variables }),
	});

	return response.json;
};

/**
 * Send a request to the Jikan API. Returns cached data if available.
 */
export const malApi = async (path: string, cacheTime: number | false = ONE_HOUR) => {
	if (cacheTime !== false) {
		const cachedItem = await Cache.get('mal-api-response', path);

		if (cachedItem) {
			return cachedItem;
		}
	}

	const response = await request(`https://api.jikan.moe/v4/${path}`);

	if (response.status !== 200) {
		throw new Error('Failed to fetch data.');
	}

	if (response.json.error) {
		console.error(response.json);
		throw new Error(response.json.error);
	}

	if (cacheTime !== false) {
		await Cache.set('mal-api-response', path, response.json, cacheTime);
	}

	return response.json;
};

/**
 * Finds the Id of a user using their username.
 */
export const getUserId = async (username: string): Promise<number | undefined> => {
	if (typeof username !== 'string') {
		throw new TypeError('Missing username.');
	}

	username = username.toLowerCase();

	const cachedItem = await Cache.get('userids-map', username) as number | undefined;

	if (cachedItem) {
		return cachedItem;
	}

	const { data } = await anilistApi(`
		query ($username: String) {
			User(name: $username) { id }
		}
	`, { username }) as AnilistUserIdResponse;

	if (!data.User) return;

	// Cache id-username match for 1 hour.
	await Cache.set('userids-map', username, data.User.id, ONE_HOUR);

	return data.User.id;
};

/**
 * Internal use.
 */
const getId = async (
	fromId: number | string,
	fromIdName: 'id' | 'idMal',
	toIdName: 'id' | 'idMal',
	type: 'anime' | 'manga',
) => {
	if (!/anime|manga/.test(type)) {
		throw new TypeError('Invalid type. Expected anime|manga.');
	}

	if (!fromId) {
		return false;
	}

	if (!Number.isInteger(fromId)) {
		fromId = Number.parseInt(fromId as string, 10);
	}

	const mediaType = type.toUpperCase() as 'ANIME' | 'MANGA';

	const cachedItem = await Cache.get(`ids-map-${mediaType}`, `${fromIdName}-${toIdName}-${fromId}`) as number | false;

	if (cachedItem) {
		return cachedItem;
	}

	const { data } = await anilistApi(`
		query ($${fromIdName}: Int, $type: MediaType) {
			Media(${fromIdName}: $${fromIdName}, type: $type) {
				${toIdName}
			}
		}
	`, {
		[fromIdName]: fromId,
		type: mediaType,
	}) as AnilistMediaIdResponse;

	const id = data.Media[toIdName] ?? false;

	// Cache mal/anilist id match for 1 week if there is a match or 1 day if there isn't just in case.
	await Cache.set(`ids-map-${mediaType}`, `${fromIdName}-${toIdName}-${fromId}`, id, id ? ONE_WEEK : ONE_DAY);

	return id;
};

/**
 * Finds the AniList Id of a media entry using the provided type and MyAnimeList Id.
 */
export const getAnilistId = async (malId: number | string, type: 'anime' | 'manga') => {
	return getId(malId, 'idMal', 'id', type);
};

/**
 * Finds the MyAnimeList Id of a media entry using the provided type and AniList Id.
 */
export const getMalId = async (anilistId: number | string, type: 'anime' | 'manga') => {
	return getId(anilistId, 'id', 'idMal', type);
};

/**
 * Add a view toggle to the provided containers and targets.
 */
export const addViewToggle = (containers: string, targets: string) => {
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

			Storage.set('view', 'grid');
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

			Storage.set('view', 'list');
			event.stopPropagation();
		});
	}

	for (const target of targetElements) {
		target.classList.add('alextras--view-switch-target');
	}

	switch (Storage.get('view')) {
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
};

/**
 * Create a checkbox input.
 */
export const createCheckbox = (options: {
	label?: string;
	description?: string;
	checked?: boolean;
	appendTo?: Element | HTMLElement;
} = {}) => {
	const {
		label,
		description = '',
		checked = false,
		appendTo,
	} = options;

	const mainContainer = createElement('div', {
		attributes: {
			class: 'alextras--checkbox',
		},
	});

	const labelContainer = createElement('label', {
		attributes: {
			class: 'el-checkbox',
		},
		appendTo: mainContainer,
	});

	const inputContainer = createElement('span', {
		attributes: {
			class: 'el-checkbox__input',
		},
		appendTo: labelContainer,
	});

	createElement('span', {
		attributes: {
			class: 'el-checkbox__inner',
		},
		appendTo: inputContainer,
	});

	const inputElement = createElement('input', {
		attributes: {
			class: 'el-checkbox__original',
		},
		appendTo: inputContainer,
	}) as HTMLInputElement;

	createElement('span', {
		attributes: {
			class: 'el-checkbox__label',
		},
		textContent: label,
		appendTo: labelContainer,
	});

	if (description) {
		createElement('h5', {
			textContent: description,
			appendTo: mainContainer,
		});
	}

	const checkbox = {
		element: mainContainer,

		elements: {
			container: mainContainer,
			input: inputElement,
		},

		get checked() {
			return inputElement.checked;
		},

		set checked(value: boolean) {
			if (typeof value !== 'boolean') {
				throw new TypeError('Expected boolean.');
			}

			if (inputElement.checked === value) return;

			labelContainer.classList[value ? 'add' : 'remove']('is-checked');
			inputContainer.classList[value ? 'add' : 'remove']('is-checked');

			inputElement.checked = value;
			inputElement.dispatchEvent(new Event('change'));
		},

		toggle() {
			this.checked = !this.checked;
		},

		on(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.addEventListener(event, cb);
		},

		once(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.addEventListener(event, cb, { once: true });
		},

		off(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.removeEventListener(event, cb);
		},
	};

	labelContainer.addEventListener('click', event => {
		checkbox.toggle();
		event.preventDefault();
	});

	checkbox.checked = checked;

	if (appendTo instanceof HTMLElement) {
		appendTo.append(mainContainer);
	}

	return checkbox;
};

/**
 * Create a switch toggle.
 */
export const createSwitch = (options: {
	label?: string;
	description?: string;
	enabled?: boolean;
	appendTo?: Element | HTMLElement;
} = {}) => {
	const {
		label,
		description = '',
		enabled = false,
		appendTo,
	} = options;

	const mainContainer = createElement('div', {
		attributes: {
			class: 'alextras--switch',
		},
	});

	const switchContainer = createElement('div', {
		attributes: {
			class: 'el-switch',
		},
		appendTo: mainContainer,
	});

	const inputElement = createElement('input', {
		attributes: {
			class: 'el-switch__input',
		},
		appendTo: switchContainer,
	}) as HTMLInputElement;

	createElement('span', {
		attributes: {
			class: 'el-switch__core',
		},
		appendTo: switchContainer,
	});

	const labelElement = createElement('span', {
		attributes: {
			class: 'el-switch__label el-switch__label--right',
		},
		textContent: label,
		appendTo: switchContainer,
	});

	if (description) {
		createElement('h5', {
			textContent: description,
			appendTo: mainContainer,
		});
	}

	const switchToggle = {
		element: mainContainer,

		elements: {
			container: mainContainer,
			input: inputElement,
		},

		get enabled() {
			return inputElement.checked;
		},

		set enabled(value: boolean) {
			if (typeof value !== 'boolean') {
				throw new TypeError('Expected boolean.');
			}

			if (inputElement.checked === value) return;

			switchContainer.classList[value ? 'add' : 'remove']('is-checked');
			switchContainer.classList[value ? 'add' : 'remove']('is-checked');
			labelElement.classList[value ? 'add' : 'remove']('is-active');
			labelElement.classList[value ? 'add' : 'remove']('is-active');

			inputElement.checked = value;
			inputElement.dispatchEvent(new Event('change'));
		},

		toggle() {
			this.enabled = !this.enabled;
		},

		on(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.addEventListener(event, cb);
		},

		once(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.addEventListener(event, cb, { once: true });
		},

		off(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.removeEventListener(event, cb);
		},
	};

	switchContainer.addEventListener('click', event => {
		switchToggle.toggle();
		event.preventDefault();
	});

	switchToggle.enabled = enabled;

	if (appendTo instanceof HTMLElement) {
		appendTo.append(mainContainer);
	}

	return switchToggle;
};

type BaseInputOptions = {
	label?: string;
	description?: string;
	placeholder?: string;
	value?: number | string;
	width?: string;
	height?: string;
	appendTo?: Element | HTMLElement;
};

type InputOptions = BaseInputOptions & {
	type?: 'password' | 'text' | 'textarea';
};

type NumberInputOptions = BaseInputOptions & {
	type: 'number';
	min?: number;
	max?: number;
};

/**
 * Create an input element.
 */
// This method might get refactored in the future.
// I don't like the way it's structured right now.
export const createInput = (options: (InputOptions | NumberInputOptions) = {}) => {
	const {
		label,
		description,
		type = 'text',
		placeholder = '',
		value = '',
		width = '',
		height = '',
		appendTo,
	} = options;

	const mainContainer = createElement('div', {
		attributes: {
			class: type === 'textarea' ? 'alextras--textarea' : 'alextras--input',
		},
		styles: {
			display: 'flex',
			'flex-direction': 'column',
		},
	});

	createElement('h2', {
		textContent: label,
		appendTo: mainContainer,
	});

	const inputContainer = createElement('div', {
		attributes: {
			class: type === 'textarea' ? 'el-textarea' : 'el-input',
		},
	});

	const inputElement = createElement(type === 'textarea' ? 'textarea' : 'input', {
		attributes: {
			type,
			placeholder,
			class: type === 'textarea' ? 'el-textarea__inner' : 'el-input__inner',
			autocomplete: 'off',
		},
		styles: {
			// We can't set the width like this on number inputs.
			width: type === 'number' ? '' : width,
			height,
		},
		appendTo: inputContainer,
	}) as HTMLInputElement;

	if (type === 'number') {
		const { min, max } = options as NumberInputOptions;

		if (typeof min === 'number') {
			inputElement.min = min.toString();
		}

		if (typeof max === 'number') {
			inputElement.max = max.toString();
		}

		const numberInputContainer = createElement('div', {
			attributes: {
				class: 'el-input-number is-controls-right',
			},
			styles: {
				width,
			},
			children: [
				createElement('span', {
					attributes: {
						class: 'el-input-number__increase',
					},
					children: [
						createElement('i', {
							attributes: {
								class: 'el-icon-arrow-up',
							},
						}),
					],
					events: {
						click() {
							inputElement.stepUp();
							inputElement.dispatchEvent(new Event('change'));
						},
					},
				}),
				createElement('span', {
					attributes: {
						class: 'el-input-number__decrease',
					},
					children: [
						createElement('i', {
							attributes: {
								class: 'el-icon-arrow-down',
							},
						}),
					],
					events: {
						click() {
							inputElement.stepDown();
							inputElement.dispatchEvent(new Event('change'));
						},
					},
				}),
			],
			appendTo: mainContainer,
		});

		numberInputContainer.append(inputContainer);
	} else {
		mainContainer.append(inputContainer);
	}

	// We don't want the 1Password autofill to show up on these inputs.
	// If there password managers that do the same thing we can add them here.
	if (type === 'password') {
		inputElement.dataset['1pIgnore'] = '';
	}

	if (description) {
		createElement('h5', {
			textContent: description,
			appendTo: mainContainer,
		});
	}

	const input = {
		element: mainContainer,

		elements: {
			container: mainContainer,
			input: inputElement,
		},

		get value() {
			return inputElement.value;
		},

		set value(value: string) {
			inputElement.value = value;
		},

		on(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.addEventListener(event, cb);
		},

		once(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.addEventListener(event, cb, { once: true });
		},

		off(event: string, cb: EventListenerOrEventListenerObject) {
			inputElement.removeEventListener(event, cb);
		},
	};

	input.value = value.toString();

	if (appendTo instanceof HTMLElement) {
		appendTo.append(mainContainer);
	}

	return input;
};

/**
 * Create a dropdown element.
 */
export const createDropdown = (options: {
	label?: string;
	description?: string;
	options?: Record<string, string>;
	selected?: string;
	appendTo?: Element | HTMLElement;
} = {}) => {
	const {
		label,
		description,
		options: optionsList = {},
		selected = '',
		appendTo,
	} = options;

	const mainContainer = createElement('div', {
		attributes: {
			class: 'alextras--dropdown',
		},
		styles: {
			display: 'inline-flex',
			'flex-direction': 'column',
		},
	});

	createElement('h2', {
		textContent: label,
		appendTo: mainContainer,
	});

	const selectContainer = createElement('div', {
		attributes: {
			class: 'el-input',
		},
		appendTo: mainContainer,
	});

	const selectElement = createElement('select', {
		attributes: {
			class: 'el-input__inner',
		},
		children: [
			createElement('option', {
				attributes: {
					value: '',
				},
				textContent: 'Select an option',
			}),
			...Object.entries(optionsList).map(([value, text]) => {
				return createElement('option', {
					attributes: {
						value,
					},
					textContent: text,
				});
			}),
		],
		appendTo: selectContainer,
	}) as HTMLInputElement;

	if (description) {
		createElement('h5', {
			textContent: description,
			appendTo: mainContainer,
		});
	}

	const select = {
		element: mainContainer,

		elements: {
			container: mainContainer,
			input: selectElement,
		},

		get value() {
			return selectElement.value;
		},

		set value(value: string) {
			selectElement.value = value;
		},

		on(event: string, cb: EventListenerOrEventListenerObject) {
			selectElement.addEventListener(event, cb);
		},

		once(event: string, cb: EventListenerOrEventListenerObject) {
			selectElement.addEventListener(event, cb, { once: true });
		},

		off(event: string, cb: EventListenerOrEventListenerObject) {
			selectElement.removeEventListener(event, cb);
		},
	};

	select.value = selected.toString();

	if (appendTo instanceof HTMLElement) {
		appendTo.append(mainContainer);
	}

	return select;
};

// Add styles for the custom inputs.
addStyles(`
	/* Input Margins */

	.alextras--switch,
	.alextras--checkbox,
	.alextras--input,
	.alextras--textarea,
	.alextras--dropdown {
		margin: 0px 1em 1em 0;
	}

	/* Input Labels */

	.alextras--textarea h2,
	.alextras--input h2,
	.alextras--dropdown h2 {
		margin-bottom: 0.5em !important;
	}

	/* Switch Label */

	.alextras--switch .el-switch__label:not(.is-active) {
		color: rgb(var(--color-text-light));
	}

	/* Input Descriptions */

	.alextras--checkbox h5,
	.alextras--textarea h5,
	.alextras--input h5,
	.alextras--dropdown h5 {
		color: rgb(var(--color-text-light));
		margin: 0.5em 0 0 0.2em;
		font-size: 0.7em;
		user-select: none;
	}

	.alextras--checkbox h5 {
		margin-left: 2.2em;
	}

	/* Input Backgrounds */

	.alextras--dropdown .el-input__inner,
	.alextras--textarea .el-textarea__inner,
	.alextras--input .el-input__inner {
		background: rgba(var(--color-background), .6);
	}

	/* Input Placeholders */

	.alextras--input input::placeholder,
	.alextras--textarea textarea::placeholder {
		color: rgb(var(--color-text-light));
	}

	/* Number Input */

	.alextras--input input[type="number"]::-webkit-outer-spin-button,
	.alextras--input input[type="number"]::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}

	.alextras--input input[type="number"] {
		-moz-appearance: textfield;
	}

	/* Dropdown */

	.alextras--dropdown .el-input {
		width: max-content;
	}

	.alextras--dropdown .el-input__inner {
		width: auto;
		padding-right: 35px;
	}

	.alextras--dropdown .el-input:after {
		content: "▾";
		position: absolute;
		right: 10px;
		top: 9px;
		font-size: 20px;
		pointer-events: none;
	}

	.alextras--dropdown option {
		background: rgba(var(--color-background));
	}
`);
