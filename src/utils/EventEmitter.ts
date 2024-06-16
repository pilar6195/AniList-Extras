export type CustomEventListener = (...args: any[]) => void;

export default class EventEmitter {
	private events: { [key: string]: CustomEventListener[] } = {};

	public on(event: string, listener: CustomEventListener): void {
		if (!this.events[event]) {
			this.events[event] = [];
		}

		this.events[event].push(listener);
	}

	public off(event: string, listener: CustomEventListener): void {
		if (!this.events[event]) return;

		this.events[event] = this.events[event].filter(l => l !== listener);
	}

	public emit(event: string, ...args: any[]): void {
		if (!this.events[event]) return;

		for (const listener of this.events[event]) {
			listener.apply(this, args);
		}
	}

	public once(event: string, listener: CustomEventListener): void {
		const onceListener: CustomEventListener = (...args) => {
			this.off(event, onceListener);
			listener.apply(this, args);
		};

		this.on(event, onceListener);
	}
}
