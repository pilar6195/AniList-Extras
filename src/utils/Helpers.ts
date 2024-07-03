/* eslint-disable no-param-reassign */
import Cache from './Cache';
import Storage from './Storage';
import { ONE_HOUR, ONE_DAY, ONE_WEEK } from './Constants';
import type * as CSS from 'csstype';


declare global {
	namespace Tampermonkey {
		// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
		interface Response<TContext, T = object> {
			json: any
		}
	}
}

export const $ = (selector: string): HTMLElement | null => document.querySelector(selector);
export const $$ = (selector: string): HTMLElement[] => Array.from(document.querySelectorAll(selector));

/**
 * Check if the current UI is desktop, tablet, or mobile.
 */
export const isUI = {
	get desktop() {
		return window.innerWidth > 1040;
	},
	get tablet() {
		return window.innerWidth <= 1040 && window.innerWidth > 760;
	},
	get mobile() {
		return window.innerWidth <= 760;
	},
};

/**
 * Creates a new element using the provided parameters.
 */
export const createElement = (
	tag: string,
	options: {
		attributes?: Record<string, string>;
		// styles?: Record<string, string>;
		styles?: CSS.Properties | CSS.PropertiesHyphen;
		textContent?: string;
		innerHTML?: string;
		tooltip?: string;
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

	const { attributes, styles, textContent, innerHTML, tooltip, events, children, appendTo } = options;

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

	if (tooltip) {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		createTooltip(element, tooltip);
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
 * Check if a value is JSON serializable.
 */
export const validateJSONSerializable = (value: any): boolean => {
	if (value === null || typeof value === 'undefined') {
		return true;
	}

	const valueType = typeof value;

	if (['boolean', 'number', 'string'].includes(valueType)) {
		return true;
	}

	if (Array.isArray(value)) {
		return value.every(validateJSONSerializable);
	}

	if (valueType === 'object') {
		return Object.keys(value).every(key => validateJSONSerializable(value[key]));
	}

	return false;
};

/**
 * Parse the headers from a headers response string.
 */
const parseResponseHeaders = (headersString: string) => {
	// const headers: Record<string, string> = {};
	const headers = new Headers();
	const headerLines = headersString.trim().trim().split(/[\n\r]+/);

	for (const line of headerLines) {
		const [name, value] = line.split(': ', 2);
		// headers[name.trim()] = value ? value.trim() : '';
		headers.set(name.trim(), value ? value.trim() : '');
	}

	return headers;
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
export const anilistApi = async (
	query: string,
	variables?: Record<string, any>,
	useApiToken = true,
	retries = 3,
): Promise<any> => {
	const apiToken = Storage.get('apiToken');

	const headers: any = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	};

	if (apiToken && useApiToken) {
		headers.Authorization = `Bearer ${apiToken}`;
	}

	let retryCount = 0;

	while (retryCount < retries) {
		const response = await request('https://graphql.anilist.co', {
			method: 'POST',
			headers,
			data: JSON.stringify({ query, variables }),
		});

		// If the request failed and the user has an api token, check if the token is invalid.
		if (apiToken && useApiToken && response.status === 400) {
			const invalidToken = response.json.errors.some((error: any) => error.message === 'Invalid token');

			if (invalidToken) {
				Storage.remove('apiToken');
				return anilistApi(query, variables, useApiToken, retries);
			}
		}

		if (response.status >= 400 && response.status !== 429) {
			console.error(`Request failed with status code ${response.status}. Retrying... (${retryCount + 1}/${retries})`, response);
			retryCount++;
			await sleep(2500);
			continue;
		}

		const responseHeaders = parseResponseHeaders(response.responseHeaders);

		if (responseHeaders.get('retry-after')) {
			const retryAfter = Number.parseInt(responseHeaders.get('retry-after')!, 10);
			await sleep(retryAfter * 1000);
			return anilistApi(query, variables, useApiToken, retries);
		} else {
			console.debug(`DEBUG: AniList rate limit remaining: ${responseHeaders.get('x-ratelimit-remaining')}`);
			// console.trace();
		}

		return response.json;
	}

	throw new Error('Failed to fetch data after multiple retries.');
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
 * Create a tooltip for the provided target element.
 */
export const createTooltip = (target: HTMLElement, contents: string) => {
	if (!(target instanceof HTMLElement)) {
		throw new TypeError('Target must be an HTMLElement');
	}

	if (typeof contents !== 'string') {
		throw new TypeError('Contents must be a string');
	}

	let tooltipElement: HTMLElement;

	target.addEventListener('mouseenter', () => {
		const targetRect = target.getBoundingClientRect();

		tooltipElement = createElement('div', {
			attributes: {
				class: 'alextras--tooltip',
			},
			styles: {
				top: `${target.offsetTop - 15}px`,
			},
			children: [
				createElement('span', {
					textContent: contents.trim(),
				}),
			],
		});

		const tooltipArrow = createElement('div', {
			attributes: {
				class: 'alextras--tooltip-arrow',
			},
			appendTo: tooltipElement,
		});

		document.body.append(tooltipElement);

		let tooltipRect = tooltipElement.getBoundingClientRect();

		let tooltipLeft = target.offsetLeft + target.offsetWidth / 2;

		if (tooltipLeft + tooltipRect.width / 2 > window.innerWidth - 50) {
			tooltipLeft = window.innerWidth - 50 - tooltipRect.width / 2;
		}

		if (tooltipLeft - tooltipRect.width / 2 < 50) {
			tooltipLeft = 50 + tooltipRect.width / 2;
		}

		tooltipElement.style.left = `${tooltipLeft}px`;

		tooltipRect = tooltipElement.getBoundingClientRect();
		tooltipArrow.style.left = `${(targetRect.left + (targetRect.width / 2)) - tooltipRect.left}px`;
		tooltipElement.style.opacity = '1';
	});

	target.addEventListener('mouseleave', () => {
		tooltipElement.style.opacity = '0';
		const tooltip = tooltipElement;
		setTimeout(() => tooltip.remove(), 350);
	});
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
	validate?(value: number | string): boolean | string;
};

type ColorInputOptions = BaseInputOptions & {
	type: 'color';
};

type TextInputOptions = BaseInputOptions & {
	type?: 'password' | 'text' | 'textarea';
	minLength?: number;
	maxLength?: number;
};

type NumberInputOptions = BaseInputOptions & {
	type: 'number';
	min?: number;
	max?: number;
	step?: number;
};

/**
 * Create an input element.
 */
// This method might get refactored in the future.
// I don't like the way it's structured right now.
export const createInput = (options: (ColorInputOptions | NumberInputOptions | TextInputOptions) = {}) => {
	const {
		label,
		description,
		type = 'text',
		placeholder = '',
		value = '',
		width = '',
		height = '',
		// eslint-disable-next-line @typescript-eslint/unbound-method
		validate,
		appendTo,
	} = options;

	const mainContainer = createElement('div', {
		attributes: {
			class: type === 'textarea' ? 'alextras--textarea' : 'alextras--input',
		},
		styles: {
			display: 'flex',
			flexDirection: 'column',
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

	if (['text', 'password', 'textarea'].includes(type)) {
		const { minLength, maxLength } = options as TextInputOptions;

		if (typeof minLength === 'number') {
			inputElement.minLength = minLength;
		}

		if (typeof maxLength === 'number') {
			inputElement.maxLength = maxLength;
		}
	}

	if (type === 'number') {
		const { min, max, step } = options as NumberInputOptions;

		if (typeof min === 'number') {
			inputElement.min = min.toString();
		}

		if (typeof max === 'number') {
			inputElement.max = max.toString();
		}

		if (typeof step === 'number') {
			inputElement.step = step.toString();
		}

		const numberInputContainer = createElement('div', {
			attributes: {
				class: 'el-input-number is-controls-right',
			},
			styles: {
				width,
			},
			appendTo: mainContainer,
		});

		const inputIncreaseElement = createElement('span', {
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
					const currentValue = inputElement.value;
					inputElement.stepUp();
					if (currentValue === inputElement.value) return;
					inputElement.dispatchEvent(new Event('change'));
				},
			},
			appendTo: numberInputContainer,
		});

		const inputDecreaseElement = createElement('span', {
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
					const currentValue = inputElement.value;
					inputElement.stepDown();
					if (currentValue === inputElement.value) return;
					inputElement.dispatchEvent(new Event('change'));
				},
			},
			appendTo: numberInputContainer,
		});

		inputElement.addEventListener('change', () => {
			let currentValue = Number.parseFloat(inputElement.value);

			if (typeof min === 'number') {
				if (currentValue < min) {
					inputElement.value = min.toString();
					currentValue = min;
				}

				if (currentValue === min) {
					inputDecreaseElement.classList.add('is-disabled');
				} else {
					inputDecreaseElement.classList.remove('is-disabled');
				}
			}

			if (typeof max === 'number') {
				if (currentValue > max) {
					inputElement.value = max.toString();
					currentValue = max;
				}

				if (currentValue === max) {
					inputIncreaseElement.classList.add('is-disabled');
				} else {
					inputIncreaseElement.classList.remove('is-disabled');
				}
			}
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

	const inputErrorElement = createElement('div', {
		attributes: {
			class: 'el-input__error',
		},
		appendTo: mainContainer,
	});

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

		get isValidInput() {
			return inputElement.validity.valid;
		},

		get value() {
			return inputElement.value;
		},

		set value(value: string) {
			if (inputElement.value === value.toString()) return;
			inputElement.value = value.toString();
			inputElement.dispatchEvent(new Event('change'));
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

	input.on('change', () => {
		if (typeof validate === 'function') {
			const result = validate(type === 'number' ? Number.parseFloat(input.value) : input.value);

			if (result === true) {
				inputElement.setCustomValidity('');
			} else {
				const error = typeof result === 'string' ? result : 'Invalid input.';
				inputElement.setCustomValidity(error);
			}
		}

		if (inputElement.validity.valid) {
			inputErrorElement.textContent = '';
		} else {
			inputErrorElement.textContent = inputElement.validationMessage;
		}
	});

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
			flexDirection: 'column',
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
		children: Object.entries(optionsList).map(([value, text]) => {
			return createElement('option', {
				attributes: {
					value,
				},
				textContent: text,
			});
		}),
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
