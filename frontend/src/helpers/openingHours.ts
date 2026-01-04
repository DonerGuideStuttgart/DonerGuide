import { WEEKDAY_LABELS } from '@/types/records'
import type { OpeningHours, Weekday } from '@/types/store'

/** Weekday mapping */
const WEEKDAY_MAP: Record<string, Weekday> = {
	Mon: 'mon',
	Tue: 'tue',
	Wed: 'wed',
	Thu: 'thu',
	Fri: 'fri',
	Sat: 'sat',
	Sun: 'sun',
}

/** Weekdays with labels for display */
export const WEEKDAYS = (Object.keys(WEEKDAY_LABELS) as Weekday[]).map(
	(key) => ({
		key,
		label: WEEKDAY_LABELS[key],
	}),
)

/** Default timezone for opening hours */
const DEFAULT_TIMEZONE = 'Europe/Berlin'

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
export function minutesToTime(minutes: number): string {
	// Handle values over 24 hours (next day)
	const normalizedMinutes = minutes % 1440
	const hours = Math.floor(normalizedMinutes / 60)
	const mins = normalizedMinutes % 60
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Get current time info for a given timezone
 */
export function getCurrentTimeInfo(timezone: string): {
	currentTime: string
	weekday: Weekday
} {
	const now = new Date()

	const currentTime = now.toLocaleTimeString('de-DE', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})

	const weekdayShort = now.toLocaleDateString('en-US', {
		timeZone: timezone,
		weekday: 'short',
	})

	return {
		currentTime,
		weekday: WEEKDAY_MAP[weekdayShort] ?? 'mon',
	}
}

/**
 * Check if a given time (in minutes) is within a time range
 */
function isTimeInRange(
	currentMinutes: number,
	start: number,
	end: number,
): boolean {
	// Handle times that cross midnight
	if (end < start) {
		return currentMinutes >= start || currentMinutes <= end
	}
	return currentMinutes >= start && currentMinutes <= end
}

/**
 * Check if a store is currently open based on opening hours
 */
export function isStoreOpen(openingHours?: OpeningHours): boolean {
	if (!openingHours?.hours) return false

	const timezone = openingHours.timezone ?? DEFAULT_TIMEZONE
	const { currentTime, weekday } = getCurrentTimeInfo(timezone)
	const todayHours = openingHours.hours[weekday]

	if (!todayHours || todayHours.length === 0) return false

	const currentMinutes = timeToMinutes(currentTime)

	return todayHours.some((range) =>
		isTimeInRange(currentMinutes, range.start, range.end),
	)
}

/**
 * Get the text for opening/closing time display
 */
export function getOpeningStatusText(openingHours?: OpeningHours): string {
	if (!openingHours?.hours) return 'Öffnungszeiten unbekannt'

	const timezone = openingHours.timezone ?? DEFAULT_TIMEZONE
	const { currentTime, weekday } = getCurrentTimeInfo(timezone)
	const todayHours = openingHours.hours[weekday]

	if (!todayHours || todayHours.length === 0) return 'Heute geschlossen'

	const currentMinutes = timeToMinutes(currentTime)

	// Check if currently open in any time range
	for (const range of todayHours) {
		if (isTimeInRange(currentMinutes, range.start, range.end)) {
			return `Schließt um ${minutesToTime(range.end)} Uhr`
		}
	}

	// Not currently open - find next opening time today
	for (const range of todayHours) {
		if (currentMinutes < range.start) {
			return `Öffnet um ${minutesToTime(range.start)} Uhr`
		}
	}

	return 'Heute geschlossen'
}
