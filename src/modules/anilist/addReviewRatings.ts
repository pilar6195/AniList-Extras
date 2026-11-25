import Cache from '@/utils/Cache';
import { $, $$, waitFor, observe, createElement, anilistApi, isUI, jitterDuration } from '@/utils/Helpers';
import { ONE_HOUR, ONE_WEEK } from '@/utils/Constants';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';

import moduleStyles from '@/styles/addReviewRatings.scss';

type Review = {
	id: number;
	score: number | null;
};

// How long the mouse has to stay on a card before its score is fetched, so moving across cards doesn't fetch all of them.
const hoverFetchDelayMs = 250;

let running = false;
let observer: MutationObserver;
let reviewWrap: HTMLElement | null = null;

/**
 * Creates the badge for a review that hasn't been fetched yet. Hovering the card or clicking the badge loads the score.
 */
const createPlaceholderBadge = (): HTMLElement => createElement('p', {
	attributes: {
		class: 'alextras--review-score alextras--review-score-placeholder',
	},
	textContent: '?',
});

/**
 * Creates the badge showing a review's score, or a dash when the score couldn't be fetched.
 */
const createScoreBadge = (score: number | null): HTMLElement => {
	// The public api cannot fetch adult content without auth so it will return nothing
	if (score === null) {
		return createElement('p', {
			attributes: {
				class: 'alextras--review-score alextras--review-score-unavailable',
				title: 'Score unavailable. Reviews of adult media require authenticating with AniList.',
			},
			textContent: '—',
		});
	}

	return createElement('p', {
		attributes: {
			class: 'alextras--review-score',
		},
		styles: {
			background: score < 35
				? 'rgb(var(--color-red))'
				: score < 65
					? 'rgb(var(--color-orange))'
					: 'rgb(var(--color-green))',
		},
		textContent: score.toString(),
	});
};

/**
 * Replaces the badge shown on a review card.
 */
const showReviewBadge = (reviewContent: HTMLElement, badge: HTMLElement) => {
	reviewContent.querySelector('.alextras--review-score-container')?.remove();

	createElement('div', {
		attributes: {
			class: 'alextras--review-score-container',
		},
		children: [badge],
		appendTo: reviewContent,
	});
};

/**
 * Fetches a review's score from AniList and caches it.
 */
const fetchReview = async (reviewId: number): Promise<Review> => {
	// Using Page since it returns an empty list for reviews we can't access instead of an error.
	const { data } = await anilistApi(`
		query ($reviewId: Int) {
			Page {
				reviews(id: $reviewId) {
					id
					score
				}
			}
		}
	`, { reviewId }) as AnilistUserReviewsResponse;

	const review: Review = {
		id: reviewId,
		score: data.Page.reviews[0]?.score ?? null,
	};

	// Review scores rarely change, so cache them for about a week. Reviews without a score are only cached for about an hour
	const cacheTime = review.score === null ? ONE_HOUR : ONE_WEEK;
	await Cache.set('anilist-review', reviewId.toString(), review, jitterDuration(cacheTime));

	return review;
};

/**
 * Fetches and shows the score for a review card that's still showing its placeholder.
 */
const loadReviewScore = async (reviewContent: HTMLElement) => {
	if (reviewContent.dataset['reviewState'] !== 'placeholder') {
		return;
	}

	const reviewId = reviewContent.dataset['reviewId']!;
	const placeholder = reviewContent.querySelector('.alextras--review-score-placeholder');
	reviewContent.dataset['reviewState'] = 'loading';
	placeholder?.classList.add('alextras--review-score-loading');

	try {
		const review = await fetchReview(Number(reviewId));

		// Vue may have reused the card for a different review while the request was running.
		if (reviewContent.dataset['reviewId'] !== reviewId) {
			return;
		}

		reviewContent.dataset['reviewState'] = 'done';
		showReviewBadge(reviewContent, createScoreBadge(review.score));
	} catch (error) {
		console.error(error);

		// Go back to the placeholder so hovering again retries, unless the card now shows a different review.
		if (reviewContent.dataset['reviewId'] === reviewId) {
			reviewContent.dataset['reviewState'] = 'placeholder';
			placeholder?.classList.remove('alextras--review-score-loading');
		}
	}
};

