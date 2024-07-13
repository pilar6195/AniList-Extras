<div align="center">
	<img src="https://chibisafe.moe/pKK0BwTG.png" />
</div>

<br />

[![GitHub license](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://raw.githubusercontent.com/pilar6195/AniList-Extras/master/LICENSE)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/ahcnhicbflgjhemogkbiknblbogeemih?style=flat-square&label=Chrome%20Web%20Store)][chrome]
[![Mozilla Add-on Users](https://img.shields.io/amo/users/anilist-extras?style=flat-square&label=Mozilla%20Add-on)][firefox]
<!-- [![Chat / Support](https://img.shields.io/badge/Support-Discord-7289DA.svg?style=flat-square)](https://discord.gg/G6pRS4b) -->

## Current Features

- Modular design allowing easy addition of features.
- Settings page to enable/disable modules and configure their options (if any). Accessible at [https://anilist.co/settings/apps](https://anilist.co/settings/apps).
- Adds character data from MyAnimeList since most of the time AniList does not have a complete character list.
- Adds opening/ending themes data from MyAnimeList.
- Integrates MyAnimeList scores into AniList.
- Displays the total number of followers, following, forum threads, and comments on a user's social tab.
- Toggle option to display character lists as a grid (default) or as a list.
- Adds Reddit discussion links to anime or manga pages.
- Set default YouTube player volume.
- Hide global activity feed.
- Adds AniList links to MyAnimeList pages.
- And more!

## Installation

### Browser Extension

~~[**Chrome Web Store**][chrome]~~

~~[**Firefox Add-ons**][firefox]~~

> The browser extensions on the Chrome Web Store and Firefox Add-ons are currently outdated. Working out some issues getting them published. They will eventually be updated, but for now, please use the userscript instead.

### Userscript

[**Userscript**](https://github.com/pilar6195/AniList-Extras/releases/latest/download/anilist-extras.user.js)

> If the above link just opens/downloads the file, it means your browser lacks a userscript manager. If that's the case then install one like Tampermonkey or Violentmonkey with the links provided below and then click on the above link again to finish the AniList Extras installation process.

##### Getting Tampermonkey

- [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

##### Getting Violentmonkey

- [Chrome](https://chrome.google.com/webstore/detail/violent-monkey/jinjaccalgkegednnccohejagnlnfdag)
- [Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/eeagobfjdenkkddmbclomhiblgggliao)

## Building/Development

To build the userscript/extension, you need [Bun](https://bun.sh/).

1. Clone the repository.
2. Run `bun install` to install dependencies.
3. Run `bun run build` to build the project. Built assets will be in the `dist` directory.
	Unpackaged extension will be in the `.build` directory.
	* Use `bun run watch` to watch for changes and rebuild automatically.
	* Use `bun run watch:serve` to serve the userscript at `http://localhost:3000/anilist-extras.user.js` for easy development with Violentmonkey.

> Running `bun run watch` and `bun run watch:serve` will build with sourcemaps enabled for easier debugging. `bun run build` will not include sourcemaps by default but can be enabled by setting the `--include-sourcemap` flag.

> **Note: Since this project is primarily a userscript, the browser extension serves as a wrapper around it.
  Consequently, browser extension specific features/APIs cannot be used.**



## Planned Features (maybe)

- `/characters` support.

## Credits

- [Kana](https://github.com/Pitu) for the readme, banner, and script improvements.
- [Arkon](https://github.com/arkon) for contributing and adding new features.
- [duncanlang](https://github.com/duncanlang) for contributing and adding new features.
- [Jikan](https://jikan.moe/) for making interaction with the MAL API easier.


[chrome]: https://chrome.google.com/webstore/detail/ahcnhicbflgjhemogkbiknblbogeemih
[firefox]: https://addons.mozilla.org/en-US/firefox/addon/anilist-extras/
