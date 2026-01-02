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
	google_place_id: string
	address: string
	plus_code: string
	maps_url: string
}

export interface OpeningHours {
	monday: string
	tuesday: string
	wednesday: string
	thursday: string
	friday: string
	saturday: string
	sunday: string
}

export interface Review {
	id: string
	user: string
	date: string
	rating: number
	text: string
}

export interface Store {
	id: string
	name: string
	district: string
	location: Location
	rating: number
	price: number
	vegetarian: string[]
	halal: string
	waiting_time: string
	payment: string[]
	open_hours: string
	distance_from_me: number
	ai_summary: string
	opening_hours: OpeningHours
	ai_reviews: Review[]
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
