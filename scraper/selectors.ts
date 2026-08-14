export const selectors = {
    cookieAccept: '[data-testid="accept-btn"], button:has-text("Accept"), #onetrust-accept-btn-handler',
    reviewsTab:
        'a:has-text("Guest reviews"), button:has-text("Guest reviews"), [data-testid="reviews-tab"], a:has-text("Read all reviews"), button:has-text("Read all reviews"), [data-testid="review-score-widget"], a[href*="#customer_reviews"]',
    reviewCard: '[data-testid="review-card"], div[data-review-id], .review_list_new_item_block',
    reviewRating: '[data-testid="review-score"], .bui-review-score__badge, .review-score-badge',
    reviewTitle: '[data-testid="review-title"], .c-review-block__title',
    reviewPositive: '[data-testid="review-positive-text"], .c-review__body:has-text("Liked"), .review_pos',
    reviewNegative: '[data-testid="review-negative-text"], .c-review__body:has-text("Disliked"), .review_neg',
    reviewDate: '[data-testid="review-date"], .c-review-block__date, time',
    reviewerName: '[data-testid="review-avatar-name"], .bui-avatar-block__title',
    reviewerCountry: '[data-testid="reviewer-country"], .bui-avatar-block__subtitle',
    roomType: '[data-testid="review-room-name"], .c-review-block__room-info-row',
    travellerType: '[data-testid="review-traveller-type"], .reviewer_type',
    nextPage: 'button[aria-label="Next page"], a:has-text("Next page"), .pagination-next',
    blockedIndicators: 'iframe[src*="captcha"], #challenge-form, text=Access denied, text=Verify you are human',
} as const

export const SCRAPE_CONFIG = {
    maxPages: 50,
    consecutiveKnownStop: 8,
    pageDelayMs: 1500,
    propertyDelayMs: 3000,
    retryDelaysMs: [1000, 3000, 10000],
} as const
