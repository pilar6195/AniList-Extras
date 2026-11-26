import { sleep } from './Helpers';

type RateLimitRule = {
	maxCalls: number;
	intervalMs: number;
};

export default class RateLimit {
	private readonly queue: (() => Promise<void> | void)[] = [];

	private readonly limits: RateLimitRule[];

	private readonly longestIntervalMs: number;

	private readonly label: string | undefined;

	// When each recent callback started, oldest first. Kept for as long as the longest limit's interval.
	private readonly recentStartTimes: number[] = [];

	private processing: boolean = false;

	private pausedUntil: number = 0;

	/**
	 * Creates a new RateLimit instance. Callbacks only start when every limit has room,
	 * e.g. `{ maxCalls: 4, intervalMs: 1000 }` allows at most 4 callbacks to start within any second.
	 */
	public constructor({ label, limits }: { label?: string; limits: RateLimitRule[]; }) {
		this.label = label;
		this.limits = limits;
		this.longestIntervalMs = Math.max(...limits.map(limit => limit.intervalMs));
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
			console.log(this.logPrefix, 'Queued callback. Callbacks waiting:', this.queue.length);
			void this.processQueue();
		});
	}

	/**
	 * Holds back every queued callback for the given time, e.g. after the API says we're rate limited.
	 * Callbacks that already started aren't affected.
	 */
	public pause(durationMs: number): void {
		this.pausedUntil = Math.max(this.pausedUntil, Date.now() + durationMs);
	}

	/**
	 * Drains the queue. Callbacks start right away while every limit has room and it isn't paused, otherwise it sleeps until then.
	 * Every limit is a sliding window, so unlike a fixed window, two windows' worth of callbacks can never run back to back.
	 */
	private async processQueue(): Promise<void> {
		if (this.processing) {
			return;
		}

		this.processing = true;

		while (this.queue.length > 0) {
			const now = Date.now();
			this.forgetExpiredStartTimes(now);
			const waitTime = Math.max(this.pausedUntil - now, this.getWaitTime(now));

			if (waitTime > 0) {
				console.log(`${this.logPrefix} Waiting for ${waitTime}ms before starting the next callback.`);
				await sleep(waitTime);
				continue;
			}

			this.recentStartTimes.push(now);
			const callback = this.queue.shift()!;
			console.log(this.logPrefix, `Starting callback. Remaining: ${this.describeRemainingCalls(now)}. Callbacks still waiting: ${this.queue.length}`);
			// Not awaited, so one slow callback doesn't hold up the rest. The wrapper from push() handles its result and errors.
			void callback();
		}

		this.processing = false;
	}

	/**
	 * How long until every limit has room for another callback. 0 means one can start now.
	 */
	private getWaitTime(now: number): number {
		const waitTimes = this.limits.map(({ maxCalls, intervalMs }) => {
			const startsInInterval = this.getStartsInInterval(now, intervalMs);

			if (startsInInterval.length < maxCalls) {
				return 0;
			}

			// The start that has to leave the interval before there's room again.
			return startsInInterval[startsInInterval.length - maxCalls] + intervalMs - now;
		});

		return Math.max(0, ...waitTimes);
	}

	/**
	 * Describes how many more callbacks each limit allows right now, e.g. "3/4 per 1100ms, 29/30 per 60100ms".
	 */
	private describeRemainingCalls(now: number): string {
		return this.limits.map(({ maxCalls, intervalMs }) => {
			return `${maxCalls - this.getStartsInInterval(now, intervalMs).length}/${maxCalls} per ${intervalMs}ms`;
		}).join(', ');
	}

	/**
	 * The start times that are still inside the given interval, oldest first.
	 */
	private getStartsInInterval(now: number, intervalMs: number): number[] {
		return this.recentStartTimes.filter(startTime => now - startTime < intervalMs);
	}

	/**
	 * Drops start times older than the longest interval, since no limit counts them anymore.
	 */
	private forgetExpiredStartTimes(now: number): void {
		while (this.recentStartTimes.length > 0 && now - this.recentStartTimes[0] >= this.longestIntervalMs) {
			this.recentStartTimes.shift();
		}
	}
}
