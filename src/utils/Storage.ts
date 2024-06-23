/* eslint-disable @typescript-eslint/no-dynamic-delete */
import EventEmitter from './EventEmitter';

const data = JSON.parse(localStorage.getItem('anilist-extras') ?? '{}');


export default {
	emitter: new EventEmitter(),

	get(key: string, defaultValue?: any) {
		return structuredClone(data[key] ?? defaultValue);
	},

	getAll() {
		return data;
	},

	set(key: string, value: any) {
		const previousValue = this.get(key);
		data[key] = value;
		localStorage.setItem('anilist-extras', JSON.stringify(data));
		this.emitter.emit('storage:update', key, value, previousValue);
	},

	remove(key: string) {
		const previousValue = this.get(key);
		delete data[key];
		localStorage.setItem('anilist-extras', JSON.stringify(data));
		this.emitter.emit('storage:update', key, undefined, previousValue);
	},

	clear() {
		delete data.settings;
		delete data.moduleStates;
		localStorage.setItem('anilist-extras', JSON.stringify(data));
		this.emitter.emit('storage:update', null, null, null);
	},

	/**
	 * Watch for changes to a specific key.
	 *
	 * @param key - The key to watch.
	 * @param callback - The callback to run when the key changes.
	 * @returns A function to stop watching the key.
	 */
	watch(key: string, callback: (newValue: any, previousValue: any) => void) {
		const listener = (eventKey: string | null, newValue: any, previousValue: any) => {
			if (eventKey === key) {
				callback(newValue, previousValue);
			} else if (eventKey === null) {
				callback(null, null);
			}
		};

		this.emitter.on('storage:update', listener);
		return () => this.emitter.off('storage:update', listener);
	},
};
