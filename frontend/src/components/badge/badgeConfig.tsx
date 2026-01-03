import Clock from '@/assets/icons/clock.svg'
import Vegetarian from '@/assets/icons/vegetarian.svg'
import Vegan from '@/assets/icons/vegan.svg'
import Run from '@/assets/icons/run.svg'
import XCircle from '@/assets/icons/xcircle.svg'
import CreditCard from '@/assets/icons/creditcard.svg'
import Cash from '@/assets/icons/cash.svg'

export enum BadgeType {
	HALAL = 'halal',
	NICHT_HALAL = 'nichthalal',
	SCHNELL = 'schnell',
	LANGSAM = 'langsam',
	VEGETARISCH = 'vegetarisch',
	VEGAN = 'vegan',
	GEOEFFNET = 'geöffnet',
	GESCHLOSSEN = 'geschlossen',
	KARTENZAHLUNG = 'kartenzahlung',
	NUR_CASH = 'nurcash',
}

export const badgeConfig: Record<
	BadgeType,
	{ text: string; icon?: React.ReactNode; colorClass: string }
> = {
	[BadgeType.HALAL]: {
		text: 'Halal',
		colorClass: 'badge-success',
	},
	[BadgeType.NICHT_HALAL]: {
		text: 'Nicht Halal',
		colorClass: 'badge-secondary',
	},
	[BadgeType.SCHNELL]: {
		text: 'Schnell',
		icon: <Run className="size-4 fill-success" />,
		colorClass: 'badge-success',
	},
	[BadgeType.LANGSAM]: {
		text: 'Langsam',
		colorClass: 'badge-secondary',
	},
	[BadgeType.VEGETARISCH]: {
		text: 'Vegetarisch',
		icon: <Vegetarian className="size-4" />,
		colorClass: 'badge-success',
	},
	[BadgeType.VEGAN]: {
		text: 'Vegan',
		icon: <Vegan className="size-4 fill-success" />,
		colorClass: 'badge-success',
	},
	[BadgeType.GEOEFFNET]: {
		text: 'Geöffnet',
		icon: <Clock className="size-4" />,
		colorClass: 'badge-success',
	},
	[BadgeType.GESCHLOSSEN]: {
		text: 'Geschlossen',
		icon: <XCircle className="size-4 fill-secondary" />,
		colorClass: 'badge-secondary',
	},
	[BadgeType.KARTENZAHLUNG]: {
		text: 'Kartenzahlung',
		icon: <CreditCard className="size-4 fill-success" />,
		colorClass: 'badge-success',
	},
	[BadgeType.NUR_CASH]: {
		text: 'Nur Cash',
		icon: <Cash className="size-4 fill-secondary" />,
		colorClass: 'badge-secondary',
	},
}
