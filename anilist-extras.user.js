/* global GM_xmlhttpRequest */
// ==UserScript==
// @name         AniList Extras
// @namespace    https://github.com/pilar6195
// @version      1.1.1
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

	'use strict'; // eslint-disable-line strict

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
		.hide:not(#nav) {
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
		.mal-anilist-link {
			margin-left: 1em;
		}
		.user-social {
			grid-template-columns: 180px auto !important;
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

			currentData: null,

			stopRunning() {
				this.running = false;
			},

			async init() {
				if (this.running) return;

				this.running = true;

				if (this.lastLocation !== window.location.pathname) {
					this.lastLocation = location.pathname;
					this.cleanUp();
				}

				const isAnime = /^\/anime/.test(location.pathname);

				const malID = await anilist.helpers.getMalID(isAnime);
				if (!malID) return this.stopRunning();

				if (!this.currentData) {
					this.currentData = await anilist.helpers.getMalData(malID, isAnime);
				}

				this.addMalLink(malID, isAnime);
				this.addMalScore();

				if ($('.overview')) {
					await this.displayCharacters(malID, isAnime);
					anilist.helpers.addViewToggle('.characters .link, .staff .link', '.characters .grid-wrap, .staff .grid-wrap');
					if (isAnime) await this.displayOpEd(malID);
				}

				return this.stopRunning();
			},

			addMalLink(malID, isAnime) {
				if ($('.MyAnimeList')) return;

				const extLinksEl = $('.external-links');

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

			addMalScore() {
				if ($('.mal-score')) return;

				const attrEl = $('.data-set');

				if (!attrEl) return;

				const attrName = attrEl.attributes[0].name;

				const malScoreContainer = anilist.helpers.createElement('div', {
					[attrName]: '',
					class: 'data-set mal-score'
				});

				const malScoreHeader = anilist.helpers.createElement('div', {
					[attrName]: '',
					class: 'type'
				});


				malScoreHeader.innerText = 'MyAnimeList Score';

				const malScoreValue = anilist.helpers.createElement('div', {
					[attrName]: '',
					class: 'value'
				});

				malScoreValue.innerText = this.currentData.score === null
					? 'N/A'
					: this.currentData.score;

				malScoreContainer.append(malScoreHeader, malScoreValue);

				$('.data').append(malScoreContainer);

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
						if (!Object.prototype.hasOwnProperty.call(characterData.characters, index)) continue;

						const character = characterData.characters[index];

						const charCard = anilist.helpers.createElement('div', {
							[attrName]: '',
							class: `role-card view-character-staff ${index > 11 ? 'showmore hide' : ''}`
						});

						const charContainer = anilist.helpers.createElement('div', {
							[attrName]: '',
							class: 'character'
						});

						const charCover = anilist.helpers.createElement('a', {
							[attrName]: '',
							href: character.url,
							class: 'cover'
						}, { backgroundImage: `url(${character.image_url})` });

						const charContent = anilist.helpers.createElement('a', {
							[attrName]: '',
							href: character.url,
							class: 'content'
						});

						const charName = anilist.helpers.createElement('div', { [attrName]: '', class: 'name' });
						const charRole = anilist.helpers.createElement('div', { [attrName]: '', class: 'role' });

						charName.innerText = character.name;
						charRole.innerText = character.role;

						charContent.append(charName, charRole);
						charContainer.append(charCover, charContent);
						charCard.append(charContainer);

						if (isAnime) {
							const voiceActor = character.voice_actors.find(va => va.language === 'Japanese');
							if (voiceActor) {
								const something = voiceActor.image_url.match(/voiceactors\/(\d+\/\d+)/);
								const imageUrl = something && something.length
									? `https://cdn.myanimelist.net/images/voiceactors/${something[1]}.jpg`
									: voiceActor.image_url;

								const vaContainer = anilist.helpers.createElement('div', {
									[attrName]: '',
									class: 'staff'
								});

								const vaCover = anilist.helpers.createElement('a', {
									[attrName]: '',
									href: voiceActor.url,
									class: 'cover'
								}, { backgroundImage: `url(${imageUrl})` });

								const vaContent = anilist.helpers.createElement('a', {
									[attrName]: '',
									href: voiceActor.url,
									class: 'content'
								});

								const vaName = anilist.helpers.createElement('div', { [attrName]: '', class: 'name' });

								vaName.innerText = voiceActor.name;

								vaContent.append(vaName);
								vaContainer.append(vaCover, vaContent);
								charCard.append(vaContainer);
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
									a.classList.remove('hide');
								} else {
									a.classList.add('hide');
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
							anilist.storage.set('activeCharacters', 'anilist');
						} else {
							$('.characters').classList.add('mal');
							$('.characters .toggle').innerText = 'Switch to AniList';
							$('.characters .character-header').innerText = 'MAL Characters';
							anilist.storage.set('activeCharacters', 'mal');
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

			displayOpEd() {
				if ($('.openings')) return;

				const attrEl = $('.sidebar > .tags .tag');
				const target = $('.overview > .staff') || $('.overview > .characters');

				if (!attrEl || !target) return;

				const attrName = attrEl.attributes[0].name;

				const animeData = this.currentData;

				if (!$('.openings') && animeData.opening_themes.length) {
					const opContainer = anilist.helpers.createElement('div', { class: 'openings' }, { marginBottom: '30px' });
					const opHeader = anilist.helpers.createElement('h2');
					opHeader.innerText = 'Openings';
					opContainer.append(opHeader);

					for (const index in animeData.opening_themes) {
						if (!Object.prototype.hasOwnProperty.call(animeData.opening_themes, index)) continue;

						const song = animeData.opening_themes[index];
						const opCard = anilist.helpers.createElement('div', {
							[attrName]: '',
							class: `tag ${index > 5 ? 'showmore hide' : ''}`
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
									a.classList.remove('hide');
								} else {
									a.classList.add('hide');
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

					if (target.classList.contains('staff')) {
						target.parentNode.insertBefore(opContainer, target);
					} else {
						target.parentNode.insertBefore(opContainer, target.nextSibling);
					}
				}

				/* == == */

				if (!$('.endings') && animeData.ending_themes.length) {
					const edContainer = anilist.helpers.createElement('div', { class: 'endings' }, { marginBottom: '30px' });
					const edHeader = anilist.helpers.createElement('h2');

					edHeader.innerText = 'Endings';
					edContainer.append(edHeader);

					for (const index in animeData.ending_themes) {
						if (!Object.prototype.hasOwnProperty.call(animeData.ending_themes, index)) continue;

						const song = animeData.ending_themes[index];
						const edCard = anilist.helpers.createElement('div', {
							[attrName]: '',
							class: `tag ${index > 5 ? 'showmore hide' : ''}`
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
									a.classList.remove('hide');
								} else {
									a.classList.add('hide');
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

					if (target.classList.contains('staff')) {
						target.parentNode.insertBefore(edContainer, target);
					} else if ($('.openings')) {
						$('.openings').parentNode.insertBefore(edContainer, $('.openings').nextSibling);
					} else {
						target.parentNode.insertBefore(edContainer, target.nextSibling);
					}
				}
			},

			cleanUp() {
				if ($('.characters')) $('.characters').classList.remove('mal');
				if ($('.character-header')) $('.character-header').innerText = 'Characters';
				const elements = $$('.MyAnimeList, .mal-score, .toggle, .grid-wrap.mal, #toggleCharacters, .openings, .endings');
				for (const el of elements) el.remove();
				this.currentData = null;
			}

		},

		characters: {

			running: false,

			stopRunning() {
				this.running = false;
			},

			init() {
				if (this.running) return;

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

		social: {

			lastLocation: window.location.pathname,

			running: false,

			stopRunning() {
				this.running = false;
			},

			async init() {

				if (this.running) return;

				if (!$('.user-social .filter-group span')) return;

				this.running = true;

				const username = window.location.pathname.match(/\/user\/(.+)\/social/)[1];
				const userId = await anilist.helpers.getUserID(username);

				await this.addTotalFollowing(userId);
				await this.addTotalFollowers(userId);
				await this.addTotalThreads(userId);
				await this.addTotalComments(userId);

				return this.stopRunning();

			},

			async addTotalFollowing(userId) {
				const target = $('.user-social .filter-group span:nth-of-type(1)');

				if ($('.following-total') || !target) return;

				const data = await this.getTotal('following', userId);

				if (!data) return;

				const totalElement = anilist.helpers.createElement('span', { class: 'following-total' });

				totalElement.innerText = ` (${data.pageInfo.total})`;

				if (target) {
					target.append(totalElement);
				}
			},

			async addTotalFollowers(userId) {
				const target = $('.user-social .filter-group span:nth-of-type(2)');

				if ($('.followers-total') || !target) return;

				const data = await this.getTotal('followers', userId);

				if (!data) return;

				const totalElement = anilist.helpers.createElement('span', { class: 'followers-total' });

				totalElement.innerText = ` (${data.pageInfo.total})`;

				if (target) {
					target.append(totalElement);
				}
			},

			async addTotalThreads(userId) {
				const target = $('.user-social .filter-group span:nth-of-type(3)');

				if ($('.threads-total') || !target) return;

				const data = await this.getTotal('threads', userId);

				if (!data) return;

				const totalElement = anilist.helpers.createElement('span', { class: 'threads-total' });

				totalElement.innerText = ` (${data.pageInfo.total})`;

				if (target) {
					target.append(totalElement);
				}
			},

			async addTotalComments(userId) {
				const target = $('.user-social .filter-group span:nth-of-type(4)');

				if ($('.comments-total') || !target) return;

				const data = await this.getTotal('threadComments', userId);

				if (!data) return;

				const totalElement = anilist.helpers.createElement('span', { class: 'comments-total' });

				totalElement.innerText = ` (${data.pageInfo.total})`;

				if (target) {
					target.append(totalElement);
				}
			},

			async getTotal(type, userId) {
				const query = `query ($userId: Int!) {
					Page {
						pageInfo {
							total
						}
						${type}(userId: $userId) {
							id
						}
					}
				}`;

				try {
					const res = await anilist.helpers.request({
						url: 'https://graphql.anilist.co',
						method: 'POST',
						headers: {
							'content-type': 'application/json',
							accept: 'application/json'
						},
						timeout: 5000,
						data: JSON.stringify({
							query,
							variables: { userId }
						})
					});

					const { data } = JSON.parse(res.response);

					return data.Page;
				} catch (err) {
					// console.error(err);
				}
			}

		},

		staff: {

			running: false,

			stopRunning() {
				this.running = false;
			},

			init() {
				if (this.running) return;

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
				if ($('.mal-anilist-link')) return;

				const headerEl = $('.header-right');

				if (!headerEl) return;

				const aniListLink = anilist.helpers.createElement('a', {
					class: 'mal-anilist-link',
					target: '_blank',
					href: `https://anilist.co/${isAnime ? 'anime' : 'manga'}/${aniListID}/`
				});

				aniListLink.innerText = 'AniList';

				headerEl.append(aniListLink);
			}

		},

		helpers: {

			addViewToggle(containers, target) {
				containers = $$(containers).filter(c => !c.querySelector('.view-switcher'));

				if (!containers.length || !$$(target).length) return;

				for (const container of containers) {

					const viewSwitcher = anilist.helpers.createElement('div', { class: 'view-switcher' });

					// https://github.com/FortAwesome/Font-Awesome/blob/master/LICENSE.txt
					viewSwitcher.innerHTML = `
						<span class="switch-grid">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="icon svg-inline--fa fa-th-large fa-w-16">
								<path fill="currentColor" d="M296 32h192c13.255 0 24 10.745 24 24v160c0 13.255-10.745 24-24 24H296c-13.255
								0-24-10.745-24-24V56c0-13.255 10.745-24 24-24zm-80 0H24C10.745 32 0 42.745 0 56v160c0 13.255 10.745 24 24
								24h192c13.255 0 24-10.745 24-24V56c0-13.255-10.745-24-24-24zM0 296v160c0 13.255 10.745 24 24 24h192c13.255
								0 24-10.745 24-24V296c0-13.255-10.745-24-24-24H24c-13.255 0-24 10.745-24 24zm296 184h192c13.255 0 24-10.745
								24-24V296c0-13.255-10.745-24-24-24H296c-13.255 0-24 10.745-24 24v160c0 13.255 10.745 24 24 24z" />
							</svg>
						</span>

						<span class="switch-list">
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

			async getMalData(malID, isAnime = true) {
				try {
					const res = await anilist.helpers.request({
						url: `https://api.jikan.moe/v3/${isAnime ? 'anime' : 'manga'}/${malID}`,
						method: 'GET'
					});
					return JSON.parse(res.response);
				} catch (err) {
					console.error(err);
					return null;
				}
			},

			async getUserID(username) {

				if (typeof username !== 'string') throw new Error('Missing username.');

				username = username.toLowerCase();

				const query = `query ($username: String) {
					User(name: $username) {
						id
					}
				}`;

				const res = await this.request({
					url: 'https://graphql.anilist.co',
					method: 'POST',
					headers: {
						'content-type': 'application/json',
						accept: 'application/json'
					},
					data: JSON.stringify({
						query,
						variables: { username }
					})
				});

				const { data } = JSON.parse(res.response);

				if (data.User) {
					return data.User.id;
				}
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
					if (!Object.prototype.hasOwnProperty.call(attrs, aKey)) continue;
					element.setAttribute(aKey, attrs[aKey]);
				}
				for (const sKey in styles) {
					if (!Object.prototype.hasOwnProperty.call(styles, sKey)) continue;
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

			if (anilist.helpers.page(/^\/(anime|manga)\/\d+\/[\w\d-_]+(\/)?$/)) {

				anilist.overview.init();

			}

			if (anilist.helpers.page(/^\/(anime|manga)\/.+\/characters$/)) {

				anilist.characters.init();

			}

			if (anilist.helpers.page(/^(\/staff)|(\/(anime|manga)\/\d+\/.+\/staff$)/)) {

				anilist.staff.init();

			}

			if (anilist.helpers.page(/^\/user\/.+\/social$/)) {

				anilist.social.init();

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
