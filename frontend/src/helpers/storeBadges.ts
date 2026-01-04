import { BadgeType } from '@/components/badge/badgeConfig'
import { StoreBase } from '@/types/store'
import { isStoreOpen } from './openingHours'

/**
 * Determines which badges should be displayed for a given store
 * based on its properties (opening status, vegetarian options, halal, waiting time, payment methods)
 */
export function getStoreBadges(store: StoreBase): BadgeType[] {
	const badges: BadgeType[] = []

	// Opening status
	if (isStoreOpen(store.openingHours)) {
		badges.push(BadgeType.GEOEFFNET)
	} else {
		badges.push(BadgeType.GESCHLOSSEN)
	}

	// Vegetarian options
	if (store.vegetarian && store.vegetarian.includes('VEGAN')) {
		badges.push(BadgeType.VEGAN)
	}
	if (store.vegetarian && store.vegetarian.includes('VEGETARIAN')) {
		badges.push(BadgeType.VEGETARISCH)
	}

	// Halal
	if (store.halal && store.halal.includes('HALAL')) {
		badges.push(BadgeType.HALAL)
	} else if (store.halal && store.halal.includes('NOT_HALAL')) {
		badges.push(BadgeType.NICHT_HALAL)
	}

	// Waiting time
	if (store.waitingTime === 'FAST') {
		badges.push(BadgeType.SCHNELL)
	} else if (store.waitingTime === 'SLOW') {
		badges.push(BadgeType.LANGSAM)
	}

	// Payment methods
	if (store.paymentMethods) {
		if (store.paymentMethods.includes('CREDIT_CARD')) {
			badges.push(BadgeType.KARTENZAHLUNG)
		} else if (
			store.paymentMethods.length === 1 &&
			store.paymentMethods[0] === 'CASH_ONLY'
		) {
			badges.push(BadgeType.NUR_CASH)
		}
	}

	return badges
}
