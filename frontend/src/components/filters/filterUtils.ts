/**
 * UI utility functions for filter components
 */

/**
 * Toggle an item in an array (add if not present, remove if present)
 */
export const toggleInArray = <T>(arr: T[], item: T): T[] =>
	arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]

/**
 * Default slider ranges for UI components
 */
export const UI_DEFAULTS = {
	min_score: 0,
	max_score: 100,

	price_min: 0,
	price_max: 30,

	sauce_amount_min: 0,
	sauce_amount_max: 100,

	meat_ratio_min: 0,
	meat_ratio_max: 100,
} as const
