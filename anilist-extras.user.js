/* global GM_xmlhttpRequest */
// ==UserScript==
// @name         AniList Extras
// @namespace    https://github.com/pilar6195
// @version      0.4.4
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

	const $ = a => document.querySelector(a);
	const $$ = a => document.querySelectorAll(a);

	GM_addStyle('.hidden { display:none !important; }'); // eslint-disable-line

	const observer = new MutationObserver(() => {
		if (/anime\/\d+/.test(location.pathname)) {
			init();
		}
	});
	observer.observe(document, { childList: true, subtree: true });

	document.addEventListener('DOMContentLoaded', () => {
		if (/anime\/\d+/.test(location.pathname)) {
			init();
		}
	});

	let running = false;

	function stopRunning() {
		running = false;
	}

	async function init() {
		if (running) return null;
		running = true;

		// AniList
		if ($('.overview')) {
			const malID = await getMalID();
			if (!malID) return stopRunning();

			addMalLink(malID);
			await displayCharacters(malID);
			await displayOpEd(malID);
		}

		// MAL
		if ($('[itemtype="http://schema.org/Product"]')) {
			const aniListID = await getAnilistID();
			if (!aniListID) return stopRunning();

			addAniListLink(aniListID);
		}

		return stopRunning();
	}

	function addMalLink(malID) {
		if ($('.MyAnimeList')) return;

		const extLinksEl = $('.external-links');

		if (!extLinksEl) return;

		const attrEl = $('.external-links > a');

		if (!attrEl) return;

		const attrName = attrEl.attributes[0].name;

		const malLink = createElement('a', {
			[attrName]: '',
			class: 'external-link MyAnimeList',
			target: '_blank',
			href: `https://myanimelist.net/anime/${malID}/`
		});

		malLink.innerText = 'MyAnimeList';

		extLinksEl.append(malLink);
	}

	function addAniListLink(aniListID) {
		if ($('.AniListLink')) return;

		const extLinksEl = $('.pb16');

		if (!extLinksEl) return;

		if (extLinksEl.children.length > 0) {
			const separatorNode = document.createTextNode(', ');

			extLinksEl.append(separatorNode);
		}

		const aniListLink = createElement('a', {
			class: 'AniListLink',
			target: '_blank',
			href: `https://anilist.co/anime/${aniListID}/`
		});

		aniListLink.innerText = 'AniList';

		extLinksEl.append(aniListLink);
	}

	async function displayCharacters(malID) {
		try {
			if ($('.malCharacters')) return;

			const res = await request({
				url: `https://api.jikan.moe/v3/anime/${malID}/characters_staff`,
				method: 'GET'
			});

			const characterData = JSON.parse(res.response);

			if (!characterData.characters.length) return;

			const charContainer = createElement('div', { class: 'malCharacters' }, { marginBottom: '30px' });
			const charHeader = createElement('h2', { class: 'link' });
			const charGrid = createElement('div', { class: 'grid-wrap' });

			charHeader.innerText = 'MAL Characters';

			const attrEl = $('.overview > .characters .character')
				? $('.overview > .characters .character')
				: $('.overview > .staff .staff');

			if (!attrEl) return;

			const attrName = attrEl.attributes[0].name;

			for (const index in characterData.characters) {
				const character = characterData.characters[index];

				const charCard = createElement('div', {
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
				charGrid.append(charCard);
			}

			charContainer.append(charHeader, charGrid);

			if (characterData.characters.length > 12) {
				const toggleCharacters = createElement('div', {}, { marginTop: '10px', textAlign: 'center' });
				const button = createElement('a', { id: 'toggleCharacters', href: 'javascript:void(0);', 'data-visible': '0' });
				button.innerText = 'Show more';
				toggleCharacters.append(button);
				charContainer.append(toggleCharacters);
			}

			const targetEl = $('.overview > .characters') || $('.overview > .staff');
			targetEl.insertAdjacentHTML('beforebegin', charContainer.outerHTML);

			if ($('#toggleCharacters')) {
				$('#toggleCharacters').addEventListener('click', function() {
					$$('.malCharacters .showmore').forEach(a => {
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
			}

			/* Toggles */
			if ($('.characters')) {
				$('.characters .link').remove(); // This is to remove the click listener
				$('.characters .grid-wrap').insertAdjacentHTML('beforebegin', '<h2 class="link">AniList Characters</h2>');

				$('.characters .link').addEventListener('click', () => {
					event.preventDefault();
					$('.characters').style.display = 'none';
					$('.malCharacters').style.display = 'block';
					localStorage.setItem('hidden', 'anilist');
				});

				$('.malCharacters .link').addEventListener('click', () => {
					$('.malCharacters').style.display = 'none';
					$('.characters').style.display = 'block';
					localStorage.setItem('hidden', 'mal');
				});

				if (localStorage.getItem('hidden') === 'anilist') {
					$('.characters').style.display = 'none';
				} else {
					$('.malCharacters').style.display = 'none';
				}
			}
		} catch (err) {
			console.error(err);
		}
	}

	async function displayOpEd(malID) {
		try {
			if ($('.openings')) return;
			const res = await request({
				url: `https://api.jikan.moe/v3/anime/${malID}`,
				method: 'GET'
			});

			const animeData = JSON.parse(res.response);

			/* == == */
			const attrEl = $('.sidebar > .tags .tag');
			if (!attrEl) return;
			const attrName = attrEl.attributes[0].name;
			/* == == */

			const opContainer = createElement('div', { class: 'openings' }, { marginBottom: '30px' });
			const opHeader = createElement('h2');
			opHeader.innerText = 'Openings';
			opContainer.append(opHeader);

			for (const index in animeData.opening_themes) {
				const song = animeData.opening_themes[index];
				const opCard = createElement('div', {
					[attrName]: '',
					class: `tag ${index > 5 ? 'showmore hidden' : ''}`
				}, { marginBottom: '10px' });
				opCard.innerText = `#${parseInt(index, 10) + 1}: ${song}`;
				opContainer.append(opCard);
			}

			if (animeData.opening_themes.length > 5) {
				const toggleOpenings = createElement('div', {}, { textAlign: 'center' });
				const button = createElement('a', { id: 'toggleOpenings', href: 'javascript:void(0);', 'data-visible': '0' });
				button.innerText = 'Show more';
				toggleOpenings.append(button);
				opContainer.append(toggleOpenings);
			}

			$('.overview > .staff').insertAdjacentHTML('beforebegin', opContainer.outerHTML);
			/* == == */

			const edContainer = createElement('div', { class: 'endings' }, { marginBottom: '30px' });
			const edHeader = createElement('h2');

			edHeader.innerText = 'Endings';
			edContainer.append(edHeader);

			for (const index in animeData.ending_themes) {
				const song = animeData.ending_themes[index];
				const edCard = createElement('div', {
					[attrName]: '',
					class: `tag ${index > 5 ? 'showmore hidden' : ''}`
				}, { marginBottom: '10px' });
				edCard.innerText = `#${parseInt(index, 10) + 1}: ${song}`;
				edContainer.append(edCard);
			}

			if (animeData.ending_themes.length > 5) {
				const toggleEndings = createElement('div', {}, { textAlign: 'center' });
				const button = createElement('a', { id: 'toggleEndings', href: 'javascript:void(0);', 'data-visible': '0' });
				button.innerText = 'Show more';
				toggleEndings.append(button);
				edContainer.append(toggleEndings);
			}

			$('.overview > .staff').insertAdjacentHTML('beforebegin', edContainer.outerHTML);

			/* == == */

			if ($('#toggleOpenings')) {
				$('#toggleOpenings').addEventListener('click', function() {
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
			}

			if ($('#toggleEndings')) {
				$('#toggleEndings').addEventListener('click', function() {
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
			}
		} catch (err) {
			console.error(err);
		}
	}

	/* == HELPERS == */

	function request(options) {
		return new Promise((resolve, reject) => {
			options.onload = res => resolve(res);
			options.onerror = err => reject(err);
			GM_xmlhttpRequest(options); // eslint-disable-line new-cap
		});
	}

	async function getMalID() {
		return getID('id', 'idMal');
	}

	async function getAnilistID() {
		return getID('idMal', 'id');
	}

	async function getID(fromIDName, toIDName) {
		const query = `query ($${fromIDName}: Int) { Media(${fromIDName}: $${fromIDName}, type: ANIME) { ${toIDName} } }`;
		let fromID = location.pathname.match(/anime\/(\d+)/);
		if (fromID === null) return false;

		fromID = parseInt(fromID[1], 10);

		const res = await request({
			url: 'https://graphql.anilist.co',
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json'
			},
			data: JSON.stringify({
				query,
				variables: { [fromIDName]: fromID }
			})
		});

		const { data } = JSON.parse(res.response);
		return data.Media[toIDName] || false;
	}

	function createElement(tag, attrs, styles) {
		var element = document.createElement(tag);
		for (var aKey in attrs) {
			element.setAttribute(aKey, attrs[aKey]);
		}
		for (var sKey in styles) {
			element.style[sKey] = styles[sKey];
		}
		return element;
	}
})();
