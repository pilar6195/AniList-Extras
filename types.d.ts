declare const ALEXTRAS_VERSION: string;

type AnilistUserIdResponse = {
	data: {
		User: {
			id: number;
		};
	};
};

type AnilistMediaIdResponse = {
	data: {
		Media: {
			id?: number;
			idMal?: number;
		};
	};
};

type AnilistUserFollowingResponse = {
	data: {
		Page: {
			pageInfo: {
				total: number;
			};
			following: {
				id: number;
			}[];
		};
	};
};

type AnilistUserFollowersResponse = {
	data: {
		Page: {
			pageInfo: {
				total: number;
			};
			followers: {
				id: number;
			}[];
		};
	};
};

type AnilistUserThreadsResponse = {
	data: {
		Page: {
			pageInfo: {
				total: number;
			};
			threads: {
				id: number;
			}[];
		};
	};

};

type AnilistUserThreadCommentsResponse = {
	data: {
		Page: {
			pageInfo: {
				total: number;
			};
			threadComments: {
				id: number;
			}[];
		};
	};
};

type AnilistUserReviewsResponse = {
	data: {
		[key: string]: {
			reviews: {
				id: number;
				score: number;
			}[];
		};
	}
};

type MalAnimeResponse = {
	data: {
		mal_id: number;
		url: string;
		images: {
			jpg: {
				image_url: string;
				small_image_url: string;
				large_image_url: string;
			};
			webp: {
				image_url: string;
				small_image_url: string;
				large_image_url: string;
			};
		};
		trailer: {
			youtube_id: string;
			url: string;
			embed_url: string;
		};
		approved: boolean;
		titles: {
			type: string;
			title: string;
		}[];
		title: string;
		title_english: string;
		title_japanese: string;
		title_synonyms: string[];
		type: string;
		source: string;
		episodes: number;
		status: string;
		airing: boolean;
		aired: {
			from: string;
			to: string;
			prop: {
				from: {
					day: number;
					month: number;
					year: number;
				};
				to: {
					day: number;
					month: number;
					year: number;
				};
				string: string;
			};
		};
		duration: string;
		rating: string;
		score: number;
		scored_by: number;
		rank: number;
		popularity: number;
		members: number;
		favorites: number;
		synopsis: string;
		background: string;
		season: string;
		year: number;
		broadcast: {
			day: string;
			time: string;
			timezone: string;
			string: string;
		};
		producers: {
			mal_id: number;
			type: string;
			name: string;
			url: string;
		}[];
		licensors: {
			mal_id: number;
			type: string;
			name: string;
			url: string;
		}[];
		studios: {
			mal_id: number;
			type: string;
			name: string;
			url: string;
		}[];
		genres: {
			mal_id: number;
			type: string;
			name: string;
			url: string;
		}[];
		explicit_genres: {
			mal_id: number;
			type: string;
			name: string;
			url: string;
		}[];
		themes: {
			mal_id: number;
			type: string;
			name: string;
			url: string;
		}[];
		demographics: {
			mal_id: number;
			type: string;
			name: string;
			url: string;
		}[];
	};
};

type MalAnimeThemesResponse = {
	data: MalAnimeThemes;
};

type MalCharactersResponse = {
	data: MalCharacter[];
};

type MalAnimeThemes = {
	openings: string[];
	endings: string[];
};

type MalCharacter = {
	character: {
		mal_id: number;
		url: string;
		images: {
			jpg: {
				image_url: string;
			};
			webp: {
				image_url: string;
				small_image_url: string;
			};
		};
		name: string;
	};
	role: string;
	favorites: number;
	voice_actors: {
		person: {
			mal_id: number;
			url: string;
			images: {
				jpg: {
					image_url: string;
				};
			};
			name: string;
		};
		language: string;
	}[];
};

type AnilistModuleLoadParams = {
	currentPage: URL;
	previousPage: URL | undefined;
	media: {
		type: string | undefined;
		id: string | undefined;
		malId: number | false;
	};
};

type AnilistModuleUnloadParams = {
	currentPage: URL;
	previousPage: URL;
};

type ModuleSettingBase = {
	label: string;
	description?: string;
};

type ModuleSettingCheckbox = ModuleSettingBase & {
	type: 'checkbox';
	default?: boolean;
};

type ModuleSettingNumber = ModuleSettingBase & {
	type: 'number';
	default?: number;
};

type ModuleSettingSelect = ModuleSettingBase & {
	type: 'select';
	options: Record<string, string>;
	default?: string;
};

type ModuleSettingText = ModuleSettingBase & {
	type: 'password' | 'text' | 'textarea';
	default?: string;
};

type BaseModule = {
	/**
	 * Unique identifier for the module.
	 */
	id: string;
	/**
	 * Name of the module.
	 */
	name?: string,
	/**
	 * Description of the module.
	 */
	description?: string;
	/**
	 * Whether the module can be toggled on/off.
	 */
	togglable?: boolean;
	/**
	 * Options that will appear in the settings menu.
	 */
	settingsPage?: {
		[key: string]: ModuleSettingCheckbox | ModuleSettingNumber | ModuleSettingSelect | ModuleSettingText;
	}
	/**
	 * Whether the module is disabled by default.
	 */
	disabledDefault?: boolean;
	/**
	 * List of modules that this module depends on.
	 * This will hold the execution of the module until all dependencies are loaded.
	 * If all dependencies are not loaded within 10 seconds, the module will be skipped.
	 *
	 * This is not currently implemented.
	 */
	dependsOn?: string[];
};

type AnilistModule = BaseModule & {
	/**
	 * Return true if the module should be loaded on the current page.
	 */
	validate(params: AnilistModuleLoadParams): Promise<boolean> | boolean;
	/**
	 * Return true if the module should be unloaded on the current page.
	 */
	validateUnload?(params: AnilistModuleUnloadParams): Promise<boolean> | boolean;
	/**
	 * Code to run when the module is loaded.
	 */
	load(params: AnilistModuleLoadParams): Promise<void> | void;
	/**
	 * Code to run when the module is unloaded. Good for cleaning up.
	 * Provide the validateUnload method if you want to conditionally unload the module.
	 */
	unload?(params?: AnilistModuleUnloadParams): Promise<void> | void;
};

type MalModule = BaseModule & {
	/**
	 * Return true if the module should be loaded on the current page.
	 */
	validate(url: URL): Promise<boolean> | boolean;
	/**
	 * Code to run when the module is loaded.
	 */
	load(): Promise<void> | void;
};
