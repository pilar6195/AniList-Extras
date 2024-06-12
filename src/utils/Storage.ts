const data = JSON.parse(localStorage.getItem('anilist-extras') ?? '{}');

export default {
	get(key: string) {
		return data[key];
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
};
