let data = JSON.parse(localStorage.getItem('anilist-extras') ?? '{}');

export default {
	get(key: string, defaultValue?: any) {
		return data[key] ?? defaultValue;
	},

	getAll() {
		return data;
	},

	set(key: string, value: any) {
		data[key] = value;
		localStorage.setItem('anilist-extras', JSON.stringify(data));
	},

	remove(key: string) {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete data[key];
		localStorage.setItem('anilist-extras', JSON.stringify(data));
	},

	clear() {
		data = {};
		localStorage.removeItem('anilist-extras');
	},
};
