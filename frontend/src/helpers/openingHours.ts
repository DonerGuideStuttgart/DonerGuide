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
 * @param minutes - Minutes since midnight (0-1440+). Values >= 1440 represent times on the next day
 * @returns Time string in HH:MM format (00:00-23:59)
 * @example
 * minutesToTime(660) // "11:00"
 * minutesToTime(1470) // "00:30" (next day, 24:30 normalized to 00:30)
 * minutesToTime(1440) // "00:00" (exactly midnight next day)
 */
export function minutesToTime(minutes: number): string {
	// Handle values over 24 hours (next day) by normalizing to 0-1439 range
	const normalizedMinutes = minutes % 1440
	const hours = Math.floor(normalizedMinutes / 60)
	const mins = normalizedMinutes % 60
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Format time range from minutes
 * @param start - Start time in minutes since midnight (0-1440+)
 * @param end - End time in minutes since midnight (0-1440+)
 * @returns Formatted time range string (e.g., "11:00-22:30")
 * @example
 * formatTimeRange(660, 1350) // "11:00-22:30"
 * formatTimeRange(660, 30) // "11:00-00:30" (crosses midnight)
 */
export function formatTimeRange(start: number, end: number): string {
	return `${minutesToTime(start)}-${minutesToTime(end)}`
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
 * @param currentMinutes - Current time in minutes since midnight (0-1439)
 * @param start - Range start time in minutes since midnight (0-1440+)
 * @param end - Range end time in minutes since midnight (0-1440+), inclusive
 * @returns true if currentMinutes is within the range [start, end]
 * @throws Returns false for invalid ranges where start === end
 * @example
 * isTimeInRange(900, 600, 1200) // true (15:00 is between 10:00-20:00)
 * isTimeInRange(100, 1380, 60) // true (01:40 is between 23:00-01:00, crosses midnight)
 * isTimeInRange(100, 100, 100) // false (invalid 0-minute range)
 */
function isTimeInRange(
	currentMinutes: number,
	start: number,
	end: number,
): boolean {
	// Guard against invalid ranges where start equals end (0-minute range)
	if (start === end) {
		return false
	}

	// Handle times that cross midnight (e.g., 23:00 to 01:00)
	if (end < start) {
		return currentMinutes >= start || currentMinutes <= end
	}

	// Normal range within same day (end time is inclusive)
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
