import type { OpeningHours, Weekday } from '@/types/store'

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
	const [hours, minutes] = timeStr.split(':').map(Number)
	return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

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

	const currentMinutes = timeToMinutes(currentTime)

	// Check if current time is within any of today's time ranges
	return todayHours.some((range) => {
		// Handle times that cross midnight
		if (range.end < range.start) {
			// If end time is earlier than start (e.g., 660 - 30 for 11:00 - 00:30), it crosses midnight
			return currentMinutes >= range.start || currentMinutes <= range.end
		}
		return currentMinutes >= range.start && currentMinutes <= range.end
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

	const currentMinutes = timeToMinutes(currentTime)

	// Check if currently open in any time range
	for (const range of todayHours) {
		const crossesMidnight = range.end < range.start
		const isCurrentlyOpen = crossesMidnight
			? currentMinutes >= range.start || currentMinutes <= range.end
			: currentMinutes >= range.start && currentMinutes <= range.end

		if (isCurrentlyOpen) {
			return `Schließt um ${minutesToTime(range.end)} Uhr`
		}
	}

	// Not currently open - check when opens next
	for (const range of todayHours) {
		if (currentMinutes < range.start) {
			return `Öffnet um ${minutesToTime(range.start)} Uhr`
		}
	}

	// If we're past all time ranges for today
	return 'Heute geschlossen'
}
