import {
	$,
	$$,
	waitFor,
	createElement,
	removeElements,
	addStyles,
	malApi,
	ONE_HOUR,
} from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addOpEdSongs',

	validate({ pathname }) {
		return /^\/anime\/\d+\/.+\/$/.test(pathname);
	},

	async load({ media }) {
		const targetLoaded = await waitFor('.overview > .staff, .overview > .characters');

		// If the target element or mal id is not found, return.
		if (!targetLoaded || !media?.malId) return;

		// Fetch the song data from the Cache/API.
		const { data: songData } = await malApi(`anime/${media.malId}/themes`, ONE_HOUR) as MalAnimeThemesResponse;

		// Find an element we can snatch the required attributes for styling
		const attrEl = $('.sidebar > .tags .tag');

		// If we can't find said element then we abort.
		if (!attrEl) return;

		// This is the attribute we need to properly style our newly created elements.
		const attrName = attrEl.attributes[0].name;

		if (songData.openings.length) {
			const opContainer = createElement('div', {
				attributes: {
					class: 'alextras--openings',
				},
				styles: {
					'margin-bottom': '30px',
				},
				children: [
					// Header Text.
					createElement('h2', {
						textContent: 'Openings',
					}),
					// Create the tags for each opening song.
					...songData.openings.map((song, index) => {
						return createElement('div', {
							attributes: {
								[attrName]: '',
								class: `tag ${index > 4 ? 'alextras--show-more alextras--hide' : ''}`,
							},
							styles: {
								'margin-bottom': '10px',
							},
							textContent: song.includes('No opening themes')
								// This probably should not be displayed on anilist
								? song.replace('Help improve our database by adding an opening theme here.', '')
								: `#${index + 1}: ${song.replace(/^(#)?\d+:/, '')}`,
						});
					}),
				],
			});

			// Display a "Show more" button if there is more than 4 songs.
			if (songData.openings.length > 4) {
				createElement('div', {
					attributes: {
						id: 'alextras--toggleOpenings',
					},
					children: [
						createElement('a', {
							attributes: {
								'data-visible': '0',
							},
							styles: {
								cursor: 'pointer',
							},
							events: {
								click(this: HTMLElement) {
									for (const a of $$('.alextras--openings .alextras--show-more')) {
										if (this.dataset['visible'] === '0') {
											a.classList.remove('alextras--hide');
										} else {
											a.classList.add('alextras--hide');
										}
									}

									if (this.dataset['visible'] === '0') {
										this.dataset['visible'] = '1';
										this.textContent = 'Show less';
									} else {
										this.dataset['visible'] = '0';
										this.textContent = 'Show more';
									}
								},
							},
							textContent: 'Show more',
						}),
					],
					appendTo: opContainer,
				});
			}

			// Prepend it before the stats containers.
			$('.grid-section-wrap')!.before(opContainer);
		}

		if (songData.endings.length) {
			const edContainer = createElement('div', {
				attributes: {
					class: 'alextras--endings',
				},
				styles: {
					'margin-bottom': '30px',
				},
				children: [
					// Header Text.
					createElement('h2', {
						textContent: 'Endings',
					}),
					// Create the tags for each ending song.
					...songData.endings.map((song, index) => {
						return createElement('div', {
							attributes: {
								[attrName]: '',
								class: `tag ${index > 4 ? 'alextras--show-more alextras--hide' : ''}`,
							},
							styles: {
								'margin-bottom': '10px',
							},
							textContent: song.includes('No ending themes')
								// This probably should not be displayed on anilist
								? song.replace('Help improve our database by adding an ending theme here.', '')
								: `#${index + 1}: ${song.replace(/^(#)?\d+:/, '')}`,
						});
					}),
				],
			});

			// Display a "Show more" button if there is more than 4 songs.
			if (songData.endings.length > 4) {
				createElement('div', {
					attributes: {
						id: 'alextras--toggleEndings',
					},
					children: [
						createElement('a', {
							attributes: {
								'data-visible': '0',
							},
							styles: {
								cursor: 'pointer',
							},
							events: {
								click(this: HTMLElement) {
									for (const a of $$('.alextras--endings .alextras--show-more')) {
										if (this.dataset['visible'] === '0') {
											a.classList.remove('alextras--hide');
										} else {
											a.classList.add('alextras--hide');
										}
									}

									if (this.dataset['visible'] === '0') {
										this.dataset['visible'] = '1';
										this.textContent = 'Show less';
									} else {
										this.dataset['visible'] = '0';
										this.textContent = 'Show more';
									}
								},
							},
							textContent: 'Show more',
						}),
					],
					appendTo: edContainer,
				});
			}

			// Prepend it before the stats containers.
			$('.grid-section-wrap')!.before(edContainer);
		}
	},

	unload() {
		removeElements('.alextras--openings, .alextras--endings');
	},
});

addStyles(`
	#alextras--toggleOpenings,
	#alextras--toggleEndings {
		display: block;
		margin-top: 0.75em;
		text-align: center;
	}
`);
