/* global GM_xmlhttpRequest FontAwesome inject */
// ==UserScript==
// @name         AniList Extras
// @namespace    https://github.com/pilar6195
// @version      0.5.0
// @description  Adds a few additional features to AniList.
// @author       pilar6195
// @match        https://anilist.co/*
// @match        https://myanimelist.net/*
// @connect      graphql.anilist.co
// @connect      api.jikan.moe
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() { // eslint-disable-line wrap-iife

	'use strict';

	/* eslint-disable */
	GM_addStyle(`
		.characters:not(.mal) > .grid-wrap.mal,
		.characters.mal > .grid-wrap:not(.mal),
		#toggleCharacters {
			display: none;
		}
		.characters.mal #toggleCharacters {
			display: block;
		}
		.hidden {
			display: none !important;
		}
		.toggle {
			border-radius: 3px;
			background: rgb(var(--color-foreground));
			font-size: 1.2rem;
			padding: 3px 6px;
			margin-left: 5px;
		}
		.characters .link,
		.staff .link {
			pointer-events: none;
			cursor: initial !important;
		}
		.characters .link .toggle {
			cursor: pointer;
		}
		.characters .link *,
		.staff .link * {
			pointer-events: all;
		}
		.view-switcher {
			float: right;
		}
		.view-switcher span:hover {
			cursor: pointer;
		}
		.view-switcher span.active {
			color: rgb(var(--color-blue))
		}
	`);
	/* eslint-enable */

	const $ = selector => document.querySelector(selector);
	const $$ = a => Array.from(document.querySelectorAll(a));

	const isUserscript = typeof GM_info !== 'undefined'; // eslint-disable-line

	const anilist = {

		overview: {

			lastLocation: window.location.pathname,

			running: false,

			stopRunning() {
				this.running = false;
			},

			async init() {
				if (this.running) return null;

				this.running = true;

				if (this.lastLocation !== window.location.pathname) {
					this.lastLocation = location.pathname;
					this.cleanUp();
				}

				const isAnime = /^\/anime/.test(location.pathname);

				const malID = await anilist.helpers.getMalID(isAnime);
				if (!malID) return this.stopRunning();

				this.addMalLink(malID, isAnime);

				if ($('.overview')) {
					await this.displayCharacters(malID, isAnime);
					anilist.helpers.addViewToggle('.characters .link, .staff .link', '.grid-wrap');
					if (isAnime) await this.displayOpEd(malID);
				}

				return this.stopRunning();
			},

			addMalLink(malID, isAnime) {
				if ($('.MyAnimeList')) return;

				let extLinksEl = $('.external-links');

				const attrEl = $('.external-links > a');

				if (!attrEl) return;

				const attrName = attrEl.attributes[0].name;

				const malLink = anilist.helpers.createElement('a', {
					[attrName]: '',
					class: 'external-link MyAnimeList',
					target: '_blank',
					href: `https://myanimelist.net/${isAnime ? 'anime' : 'manga'}/${malID}/`
				});

				malLink.innerText = 'MyAnimeList';

				extLinksEl.append(malLink);
			},

			async displayCharacters(malID, isAnime = true) {
				if ($('.grid-wrap.mal')) return;

				try {
					const res = await anilist.helpers.request({
						url: `https://api.jikan.moe/v3/${isAnime ? 'anime' : 'manga'}/${malID}/${isAnime ? 'characters_staff' : 'characters'}`,
						method: 'GET'
					});

					const characterData = JSON.parse(res.response);

					if (!characterData.characters.length) return;

					const attrEl = $('.overview > .characters .character')
						? $('.overview > .characters .character')
						: $('.overview > .staff .staff');

					if (!attrEl) return;

					const charGrid = anilist.helpers.createElement('div', { class: 'grid-wrap mal' });

					const attrName = attrEl.attributes[0].name;

					for (const index in characterData.characters) {
						const character = characterData.characters[index];

						const charCard = anilist.helpers.createElement('div', {
							[attrName]: '',
							class: `role-card view-character-staff ${index > 11 ? 'showmore hidden' : ''}`
						});

						charCard.innerHTML = `
							<div ${attrName} class="character">
								<a ${attrName} href="${character.url}" class="cover" style="background-image: url(${character.image_url});"></a>
								<a ${attrName} href="${character.url}" class="content">
									<div ${attrName} class="name">${character.name}</div>
									<div ${attrName} class="role">${character.role}</div>
								</a>
							</div>
						`;

						if (isAnime) {
							const voiceActor = character.voice_actors.find(va => va.language === 'Japanese');
							if (voiceActor) {
								const something = voiceActor.image_url.match(/voiceactors\/(\d+\/\d+)/);
								const imageUrl = something && something.length
									? `https://myanimelist.cdn-dena.com/images/voiceactors/${something[1]}.jpg`
									: voiceActor.image_url;

								charCard.innerHTML = `${charCard.innerHTML}
									<div ${attrName} class="staff">
										<a ${attrName} href="${voiceActor.url}" class="cover" style="background-image: url(${imageUrl});"></a>
										<a ${attrName} href="${voiceActor.url}" class="content">
											<div ${attrName} class="name">${voiceActor.name}</div>
										</a>
									</div>
								`;
							}
						}

						charGrid.append(charCard);
					}

					if (!$('.characters')) {
						const charContainer = anilist.helpers.createElement('div', { class: 'characters' }, { marginBottom: '30px' });
						const charHeader = anilist.helpers.createElement('h2', { class: 'link' });
						charHeader.innerText = 'Characters';
						charContainer.append(charHeader);
						$('.staff').parentNode.insertBefore(charContainer, $('.staff'));
					}

					$('.characters').append(charGrid);

					if (characterData.characters.length > 12) {
						const toggleCharacters = anilist.helpers.createElement('div', { id: 'toggleCharacters' }, { marginTop: '10px', textAlign: 'center' });
						const button = anilist.helpers.createElement('a', { href: 'javascript:void(0);', 'data-visible': '0' });

						button.innerText = 'Show more';

						button.addEventListener('click', function() {
							$$('.characters .showmore').forEach(a => {
								if (this.dataset.visible === '0') {
									a.classList.remove('hidden');
								} else {
									a.classList.add('hidden');
								}
							});
							if (this.dataset.visible === '0') {
								this.dataset.visible = '1';
								this.innerText = 'Hide';
							} else {
								this.dataset.visible = '0';
								this.innerText = 'Show more';
							}
						});

						toggleCharacters.append(button);
						$('.characters').append(toggleCharacters);
					}

					$('.characters .link').remove(); // This is to remove the click listener
					$('.characters .grid-wrap').insertAdjacentHTML('beforebegin', `
						<h2 class="link">
							<span class="character-header">Characters</span>
							<span class="toggle"></span>
						</h2>
					`);

					$('.characters .link .toggle').addEventListener('click', () => {
						if ($('.characters').classList.contains('mal')) {
							$('.characters').classList.remove('mal');
							$('.characters .toggle').innerText = 'Switch to MyAnimeList';
							$('.characters .character-header').innerText = 'AniList Characters';
						} else {
							$('.characters').classList.add('mal');
							$('.characters .toggle').innerText = 'Switch to AniList';
							$('.characters .character-header').innerText = 'MAL Characters';
						}
					});

					if (anilist.storage.get('activeCharacters') === 'anilist') {
						$('.characters .toggle').innerText = 'Switch to MyAnimeList';
						$('.characters .character-header').innerText = 'AniList Characters';
					} else {
						$('.characters').classList.add('mal');
						$('.characters .toggle').innerText = 'Switch to AniList';
						$('.characters .character-header').innerText = 'MAL Characters';
					}
				} catch (err) {
					console.error(err);
				}
			},

			async displayOpEd(malID) {
				if ($('.openings')) return;

				const attrEl = $('.sidebar > .tags .tag');
				const target = $('.overview > .staff');

				if (!attrEl || !target) return;

				const attrName = attrEl.attributes[0].name;

				try {
					const res = await anilist.helpers.request({
						url: `https://api.jikan.moe/v3/anime/${malID}`,
						method: 'GET'
					});

					const animeData = JSON.parse(res.response);

					if (animeData.opening_themes.length) {
						const opContainer = anilist.helpers.createElement('div', { class: 'openings' }, { marginBottom: '30px' });
						const opHeader = anilist.helpers.createElement('h2');
						opHeader.innerText = 'Openings';
						opContainer.append(opHeader);

						for (const index in animeData.opening_themes) {
							const song = animeData.opening_themes[index];
							const opCard = anilist.helpers.createElement('div', {
								[attrName]: '',
								class: `tag ${index > 5 ? 'showmore hidden' : ''}`
							}, { marginBottom: '10px' });
							opCard.innerText = `#${parseInt(index, 10) + 1}: ${song}`;
							opContainer.append(opCard);
						}

						if (animeData.opening_themes.length > 5) {
							const toggleOpenings = anilist.helpers.createElement('div', {}, { textAlign: 'center' });
							const button = anilist.helpers.createElement('a', { id: 'toggleOpenings', href: 'javascript:void(0);', 'data-visible': '0' });

							button.innerText = 'Show more';

							button.addEventListener('click', function() {
								$$('.openings .showmore').forEach(a => {
									if (this.dataset.visible === '0') {
										a.classList.remove('hidden');
									} else {
										a.classList.add('hidden');
									}
								});
								if (this.dataset.visible === '0') {
									this.dataset.visible = '1';
									this.innerText = 'Hide';
								} else {
									this.dataset.visible = '0';
									this.innerText = 'Show more';
								}
							});

							toggleOpenings.append(button);
							opContainer.append(toggleOpenings);
						}

						target.parentNode.insertBefore(opContainer, target);
					}

					/* == == */

					if (animeData.ending_themes.length) {
						const edContainer = anilist.helpers.createElement('div', { class: 'endings' }, { marginBottom: '30px' });
						const edHeader = anilist.helpers.createElement('h2');

						edHeader.innerText = 'Endings';
						edContainer.append(edHeader);

						for (const index in animeData.ending_themes) {
							const song = animeData.ending_themes[index];
							const edCard = anilist.helpers.createElement('div', {
								[attrName]: '',
								class: `tag ${index > 5 ? 'showmore hidden' : ''}`
							}, { marginBottom: '10px' });
							edCard.innerText = `#${parseInt(index, 10) + 1}: ${song}`;
							edContainer.append(edCard);
						}

						if (animeData.ending_themes.length > 5) {
							const toggleEndings = anilist.helpers.createElement('div', {}, { textAlign: 'center' });
							const button = anilist.helpers.createElement('a', { id: 'toggleEndings', href: 'javascript:void(0);', 'data-visible': '0' });

							button.innerText = 'Show more';

							button.addEventListener('click', function() {
								$$('.endings .showmore').forEach(a => {
									if (this.dataset.visible === '0') {
										a.classList.remove('hidden');
									} else {
										a.classList.add('hidden');
									}
								});
								if (this.dataset.visible === '0') {
									this.dataset.visible = '1';
									this.innerText = 'Hide';
								} else {
									this.dataset.visible = '0';
									this.innerText = 'Show more';
								}
							});

							toggleEndings.append(button);
							edContainer.append(toggleEndings);
						}

						target.parentNode.insertBefore(edContainer, target);
					}
				} catch (err) {
					console.error(err);
				}
			},

			cleanUp() {
				if ($('.characters')) $('.characters').classList.remove('mal');
				if ($('.character-header')) $('.character-header').innerText = 'Characters';
				const elements = $$('.MyAnimeList, .toggle, .grid-wrap.mal, #toggleCharacters, .openings, .endings');
				for (const el of elements) el.remove();
			}

		},

		characters: {

			running: false,

			stopRunning() {
				this.running = false;
			},

			init() {
				if (this.running) return null;

				this.running = true;

				this.addCharacterHeader();
				anilist.helpers.addViewToggle('.character-header', '.grid-wrap');

				return this.stopRunning();
			},

			addCharacterHeader() {
				if (!$('.media-characters') || !$('.grid-wrap') || $('.media-characters .character-header')) return;

				const header = anilist.helpers.createElement('h2', { class: 'character-header' }, { height: '16px' });

				$('.grid-wrap').parentNode.insertBefore(header, $('.grid-wrap'));
			}

		},

		staff: {

			running: false,

			stopRunning() {
				this.running = false;
			},

			init() {
				if (this.running) return null;

				this.running = true;

				if (anilist.helpers.page(/^\/(anime|manga)\/\d+\/.+\/staff$/)) {
					this.addStaffHeader();
				}

				// this.sortAnime();
				anilist.helpers.addViewToggle('.character-roles .header, .media-roles .header, .media-staff .header', '.grid-wrap');

				return this.stopRunning();
			},

			addStaffHeader() {
				if (!$('.media-staff') || !$('.grid-wrap') || $('.media-staff .header')) return;

				const header = anilist.helpers.createElement('h2', { class: 'header' }, { height: '16px' });

				$('.grid-wrap').parentNode.insertBefore(header, $('.grid-wrap'));
			}

		},

		mal: {

			async init() {
				const isAnime = /^\/anime/.test(location.pathname);
				const aniListID = await anilist.helpers.getAniListID(isAnime);
				if (!aniListID) return;
				this.addAniListLink(aniListID, isAnime);
			},

			addAniListLink(aniListID, isAnime = true) {
				if ($('.AniListLink')) return;

				const extLinksEl = $('.pb16');

				if (!extLinksEl) return;

				if (extLinksEl.children.length > 0) {
					const separatorNode = document.createTextNode(', ');
					extLinksEl.append(separatorNode);
				}

				const aniListLink = anilist.helpers.createElement('a', {
					class: 'AniListLink',
					target: '_blank',
					href: `https://anilist.co/${isAnime ? 'anime' : 'manga'}/${aniListID}/`
				});

				aniListLink.innerText = 'AniList';

				extLinksEl.append(aniListLink);
			}

		},

		helpers: {

			addViewToggle(containers, target) {
				containers = $$(containers).filter(c => !c.querySelector('.view-switcher'));

				if (!containers.length || !$$(target).length) return;

				for (const container of containers) {

					const viewSwitcher = anilist.helpers.createElement('div', { class: 'view-switcher' });

					viewSwitcher.innerHTML = `
						<span class="switch-grid"><i class="fa fa-th-large"></i></span>
						<span class="switch-list"><i class="fa fa-th-list"></i></span>
					`;

					viewSwitcher.querySelector('.switch-grid').addEventListener('click', () => {
						$$('.view-switcher .active').forEach(a => {
							a.classList.remove('active');
						});
						$$('.view-switcher .switch-grid').forEach(a => {
							a.classList.add('active');
						});
						$$(target).forEach(t => {
							t.style.gridTemplateColumns = '';
						});
						anilist.storage.set('view', 'grid');
						event.stopPropagation();
					});

					viewSwitcher.querySelector('.switch-list').addEventListener('click', () => {
						$$('.view-switcher .active').forEach(a => {
							a.classList.remove('active');
						});
						$$('.view-switcher .switch-list').forEach(a => {
							a.classList.add('active');
						});
						$$(target).forEach(t => {
							t.style.gridTemplateColumns = '1fr';
						});
						anilist.storage.set('view', 'list');
						event.stopPropagation();
					});

					container.append(viewSwitcher);

				}

				switch (anilist.storage.get('view')) {
					case 'list':
						$$('.view-switcher .switch-list').forEach(s => {
							s.classList.add('active');
						});
						$$(target).forEach(t => {
							t.style.gridTemplateColumns = '1fr';
						});
						break;
					/* case 'list-small':
						$('.view-switcher .switch-list-small').classList.add('active');
						$$(target).forEach(t => {
							t.style.gridTemplateColumns = '1fr';
						});
						break; */
					default:
						$$('.view-switcher .switch-grid').forEach(s => {
							s.classList.add('active');
						});
				}

				if (isUserscript) {
					FontAwesome.dom.i2svg();
				} else {
					inject(() => FontAwesome.dom.i2svg());
				}
			},

			getAniListID(isAnime) {
				return this.getID('idMal', 'id', isAnime);
			},

			getMalID(isAnime) {
				return this.getID('id', 'idMal', isAnime);
			},

			async getID(fromIDName, toIDName, isAnime = true) {
				const query = `query ($${fromIDName}: Int, $type: MediaType) {
					Media(${fromIDName}: $${fromIDName}, type: $type) {
						${toIDName}
					}
				}`;
				// let fromID = location.pathname.match(/(?:anime|manga)\/(\d+)/);
				let fromID = location.href.match(/(?:anime|manga)(?:\/|\.php\?id=)(\d+)/);
				if (fromID === null) return false;

				fromID = parseInt(fromID[1], 10);

				const type = isAnime ? 'ANIME' : 'MANGA';

				const res = await this.request({
					url: 'https://graphql.anilist.co',
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						accept: 'application/json'
					},
					data: JSON.stringify({
						query,
						variables: { [fromIDName]: fromID, type }
					})
				});

				const { data } = JSON.parse(res.response);
				return data.Media[toIDName] || false;
			},

			request(options) {
				return new Promise((resolve, reject) => {
					options.onload = res => resolve(res);
					options.onerror = err => reject(err);
					GM_xmlhttpRequest(options); // eslint-disable-line new-cap
				});
			},

			createElement(tag, attrs, styles) {
				const element = document.createElement(tag);
				for (const aKey in attrs) {
					element.setAttribute(aKey, attrs[aKey]);
				}
				for (const sKey in styles) {
					element.style[sKey] = styles[sKey];
				}
				return element;
			},

			page(regex, href = false) {
				return regex.test(href ? window.location.href : window.location.pathname);
			}

		},

		storage: {
			data: {},
			init() {
				this.data = JSON.parse(localStorage.getItem('anilist-extras')) || {};
			},
			get(key) {
				return this.data[key];
			},
			set(key, value) {
				this.data[key] = value;
				localStorage.setItem('anilist-extras', JSON.stringify(this.data));
			}
		}

	};

	anilist.storage.init();

	const observer = new MutationObserver(() => {

		if (window.location.hostname === 'anilist.co') {

			if (anilist.helpers.page(/^\/(anime|manga)\/\d+\/.+\/$/)) {

				anilist.overview.init();

			} else if (anilist.helpers.page(/^\/(anime|manga)\/.+\/characters$/)) {

				anilist.characters.init();

			} else if (anilist.helpers.page(/^(\/staff)|(\/(anime|manga)\/\d+\/.+\/staff$)/)) {

				anilist.staff.init();

			}

		}

	});

	observer.observe(document, { childList: true, subtree: true });

	/* Not adding the anilist stuff here since it will be taken care of by the observer */
	document.addEventListener('DOMContentLoaded', () => {

		if (window.location.hostname === 'myanimelist.net') {

			if (anilist.helpers.page(/^\/(anime|manga)/)) {

				anilist.mal.init();

			}

		}

	});

})();
