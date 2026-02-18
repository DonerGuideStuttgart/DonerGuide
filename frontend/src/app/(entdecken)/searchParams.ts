import {
	DISTRICT_LABELS,
	HALAL_LABELS,
	OPEN_HOURS_LABELS,
	PAYMENT_LABELS,
	VEGETARIAN_LABELS,
	WAITING_TIME_LABELS,
} from '@/types/records'
import type {
	District,
	Halal,
	OpenHours,
	PaymentMethod,
	Vegetarian,
	WaitingTime,
} from '@/types/store'
import {
	createSearchParamsCache,
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
} from 'nuqs/server'

const districts = Object.keys(DISTRICT_LABELS) as District[]
const openHours = Object.keys(OPEN_HOURS_LABELS) as OpenHours[]
const vegetarians = Object.keys(VEGETARIAN_LABELS) as Vegetarian[]
const halals = Object.keys(HALAL_LABELS) as Halal[]
const waitingTimes = Object.keys(WAITING_TIME_LABELS) as WaitingTime[]
const payments = Object.keys(PAYMENT_LABELS) as PaymentMethod[]

// Pagination configuration
export const INITIAL_LIMIT = 20
export const LOAD_MORE_COUNT = 20

export const exploreParsers = {
	limit: parseAsInteger.withDefault(INITIAL_LIMIT),
	offset: parseAsInteger.withDefault(0),

	min_score: parseAsInteger,
	max_score: parseAsInteger,

	price_min: parseAsInteger,
	price_max: parseAsInteger,

	sauce_amount_min: parseAsInteger,
	sauce_amount_max: parseAsInteger,

	meat_ratio_min: parseAsInteger,
	meat_ratio_max: parseAsInteger,

	district: parseAsArrayOf(parseAsStringEnum(districts), ',').withDefault([]),
	open_hours: parseAsArrayOf(parseAsStringEnum(openHours), ',').withDefault([]),

	vegetarian: parseAsArrayOf(parseAsStringEnum(vegetarians), ',').withDefault(
		[],
	),
	halal: parseAsArrayOf(parseAsStringEnum(halals), ',').withDefault([]),
	waiting_time: parseAsArrayOf(
		parseAsStringEnum(waitingTimes),
		',',
	).withDefault([]),
	payment_methods: parseAsArrayOf(parseAsStringEnum(payments), ',').withDefault(
		[],
	),

	sort: parseAsString.withDefault(''),
}

export const exploreSearchParamsCache = createSearchParamsCache(exploreParsers)
