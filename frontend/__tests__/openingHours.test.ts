import { isStoreOpen, getOpeningStatusText } from '@/helpers/openingHours'
import type { OpeningHours } from '@/types/store'

describe('openingHours', () => {
	let mockToLocaleTimeString: jest.SpyInstance
	let mockToLocaleDateString: jest.SpyInstance

	beforeEach(() => {
		mockToLocaleTimeString = jest.spyOn(Date.prototype, 'toLocaleTimeString')
		mockToLocaleDateString = jest.spyOn(Date.prototype, 'toLocaleDateString')
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	const mockTime = (time: string, weekday: string) => {
		mockToLocaleTimeString.mockImplementation((locale, options) => {
			if (options?.hour) return time
			return time
		})
		mockToLocaleDateString.mockImplementation((locale, options) => {
			if (options?.weekday) return weekday
			return weekday
		})
	}
	describe('isStoreOpen', () => {
		const openingHours: OpeningHours = {
			hours: {
				mon: [{ start: 660, end: 1350 }], // 11:00 - 22:30
				tue: [{ start: 660, end: 1350 }], // 11:00 - 22:30
				wed: [{ start: 660, end: 1350 }], // 11:00 - 22:30
				thu: [{ start: 660, end: 1350 }], // 11:00 - 22:30
				fri: [{ start: 660, end: 1410 }], // 11:00 - 23:30
				sat: [{ start: 720, end: 1410 }], // 12:00 - 23:30
				sun: [{ start: 720, end: 1320 }], // 12:00 - 22:00
			},
			timezone: 'Europe/Berlin',
		}

		it('should return true when store is open (weekday afternoon)', () => {
			// Monday 15:00 Berlin time
			mockTime('15:00', 'Mon')
			expect(isStoreOpen(openingHours)).toBe(true)
		})

		it('should return false when store is closed (before opening)', () => {
			// Monday 09:00 Berlin time
			mockTime('09:00', 'Mon')
			expect(isStoreOpen(openingHours)).toBe(false)
		})

		it('should return false when store is closed (after closing)', () => {
			// Monday 23:00 Berlin time
			mockTime('23:00', 'Mon')
			expect(isStoreOpen(openingHours)).toBe(false)
		})

		it('should return true at opening time', () => {
			// Monday 11:00 Berlin time
			mockTime('11:00', 'Mon')
			expect(isStoreOpen(openingHours)).toBe(true)
		})

		it('should return true just before closing', () => {
			// Monday 22:29 Berlin time
			mockTime('22:29', 'Mon')
			expect(isStoreOpen(openingHours)).toBe(true)
		})

		it('should return false when no opening hours', () => {
			expect(isStoreOpen(undefined)).toBe(false)
		})

		it('should return false when closed on that day', () => {
			const closedSunday: OpeningHours = {
				hours: {
					mon: [{ start: 660, end: 1350 }],
				},
				timezone: 'Europe/Berlin',
			}
			// Sunday 15:00 Berlin time
			mockTime('15:00', 'Sun')
			expect(isStoreOpen(closedSunday)).toBe(false)
		})
	})

	describe('isStoreOpen with midnight crossing', () => {
		const midnightCrossing: OpeningHours = {
			hours: {
				mon: [{ start: 660, end: 30 }], // 11:00 - 00:30 (next day)
				tue: [{ start: 660, end: 30 }],
				wed: [{ start: 660, end: 30 }],
				thu: [{ start: 660, end: 30 }],
				fri: [{ start: 660, end: 60 }], // 11:00 - 01:00 (next day)
			},
			timezone: 'Europe/Berlin',
		}

		it('should return true late at night before midnight crossing end', () => {
			// Tuesday 00:15 Berlin time (still open from Monday)
			mockTime('00:15', 'Tue')
			expect(isStoreOpen(midnightCrossing)).toBe(true)
		})

		it('should return false after midnight crossing end', () => {
			// Tuesday 00:45 Berlin time (closed, Monday hours ended at 00:30)
			mockTime('00:45', 'Tue')
			expect(isStoreOpen(midnightCrossing)).toBe(false)
		})

		it('should return true during evening hours', () => {
			// Monday 20:00 Berlin time
			mockTime('20:00', 'Mon')
			expect(isStoreOpen(midnightCrossing)).toBe(true)
		})
	})

	describe('isStoreOpen with lunch break', () => {
		const lunchBreak: OpeningHours = {
			hours: {
				mon: [
					{ start: 600, end: 840 }, // 10:00 - 14:00
					{ start: 1020, end: 1320 }, // 17:00 - 22:00
				],
				tue: [
					{ start: 600, end: 840 },
					{ start: 1020, end: 1320 },
				],
			},
			timezone: 'Europe/Berlin',
		}

		it('should return true during morning hours', () => {
			// Monday 12:00 Berlin time
			mockTime('12:00', 'Mon')
			expect(isStoreOpen(lunchBreak)).toBe(true)
		})

		it('should return false during lunch break', () => {
			// Monday 15:00 Berlin time
			mockTime('15:00', 'Mon')
			expect(isStoreOpen(lunchBreak)).toBe(false)
		})

		it('should return true during evening hours', () => {
			// Monday 19:00 Berlin time
			mockTime('19:00', 'Mon')
			expect(isStoreOpen(lunchBreak)).toBe(true)
		})

		it('should return false before first opening', () => {
			// Monday 09:00 Berlin time
			mockTime('09:00', 'Mon')
			expect(isStoreOpen(lunchBreak)).toBe(false)
		})

		it('should return false after last closing', () => {
			// Monday 23:00 Berlin time
			mockTime('23:00', 'Mon')
			expect(isStoreOpen(lunchBreak)).toBe(false)
		})
	})

	describe('getOpeningStatusText', () => {
		const openingHours: OpeningHours = {
			hours: {
				mon: [{ start: 660, end: 1350 }], // 11:00 - 22:30
				tue: [{ start: 660, end: 1350 }],
			},
			timezone: 'Europe/Berlin',
		}

		it('should show closing time when open', () => {
			// Monday 15:00 Berlin time
			mockTime('15:00', 'Mon')
			expect(getOpeningStatusText(openingHours)).toBe('Schließt um 22:30 Uhr')
		})

		it('should show opening time when closed but will open today', () => {
			// Monday 09:00 Berlin time
			mockTime('09:00', 'Mon')
			expect(getOpeningStatusText(openingHours)).toBe('Öffnet um 11:00 Uhr')
		})

		it('should show closed when past closing time', () => {
			// Monday 23:00 Berlin time
			mockTime('23:00', 'Mon')
			expect(getOpeningStatusText(openingHours)).toBe('Heute geschlossen')
		})

		it('should show closed when no hours for today', () => {
			// Sunday 15:00 Berlin time (not defined in hours)
			mockTime('15:00', 'Sun')
			expect(getOpeningStatusText(openingHours)).toBe('Heute geschlossen')
		})
	})

	describe('getOpeningStatusText with lunch break', () => {
		const lunchBreak: OpeningHours = {
			hours: {
				mon: [
					{ start: 600, end: 840 }, // 10:00 - 14:00
					{ start: 1020, end: 1320 }, // 17:00 - 22:00
				],
			},
			timezone: 'Europe/Berlin',
		}

		it('should show first closing time when open in morning', () => {
			// Monday 12:00 Berlin time
			mockTime('12:00', 'Mon')
			expect(getOpeningStatusText(lunchBreak)).toBe('Schließt um 14:00 Uhr')
		})

		it('should show second opening time when closed for lunch', () => {
			// Monday 15:00 Berlin time
			mockTime('15:00', 'Mon')
			expect(getOpeningStatusText(lunchBreak)).toBe('Öffnet um 17:00 Uhr')
		})

		it('should show second closing time when open in evening', () => {
			// Monday 19:00 Berlin time
			mockTime('19:00', 'Mon')
			expect(getOpeningStatusText(lunchBreak)).toBe('Schließt um 22:00 Uhr')
		})

		it('should show first opening time when before any opening', () => {
			// Monday 08:00 Berlin time
			mockTime('08:00', 'Mon')
			expect(getOpeningStatusText(lunchBreak)).toBe('Öffnet um 10:00 Uhr')
		})
	})

	describe('getOpeningStatusText with midnight crossing', () => {
		const midnightCrossing: OpeningHours = {
			hours: {
				mon: [{ start: 660, end: 30 }], // 11:00 - 00:30
				tue: [{ start: 660, end: 30 }], // Also has hours on Tuesday
			},
			timezone: 'Europe/Berlin',
		}

		it('should show closing time when open late at night', () => {
			// Monday 23:00 Berlin time
			mockTime('23:00', 'Mon')
			expect(getOpeningStatusText(midnightCrossing)).toBe(
				'Schließt um 00:30 Uhr',
			)
		})

		it('should show closing time after midnight', () => {
			// Tuesday 00:15 Berlin time (still in Tuesday's hours that go until 00:30)
			mockTime('00:15', 'Tue')
			expect(getOpeningStatusText(midnightCrossing)).toBe(
				'Schließt um 00:30 Uhr',
			)
		})
	})
})
