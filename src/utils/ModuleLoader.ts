export const anilistModules: Module[] = [];

export const malModules: Module[] = [];

export const registerModule = {
	anilist(module: Module) {
		anilistModules.push(module);
	},
	mal(module: Module) {
		malModules.push(module);
	},
};