/**
 * Loads a card's score once the mouse has stayed on it for a moment.
 */
const handleReviewHover = (event: PointerEvent) => {
	// Tapping also fires pointerover right before opening the review, so only the mouse counts as hovering.
	if (event.pointerType !== 'mouse' || !(event.target instanceof Element)) {
		return;
	}

	const reviewCard = event.target.closest<HTMLElement>('.review-card');
	const reviewContent = reviewCard?.querySelector<HTMLElement>('.content');

	if (!reviewCard || reviewContent?.dataset['reviewState'] !== 'placeholder') {
		return;
	}

	setTimeout(() => {
		if (reviewCard.matches(':hover')) {
			void loadReviewScore(reviewContent);
		}
	}, hoverFetchDelayMs);
};

/**
 * Clicking or tapping a placeholder loads the score instead of opening the review, since touch screens can't hover.
 */
const handlePlaceholderClick = (event: MouseEvent) => {
	if (!(event.target instanceof Element)) {
		return;
	}

	const placeholder = event.target.closest('.alextras--review-score-placeholder');
	const reviewContent = placeholder?.closest<HTMLElement>('.content');

	if (!reviewContent) {
		return;
	}

	// The badge is inside the card's link, so keep the click from opening the review.
	event.preventDefault();
	event.stopPropagation();
	void loadReviewScore(reviewContent);
};

/**
 * Adds a badge to new review cards: the cached score if there is one, otherwise a placeholder.
 */
const prepareReviewCards = async () => {
	if (running) {
		return;
	}

	running = true;

	try {
		for (const reviewCard of $$('.review-wrap .review-card')) {
			const reviewContent: HTMLElement = reviewCard.querySelector('.content')!;
			let reviewId = reviewCard.getAttribute('href') ?? reviewContent.getAttribute('href');
			reviewId = reviewId!.replace(/\D+/, '');

			// Vue may reuse a card for a different review, so only skip cards that already show this review.
			if (reviewContent.dataset['reviewId'] === reviewId) {
				continue;
			}

			const cachedReview = await Cache.get('anilist-review', reviewId) as Review | undefined;

			reviewContent.dataset['reviewId'] = reviewId;
			reviewContent.dataset['reviewState'] = cachedReview ? 'done' : 'placeholder';
			showReviewBadge(reviewContent, cachedReview ? createScoreBadge(cachedReview.score) : createPlaceholderBadge());
		}
	} catch (error) {
		console.error(error);
	} finally {
		running = false;
	}
};

registerModule.anilist({
	id: 'addReviewRatings',
	name: 'Review Ratings',
	description: 'Adds the review ratings to the review cards on the homepage and review pages.',
	notice: `
		Hover over a review or tap its "?" badge to load its score.
		Scores are cached for about a week to avoid API rate limits.
		Reviews for media marked as "Adult" cannot be fetched without authenticating
		with AniList due to API restrictions. You can authenticate below.
	`,
	tags: [
		ModuleTags.Media,
		ModuleTags.Metadata,
	],
	toggleable: true,
	styles: moduleStyles,

	validate({ currentPage }) {
		return (currentPage.pathname.startsWith('/home') && isUI.desktop) // Starts with /home. More than likely the user is on the homepage.
			|| currentPage.pathname.endsWith('/reviews') // Ends with /reviews. Either on the overall reviews or anime reviews page.
			|| /^\/(anime|manga)\/\d+\/.+\/?$/.test(currentPage.pathname); // Reviews also appear on the base anime/manga pages
	},

	async load() {
		const targetLoaded = await waitFor('.review-wrap');

		// If the target element is not found, return.
		if (!targetLoaded) {
			return;
		}

		reviewWrap = $('.review-wrap')!;
		observer = observe(reviewWrap, () => void prepareReviewCards());
		reviewWrap.addEventListener('pointerover', handleReviewHover);
		// Capture phase so this runs before the card's link handles the click.
		reviewWrap.addEventListener('click', handlePlaceholderClick, { capture: true });
		void prepareReviewCards();
	},

	unload() {
		observer?.disconnect();
		reviewWrap?.removeEventListener('pointerover', handleReviewHover);
		reviewWrap?.removeEventListener('click', handlePlaceholderClick, { capture: true });
		reviewWrap = null;
		running = false;
	},
});
