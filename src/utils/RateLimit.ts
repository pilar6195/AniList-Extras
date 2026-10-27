import { sleep } from './Helpers';

export default class RateLimit {
	private readonly queue: (() => Promise<void> | void)[] = [];

	private readonly rateLimit: number;

	private readonly interval: number;

	private tokens: number;

	private readonly label: string | undefined;

	private lastRefill: number = Date.now();

	private processing: boolean = false;

	/**
	 * Creates a new RateLimit instance with the given token count and refill interval in milliseconds.
	 */
	public constructor(rateLimit: number, interval: number, label?: string) {
		this.rateLimit = rateLimit;
		this.interval = interval;
		this.tokens = rateLimit;
		this.label = label;
	}

	private get logPrefix(): string {
		return this.label ? `RateLimit (${this.label}):` : 'RateLimit:';
	}

	/**
	 * Queues a callback and returns a promise that settles with its result.
	 * The caller's stack is snapshotted synchronously and attached as the
	 * error's `cause`, so queue-side failures point back at the real call site.
	 */
	public async push<T>(callback: () => Promise<T> | T): Promise<T> {
		// eslint-disable-next-line unicorn/error-message
		const callSite = new Error();
		callSite.name = 'Queued callback';
		// eslint-disable-next-line @typescript-eslint/unbound-method
		Error.captureStackTrace?.(callSite, this.push);
		const isV8Stack = /\n\s+at\s/.test(callSite.stack ?? '');

		console.log(this.logPrefix, 'Pushing new callback to queue. Tokens available:', this.tokens);

		return new Promise<T>((resolve, reject) => {
			this.queue.push(async () => {
				try {
					resolve(await callback());
				} catch (error) {
					if (isV8Stack && error instanceof Error && error.cause === undefined) {
						error.cause = callSite;
					}

					reject(error);
				}
			});
			void this.processQueue();
		});
	}

	/**
	 * Drains the queue, executing callbacks as tokens permit and sleeping when exhausted.
	 */
	private async processQueue(): Promise<void> {
		if (this.processing) return;
		this.processing = true;

		while (this.queue.length > 0) {
			this.refillTokens();

			if (this.tokens >= 1) {
				this.tokens--;
				const callback = this.queue.shift();
				if (callback) {
					try {
						console.log(this.logPrefix, 'Executing callback from queue. Tokens left:', this.tokens);
						await callback();
					} catch (error) {
						console.error(this.logPrefix, 'Callback failed inside queue:', error);
					}
				}
			} else {
				const timePerToken = this.interval / this.rateLimit;
				const now = Date.now();
				const timeSinceRefill = now - this.lastRefill;
				const waitTime = timePerToken - (timeSinceRefill % timePerToken);

				console.log(`${this.logPrefix} No tokens available. Waiting for ${waitTime}ms before retrying.`);

				await sleep(waitTime);
			}
		}

		this.processing = false;
	}

	/**
	 * Gradually refills tokens proportional to elapsed time, preventing fixed-window bursts.
	 */
	private refillTokens(): void {
		const now = Date.now();
		const diff = now - this.lastRefill;
		const tokensToAdd = Math.floor((diff / this.interval) * this.rateLimit);

		if (tokensToAdd > 0) {
			this.tokens = Math.min(this.rateLimit, this.tokens + tokensToAdd);
			this.lastRefill += tokensToAdd * (this.interval / this.rateLimit);
		}
	}
}
