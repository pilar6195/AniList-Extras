/* global GM_xmlhttpRequest */
// ==UserScript==
// @name         AniList Extras
// @namespace    https://github.com/pilar6195
// @version      1.2.0
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

(() => { // eslint-disable-line wrap-iife
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
		.characters .grid-wrap, .staff .grid-wrap{
			margin-top: 10px;
		}
		.characters .character-header{
			font-size: 1.4rem;
			font-weight: 500;
		}
		.characters .switcher-holder, .staff .switcher-holder, .staff .link{
			display: inline;
		}
		.characters .toggle {
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

		/* Reviews */
		.review-card:not(.is-home) .summary {
			padding-right: 45px;
		}
		.review-card.is-home .summary {
			padding-bottom: 20px;
		}
		.review-card .review-score-container {
			position: absolute;
			line-height: 1.2;
			bottom: 30px;
			right: 10px;
		}
		.review-card.is-home .review-score-container {
			bottom: 10px;
			right: 45px;
		}
		.review-card .review-score {
			color: rgb(var(--color-white));
			text-align: center;
			padding: 0px 5px;
			margin: 0px;
			border-radius: 4px;
			font-size: 1.3rem;
			font-weight: bold;
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

				if (!this.currentData) {
					const malID = await anilist.helpers.getMalID(isAnime);

					if (!malID) {
						return this.stopRunning();
					}

					this.currentData = await anilist.helpers.getMalData(malID, isAnime);
				}

				this.addMalLink(this.currentData.mal_id, isAnime);
				this.addMalScore();

				if ($('.overview')) {
					await this.displayCharacters(this.currentData.mal_id, isAnime);
					this.displayStaffViewSwitcher();
					anilist.helpers.addViewToggle('.characters .switcher-holder, .staff .switcher-holder', '.characters .grid-wrap, .staff .grid-wrap');
					if (isAnime) await this.displayOpEd(this.currentData.mal_id);
				}

				return this.stopRunning();
			},

			addMalLink(malID, isAnime) {
				if ($('.MyAnimeList') || !$('.sidebar')) return;

				let extLinksWrapEl = $('.external-links .external-links-wrap');
				const attrEl = $('.external-links .external-links-wrap > a');
				let attrName;

				if (attrEl) {
					attrName = attrEl.attributes[0].name;
				} else {
					// Setting the "data-v-" attribute manually is not ideal as
					// this could change in the future but it'll do for now.
					attrName = 'data-v-7a1f9df8';

					const extLinksEl = anilist.helpers.createElement('div', {
						[attrName]: '',
						class: 'external-links external-links-extras',
					});

					const extLinksTitle = anilist.helpers.createElement('h2');
					extLinksTitle.innerText = 'External & Streaming links';
					extLinksEl.append(extLinksTitle);

					extLinksWrapEl = anilist.helpers.createElement('div', { class: 'external-links-wrap' });
					extLinksEl.append(extLinksWrapEl);

					$('.sidebar').append(extLinksEl);
				}

				const malLink = anilist.helpers.createElement('a', {
					[attrName]: '',
					class: 'external-link MyAnimeList',
					target: '_blank',
					href: `https://myanimelist.net/${isAnime ? 'anime' : 'manga'}/${malID}/`,
				});
				malLink.innerText = 'MyAnimeList';

				extLinksWrapEl.append(malLink);
			},

			addMalScore() {
				if ($('.mal-score')) return;

				const attrEl = $('.data-set');

				if (!attrEl) return;

				const attrName = attrEl.attributes[0].name;

				const malScoreContainer = anilist.helpers.createElement('div', {
					[attrName]: '',
					class: 'data-set mal-score',
				});

				const malScoreHeader = anilist.helpers.createElement('div', {
					[attrName]: '',
					class: 'type',
				});

				malScoreHeader.innerText = 'MyAnimeList Score';

				const malScoreValue = anilist.helpers.createElement('div', {
					[attrName]: '',
					class: 'value',
				});

				malScoreValue.innerText = this.currentData.score === null
					? 'N/A'
					: this.currentData.score;

				malScoreContainer.append(malScoreHeader, malScoreValue);

				const dataNodes = Array.from($$('.data-set'));
				const targetNode = dataNodes.find(el => /popularity/i.test(el.innerText));

				if (targetNode) {
					targetNode.before(malScoreContainer);
				} else {
					$('.data').append(malScoreContainer);
				}
			},

			async displayCharacters(malID, isAnime = true) {
				if ($('.grid-wrap.mal')) return;

				try {
					const res = await anilist.helpers.request({
						url: `https://api.jikan.moe/v3/${isAnime ? 'anime' : 'manga'}/${malID}/${isAnime ? 'characters_staff' : 'characters'}`,
						method: 'GET',
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
							class: `role-card view-character-staff ${index > 11 ? 'showmore hide' : ''}`,
						});

						const charContainer = anilist.helpers.createElement('div', {
							[attrName]: '',
							class: 'character',
						});

						const charCover = anilist.helpers.createElement('a', {
							[attrName]: '',
							href: character.url,
							class: 'cover',
						}, { backgroundImage: `url(${character.image_url})` });

						const charContent = anilist.helpers.createElement('a', {
							[attrName]: '',
							href: character.url,
							class: 'content',
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
									class: 'staff',
								});

								const vaCover = anilist.helpers.createElement('a', {
									[attrName]: '',
									href: voiceActor.url,
									class: 'cover',
								}, { backgroundImage: `url(${imageUrl})` });

								const vaContent = anilist.helpers.createElement('a', {
									[attrName]: '',
									href: voiceActor.url,
									class: 'content',
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

						button.addEventListener('click', function click() {
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


					$('.characters .link').innerHTML = 'AniList Characters';
					$('.characters .link').insertAdjacentHTML('afterend', `
						<span class="character-header">MAL Characters</span>
						<span class="toggle"></span>
					`);

					if ($('.characters .toggle') && $('.characters .switcher-holder') === null) {
						$('.characters .toggle').insertAdjacentHTML('afterend', `
							<div class="switcher-holder"></div>
						`);
					}

					$('.characters .toggle').addEventListener('click', () => {
						if ($('.characters').classList.contains('mal')) {
							$('.characters').classList.remove('mal');
							$('.characters .toggle').innerText = 'Switch to MyAnimeList';
							$('.characters .character-header').style.display = 'none';
							$('.characters .link').style.display = 'inline';
							anilist.storage.set('activeCharacters', 'anilist');
						} else {
							$('.characters').classList.add('mal');
							$('.characters .toggle').innerText = 'Switch to AniList';
							$('.characters .character-header').style.display = 'inline';
							$('.characters .link').style.display = 'none';
							anilist.storage.set('activeCharacters', 'mal');
						}
					});

					if (anilist.storage.get('activeCharacters') === 'anilist') {
						$('.characters .toggle').innerText = 'Switch to MyAnimeList';
						$('.characters .character-header').style.display = 'none';
						$('.characters .link').style.display = 'inline';
					} else {
						$('.characters').classList.add('mal');
						$('.characters .toggle').innerText = 'Switch to AniList';
						$('.characters .character-header').style.display = 'inline';
						$('.characters .link').style.display = 'none';
					}
				} catch (err) {
					console.error(err);
				}
			},

			displayStaffViewSwitcher() {
				if ($('.staff .switcher-holder')) return;
				if (!$('.staff .link')) return;

				try {
					$('.staff .link').insertAdjacentHTML('afterend', `
						<div class="switcher-holder"></div>
					`);
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
							class: `tag ${index > 5 ? 'showmore hide' : ''}`,
						}, { marginBottom: '10px' });

						opCard.innerText = song.includes('No opening themes')
							? song.replace('Help improve our database by adding an opening theme here.', '') // This probably should not be displayed on anilist
							: `#${parseInt(index, 10) + 1}: ${song.replace(/^(#)?\d+:/, '')}`;
						opContainer.append(opCard);
					}

					if (animeData.opening_themes.length > 5) {
						const toggleOpenings = anilist.helpers.createElement('div', {}, { textAlign: 'center' });
						const button = anilist.helpers.createElement('a', { id: 'toggleOpenings', href: 'javascript:void(0);', 'data-visible': '0' });

						button.innerText = 'Show more';

						button.addEventListener('click', function click() {
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
							class: `tag ${index > 5 ? 'showmore hide' : ''}`,
						}, { marginBottom: '10px' });

						edCard.innerText = song.includes('No ending themes')
							? song.replace('Help improve our database by adding an ending theme here.', '') // This probably should not be displayed on anilist
							: `#${parseInt(index, 10) + 1}: ${song.replace(/^(#)?\d+:/, '')}`;
						edContainer.append(edCard);
					}

					if (animeData.ending_themes.length > 5) {
						const toggleEndings = anilist.helpers.createElement('div', {}, { textAlign: 'center' });
						const button = anilist.helpers.createElement('a', { id: 'toggleEndings', href: 'javascript:void(0);', 'data-visible': '0' });

						button.innerText = 'Show more';

						button.addEventListener('click', function click() {
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
				const elements = $$('.MyAnimeList, .external-links-extras, .mal-score, .toggle, .grid-wrap.mal, #toggleCharacters, .openings, .endings');
				for (const el of elements) el.remove();
				this.currentData = null;
			},

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
			},

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
							accept: 'application/json',
						},
						timeout: 5000,
						data: JSON.stringify({
							query,
							variables: { userId },
						}),
					});

					const { data } = JSON.parse(res.response);

					return data.Page;
				} catch (err) {
					// console.error(err);
				}
			},

		},

		seasonal: {
			running: false,

			stopRunning() {
				this.running = false;
			},

			init() {
				if (this.running) return;

				this.running = true;

				this.addSeasonLink();

				return this.stopRunning();
			},

			addSeasonLink() {
				if (!$('.browse-wrap .dropdown .primary-links .secondary-links')) return;
				if ($('.seasonal-anime')) return;

				const linksEl = $('.secondary-links');
				const attrName = $('.secondary-links > a').attributes[0].name;

				// Create the new element and add to the dropdown
				const link = anilist.helpers.createElement('a', {
					class: 'seasonal-anime',
					[attrName]: '',
					href: '/search/anime/this-season',
				}, { marginTop: '5px' });
				link.innerText = 'Seasonal';

				linksEl.append(link);
			},
		},

		reviewRatings: {
			running: false,

			stopRunning() {
				this.running = false;
			},

			async init() {
				if (this.running) return;

				this.running = true;

				await this.addReviewRatings();

				return this.stopRunning();
			},

			async addReviewRatings() {
				if (!$('.review-wrap')) return;

				const reviews = $$('.review-wrap .review-card');
				const isHome = /^\/home/i.test(window.location.pathname);
				const reviewContainers = {};

				for (const review of reviews) {
					isHome && review.classList.add('is-home');
					const content = review.querySelector('.content');
					if (content.dataset.scoreFetched) continue;

					let reviewId = review.getAttribute('href') || content.getAttribute('href');
					reviewId = reviewId.replace(/\D+/, '');
					reviewContainers[reviewId] = content;
				}

				const reviewIds = Object.keys(reviewContainers);

				// Don't continue if theres nothing
				if (!reviewIds.length) return;

				const reviewsData = await this.getReviews(reviewIds);

				for (const reviewData of reviewsData) {
					if (!reviewData) continue;

					const { id: reivewId, score: reviewScore } = reviewData;

					// We are marking the reviews as fetched to avoid fetching them again.
					reviewContainers[reivewId].dataset.scoreFetched = true;

					// The public api cannot fetch adult content without auth so it will return nothing
					if (reviewScore === null) continue;

					// Create holding div
					const div = anilist.helpers.createElement('div', { class: 'review-score-container' });

					// Create score p
					const score = anilist.helpers.createElement('p', { class: 'review-score' });
					score.innerText = reviewScore;

					if (reviewScore < 35) {
						score.style.background = 'rgb(var(--color-red))';
					} else if (reviewScore <= 65) {
						score.style.background = 'rgb(var(--color-orange))';
					} else {
						score.style.background = 'rgb(var(--color-green))';
					}

					div.append(score);

					reviewContainers[reivewId].append(div);
				}
			},

			async getReviews(reviewIds) {
				// This is a bit funky but trust me that it works.
				const queries = reviewIds.map(r => `reivew_${r}: Page { reviews(id: ${r}) { id, score } }`);
				const query = `{
					${queries.join('\n')}
				}`;

				try {
					const res = await anilist.helpers.request({
						url: 'https://graphql.anilist.co',
						method: 'POST',
						headers: {
							'content-type': 'application/json',
							accept: 'application/json',
						},
						timeout: 5000,
						data: JSON.stringify({
							query,
						}),
					});

					const { data } = JSON.parse(res.response);

					const reviews = Object.values(data).map(r => r.reviews[0]);
					return reviewIds.map(rId => {
						rId = parseInt(rId, 10);
						const review = reviews.find(r => r && r.id === rId);
						return review || { id: rId, score: null };
					});
				} catch (err) {
					// console.error(err);
				}
			},

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
			},

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
					href: `https://anilist.co/${isAnime ? 'anime' : 'manga'}/${aniListID}/`,
				});

				aniListLink.innerText = 'AniList';

				headerEl.append(aniListLink);
			},

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
						accept: 'application/json',
					},
					data: JSON.stringify({
						query,
						variables: { [fromIDName]: fromID, type },
					}),
				});

				const { data } = JSON.parse(res.response);
				return data.Media[toIDName] || false;
			},

			async getMalData(malID, isAnime = true) {
				try {
					const res = await anilist.helpers.request({
						url: `https://api.jikan.moe/v3/${isAnime ? 'anime' : 'manga'}/${malID}`,
						method: 'GET',
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
						accept: 'application/json',
					},
					data: JSON.stringify({
						query,
						variables: { username },
					}),
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
					options.ontimeout = err => reject(err);
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
			},

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
			},
		},

	};

	anilist.storage.init();

	const observer = new MutationObserver(() => {
		if (window.location.hostname === 'anilist.co') {
			if (anilist.helpers.page(/^\/(anime|manga)\/\d+\/[\w\d-_]+(\/)?$/)) {
				anilist.overview.init();
			}

			if (
				anilist.helpers.page(/^\/(anime|manga)\/\d+\/[\w\d-_]+(\/reviews)?$/) ||
				anilist.helpers.page(/^\/(home)?$/) ||
				anilist.helpers.page(/\/(reviews)?$/)
			) {
				anilist.reviewRatings.init();
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

			anilist.seasonal.init();
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
