import type { OpeningHours, Weekday } from '@/types/store'

/**
 * Check if a store is currently open based on opening hours
 */
export function isStoreOpen(openingHours?: OpeningHours): boolean {
	if (!openingHours?.hours) return false

	const now = new Date()
	const timezone = openingHours.timezone || 'Europe/Berlin'

	// Get current time in the store's timezone
	const currentTime = now.toLocaleTimeString('de-DE', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

	// Get current weekday
	const weekdayIndex = now.toLocaleDateString('en-US', {
		timeZone: timezone,
		weekday: 'short',
	})
	const weekdayMap: Record<string, Weekday> = {
		Mon: 'mon',
		Tue: 'tue',
		Wed: 'wed',
		Thu: 'thu',
		Fri: 'fri',
		Sat: 'sat',
		Sun: 'sun',
	}
	const weekday = weekdayMap[weekdayIndex]

	const todayHours = openingHours.hours[weekday]
	if (!todayHours || todayHours.length === 0) return false

	// Check if current time is within any of today's time ranges
	return todayHours.some((range) => {
		return currentTime >= range.start && currentTime <= range.end
	})
}

/**
 * Get the text for opening/closing time display
 */
export function getOpeningStatusText(openingHours?: OpeningHours): string {
	if (!openingHours?.hours) return 'Öffnungszeiten unbekannt'

	const now = new Date()
	const timezone = openingHours.timezone || 'Europe/Berlin'

	// Get current time in the store's timezone
	const currentTime = now.toLocaleTimeString('de-DE', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

	// Get current weekday
	const weekdayIndex = now.toLocaleDateString('en-US', {
		timeZone: timezone,
		weekday: 'short',
	})
	const weekdayMap: Record<string, Weekday> = {
		Mon: 'mon',
		Tue: 'tue',
		Wed: 'wed',
		Thu: 'thu',
		Fri: 'fri',
		Sat: 'sat',
		Sun: 'sun',
	}
	const weekday = weekdayMap[weekdayIndex]

	const todayHours = openingHours.hours[weekday]
	if (!todayHours || todayHours.length === 0) return 'Heute geschlossen'

	// Find current or next time range
	for (const range of todayHours) {
		if (currentTime >= range.start && currentTime <= range.end) {
			return `Schließt um ${range.end} Uhr`
		}
		if (currentTime < range.start) {
			return `Öffnet um ${range.start} Uhr`
		}
	}

	// If we're past all time ranges for today
	return 'Heute geschlossen'
}
