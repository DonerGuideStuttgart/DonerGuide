import {
	DISTRICT_LABELS,
	HALAL_LABELS,
	OPEN_HOURS_LABELS,
	PAYMENT_LABELS,
	VEGETARIAN_LABELS,
	WAITING_TIME_LABELS,
} from './records'

export interface Location {
	coordinates: {
		lat: number
		lng: number
	}
	address: {
		postalCode: string
		locality: string
		sublocality: string
		streetAddress: string
	}
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type OpeningHours = {
	// start and end are minutes since midnight (0-1439)
	// Example: 10:00 = 600, 14:30 = 870, 23:45 = 1425
	hours: Partial<Record<Weekday, { start: number; end: number }[]>>
	timezone?: string // z.B. "Europe/Berlin"
}

export type StoreBase = {
	slug: string
	imageUrls: string[]
	name: string
	phone?: string
	district?: string
	location: Location
	aiScore: number
	price?: number
	vegetarian?: string[]
	halal?: string[]
	waitingTime?: string
	paymentMethods?: string[]
	sauceAmount?: number
	meatRatio?: number
	openingHours: OpeningHours
}

export type Store = StoreBase & {
	aiSummary: string
}

// Filter Types
type KeysOf<T> = Extract<keyof T, string>
export type District = KeysOf<typeof DISTRICT_LABELS>
export type OpenHours = KeysOf<typeof OPEN_HOURS_LABELS>
export type Vegetarian = KeysOf<typeof VEGETARIAN_LABELS>
export type Halal = KeysOf<typeof HALAL_LABELS>
export type WaitingTime = KeysOf<typeof WAITING_TIME_LABELS>
export type PaymentMethod = KeysOf<typeof PAYMENT_LABELS>

export type FilterParams = {
	limit: number
	offset: number

	min_score?: number
	max_score?: number

	price_min?: number
	price_max?: number

	district?: District[]
	open_hours?: OpenHours[]

	vegetarian?: Vegetarian[]
	halal?: Halal[]
	waiting_time?: WaitingTime[]
	payment_methods?: PaymentMethod[]

	sauce_amount_min?: number
	sauce_amount_max?: number

	meat_ratio_min?: number
	meat_ratio_max?: number
}
