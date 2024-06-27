import { $, $$, waitFor, createElement, removeElements, addStyles, malApi } from '@/utils/Helpers';
import { ONE_HOUR } from '@/utils/Constants';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';
import SettingsManager from '@/utils/Settings';

registerModule.anilist({
	id: 'addMalCharacters',
	name: 'MAL Characters',
	description: 'Adds character data from MyAnimeList on anime/manga pages.',
	tags: [
		ModuleTags.Media,
		ModuleTags.Metadata,
	],
	togglable: true,

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+\/.+\/$/.test(currentPage.pathname);
	},

	async load({ media }) {
		const ModuleSettings = new SettingsManager(this.id);
		const targetLoaded = await waitFor('.overview > .characters, .overview > .staff');

		// If the target element or mal id is not found, return.
		if (!targetLoaded || !media.malId) return;

		// Fetch the character data from the Cache/API.
		const { data: characterData } = await malApi(`${media.type}/${media.malId}/characters`, ONE_HOUR) as MalCharactersResponse;

		// If we don't have any character data to work with we stop here.
		if (!characterData.length) return;

		// Find an element we can snatch the required attributes for styling
		const attrEl = $('.overview > .characters .character')
			? $('.overview > .characters .character')
			: $('.overview > .staff .staff');

		// If we can't find said element then we abort.
		if (!attrEl) return;

		// This is the attribute we need to properly style our newly created elements.
		const attrName = attrEl.attributes[0].name;

		// Create the element that will contain all the MAL character entries we will create.
		const charGrid = createElement('div', {
			attributes: {
				class: 'grid-wrap alextras--mal',
			},
			// Loop over every MAL character and create it's element to append to
			// the container we created earlier.
			children: characterData.map((data, index) => {
				// Deconstruct the data we need.
				const { character, voice_actors, role } = data;

				// Character Card.
				const charCard = createElement('div', {
					attributes: {
						[attrName]: '',
						class: `role-card view-character-staff ${index > 11 ? 'alextras--show-more alextras--hide' : ''}`,
					},
					children: [
						// Character Container
						createElement('div', {
							attributes: {
								[attrName]: '',
								class: 'character',
							},
							children: [
								// Character Poster Art
								createElement('a', {
									attributes: {
										[attrName]: '',
										href: character.url,
										class: 'cover',
									},
									styles: {
										'background-image': `url(${character.images.jpg.image_url})`,
									},
								}),
								// Character Content Container
								createElement('a', {
									attributes: {
										[attrName]: '',
										href: character.url,
										class: 'content',
									},
									children: [
										// Character Name Text
										createElement('div', {
											attributes: {
												[attrName]: '',
												class: 'name',
											},
											textContent: character.name,
										}),
										// Character Role Text
										createElement('div', {
											attributes: {
												[attrName]: '',
												class: 'role',
											},
											textContent: role,
										}),
									],
								}),
							],
						}),
					],
				});

				// This only applies if the current media is an anime.
				if (media.type === 'anime') {
					// Find the appropriate VA to display.
					// Might make this an option later.
					const voiceActor = voice_actors.find(va => va.language === 'Japanese');

					// Only continue if we were able to find a VA.
					if (voiceActor) {
						// VA Container
						createElement('div', {
							attributes: {
								[attrName]: '',
								class: 'staff',
							},
							children: [
								// VA Poster
								createElement('a', {
									attributes: {
										[attrName]: '',
										href: voiceActor.person.url,
										class: 'cover',
									},
									styles: {
										'background-image': `url(${voiceActor.person.images.jpg.image_url})`,
									},
								}),
								// VA Content Container
								createElement('a', {
									attributes: {
										[attrName]: '',
										href: voiceActor.person.url,
										class: 'content',
									},
									children: [
										// VA Name Text
										createElement('div', {
											attributes: {
												[attrName]: '',
												class: 'name',
											},
											textContent: voiceActor.person.name,
										}),
										// VA Role Text
										createElement('div', {
											attributes: {
												[attrName]: '',
												class: 'role',
											},
											textContent: voiceActor.language,
										}),
									],
								}),
							],
							appendTo: charCard,
						});
					}
				}

				return charCard;
			}),
		});

		// Check if the character container already exists. This may not exist for obscure or new anime/manga.
		const hasAnilistCharacters = Boolean($('.characters'));

		// If the characters container does not exist we will create it.
		if (!hasAnilistCharacters) {
			// Character container
			const charContainer = createElement('div', {
				attributes: {
					class: 'characters alextras--characters',
				},
				styles: {
					'margin-bottom': '30px',
				},
				children: [
					// Character Header Text.
					createElement('h2', {
						attributes: {
							class: 'link',
						},
						textContent: 'Characters',
					}),
				],
			});

			// Prepend it before the staff container.
			$('.staff')!.before(charContainer);
		}

		// Append the mal characters grid element to the existing (or the one we created) characters container.
		$('.characters')!.append(charGrid);

		// Display a "Show more" button if there is more than 11 characters.
		if (characterData.length > 11) {
			createElement('div', {
				attributes: {
					id: 'alextras--showMoreCharacters',
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
								for (const a of $$('.characters .alextras--show-more')) {
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
				appendTo: $('.characters')!,
			});
		}

		// Empty the characters header text so we can change it.
		$('.characters .link')!.textContent = '';

		// Create a header element to append to the element we just emptied.
		const characterHeader = createElement('span', {
			attributes: {
				class: 'alextras--characters-header',
			},
			textContent: 'AniList Characters',
			appendTo: $('.characters .link')!,
		});

		// Create element to be used as the toggle between Anilist and MyAnimeList characters.
		const characterToggle = createElement('span', {
			attributes: {
				class: 'alextras--characters-toggle',
			},
			appendTo: $('.characters .link')!,
		});

		characterToggle.addEventListener('click', (event) => {
			if ($('.characters')!.classList.contains('alextras--mal')) {
				characterToggle.textContent = 'Switch to MyAnimeList';
				characterHeader.textContent = 'AniList Characters';
				$('.characters')!.classList.remove('alextras--mal');
				ModuleSettings.set('activeCharacters', 'anilist');
			} else {
				characterToggle.textContent = 'Switch to AniList';
				characterHeader.textContent = 'MAL Characters';
				$('.characters')!.classList.add('alextras--mal');
				ModuleSettings.set('activeCharacters', 'mal');
			}

			event.stopPropagation();
		});

		// Redirect to the MAL characters page when the header is clicked on if the MAL characters is the active view.
		characterHeader.addEventListener('click', (event) => {
			if (!$('.characters')!.classList.contains('alextras--mal')) return;

			// A underscore is required in the path otherwise it will direct the user
			// to the media page instead of the character page.
			location.href = `https://myanimelist.net/${media.type}/${media.malId}/_/characters`;

			event.stopPropagation();
		});

		if (ModuleSettings.get('activeCharacters') === 'anilist' && hasAnilistCharacters) {
			characterToggle.textContent = 'Switch to MyAnimeList';
			characterHeader.textContent = 'AniList Characters';
		} else {
			characterToggle.textContent = 'Switch to AniList';
			characterHeader.textContent = 'MAL Characters';
			$('.characters')!.classList.add('alextras--mal');
		}
	},

	unload() {
		// Remove the changes and elements we created when navigating to a new page.
		if ($('.characters')) {
			$('.characters')!.classList.remove('alextras--mal');
		}

		if ($('.characters .link')) {
			$('.characters .link')!.textContent = 'Characters';
		}

		removeElements('.grid-wrap.alextras--mal, #alextras--showMoreCharacters');
		removeElements('.alextras--characters-toggle, .alextras--characters');
	},
});

addStyles(`
	.characters:not(.alextras--mal) > .grid-wrap.alextras--mal,
	.characters.alextras--mal > .grid-wrap:not(.alextras--mal),
	#alextras--showMoreCharacters {
		display: none;
	}

	.characters.alextras--mal #alextras--showMoreCharacters {
		display: block;
		margin-top: 0.75em;
		text-align: center;
	}

	.alextras--characters-toggle {
		border-radius: 3px;
		background: rgb(var(--color-foreground));
		font-size: 1.2rem;
		padding: 3px 6px;
		margin-left: 5px;
	}

	.alextras--characters-header {
		font-size: 1.4rem;
		font-weight: 500;
	}
`);
