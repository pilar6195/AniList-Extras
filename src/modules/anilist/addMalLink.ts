import { $, waitFor, createElement, removeElements, isUI } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addMalLink',
	name: 'MyAnimeList Link',
	description: 'Adds a link to MyAnimeList on anime/manga pages.',
	togglable: true,

	validate({ currentPage }) {
		return /\/(anime|manga)\/\d+/.test(currentPage.pathname);
	},

	validateUnload({ currentPage, previousPage }) {
		const match1 = (/\/((anime|manga)\/\d+)/i.exec(currentPage.pathname))?.[1];
		const match2 = (/\/((anime|manga)\/\d+)/i.exec(previousPage.pathname))?.[1];
		return match1 !== match2 || isUI.mobile;
	},

	async load({ media }) {
		const targetLoaded = await waitFor('.sidebar');

		// If the target element or mal id is not found, return.
		if (!targetLoaded || !media.malId) return;

		let attrName: string;

		// In some cases this element may exist. We will wait/check to see if it
		// does and if not we will create it ourselves.
		if (await waitFor('.external-links .external-links-wrap', 500)) {
			const attrEl = $('.external-links .external-links-wrap > a');
			attrName = attrEl!.attributes[0].name;
		} else {
			// Setting the "data-v-" attribute manually is not ideal as
			// this could change in the future but it'll do for now.
			attrName = 'data-v-c1b7ee7c';

			createElement('div', {
				attributes: {
					[attrName]: '',
					class: 'external-links alextras--external-links',
				},
				children: [
					createElement('h2', {
						textContent: 'External Links',
					}),
					createElement('div', {
						attributes: {
							class: 'external-links-wrap',
						},
					}),
				],
				appendTo: $('.sidebar')!,
			});
		}

		createElement('a', {
			attributes: {
				[attrName]: '',
				class: 'external-link alextras--mal-link',
				target: '_blank',
				href: `https://myanimelist.net/${media.type}/${media.malId}/`,
			},
			styles: {
				'--link-color': '#2d51a2',
			},
			children: [
				createElement('div', {
					attributes: {
						[attrName]: '',
						class: 'icon-wrap',
					},
					styles: {
						padding: '0px',
						background: '#2d51a2',
					},
					children: [
						createElement('img', {
							attributes: {
								[attrName]: '',
								class: 'icon',
								src: 'https://cdn.myanimelist.net/images/favicon.ico',
							},
						}),
					],
				}),
				createElement('div', {
					attributes: {
						[attrName]: '',
						class: 'name',
					},
					textContent: 'MyAnimeList',
				}),
			],
			appendTo: isUI.mobile
				? $('.overview .external-links .external-links-wrap')!
				: $('.external-links .external-links-wrap')!,
		});
	},


	unload() {
		removeElements('.alextras--mal-link, .alextras--external-links');
	},
});
