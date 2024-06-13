import localforage from 'localforage';

type LocalForage = typeof localforage;

const Cache = {
	stores: {} as Record<string, LocalForage>,

	async getStore(storeName: string) {
		if (!this.stores[storeName]) {
			this.stores[storeName] = localforage.createInstance({ name: 'anilist-extras-cache', storeName, version: 1 });
			await this._cleanStore(this.stores[storeName]); // Make sure to clean out outdated cached items before use.
		}

		return this.stores[storeName];
	},

	async set(storeName: string, key: string, value: any, ttl: number) {
		if (typeof ttl !== 'number') {
			throw new TypeError('ttl is not a valid number.');
		}

		const store = await this.getStore(storeName);

		return store.setItem(key.toString(), {
			value,
			ttl: Date.now() + ttl,
		});
	},

	async get(storeName: string, key: string) {
		const store = await this.getStore(storeName);
		const item: any = await store.getItem(key.toString());

		if (!item) return;

		if (Date.now() > item.ttl) {
			await this.delete(storeName, key);
			return;
		}

		console.groupCollapsed('Cache Hit');
		console.info('Store Name:', storeName);
		console.info('Key:', key);
		console.info('Value:', item.value);
		console.info('Expires:', new Date(item.ttl).toLocaleString());
		console.trace();
		console.groupEnd();

		return item.value;
	},

	async delete(storeName: string, key: string) {
		const store = await this.getStore(storeName);
		return store.removeItem(key.toString());
	},

	async clear(storeName: string) {
		const store = await this.getStore(storeName);
		return store.clear();
	},

	async _cleanStore(store: LocalForage) {
		return store.iterate(async (value: any, key: string) => {
			if (Date.now() > value.ttl) {
				return store.removeItem(key);
			}
		});
	},

	async dropDatabase() {
		await localforage.dropInstance({ name: 'anilist-extras-cache' });
		this.stores = {};
	},
};

export default Cache;
