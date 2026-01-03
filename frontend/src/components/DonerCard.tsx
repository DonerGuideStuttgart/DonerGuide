import { routes } from '@/helpers/routes'
import { StoreBase } from '@/types/store'
import { BadgeType, badgeConfig } from './badge/badgeConfig'
import Badge from './badge/Badge'
import Link from 'next/link'
import Image from 'next/image'
import Aistars from '@/assets/icons/aistars.svg'
import InfoCircle from '@/assets/icons/infocircle.svg'
import CircleSolid from '@/assets/icons/circlesolid.svg'
import Location from '@/assets/icons/location.svg'
import { getOpeningStatusText, isStoreOpen } from '@/helpers/openingHours'
import { DISTRICT_LABELS } from '@/types/records'

export default function DonerCard({ store }: { store: StoreBase }) {
	const mainImage =
		store.imageUrls && store.imageUrls.length > 0 ? store.imageUrls[0] : null

	const isOpen = () => isStoreOpen(store.openingHours)

	// Helper to get badges based on store data
	const getBadges = () => {
		const badges: BadgeType[] = []

		// Opening status
		if (isOpen()) {
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
			if (
				store.paymentMethods.includes('CREDIT_CARD') ||
				store.paymentMethods.length > 1
			) {
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

	const badges = getBadges()
	const openClosingText = getOpeningStatusText(store.openingHours)

	return (
		<Link href={routes.storeDetail(store.slug)} className="block">
			<article className="flex flex-col md:flex-row justify-between border border-primary bg-base-100 hover:bg-base-200 rounded-xl gap-4 p-6">
				<div className="w-full space-y-2 order-last md:order-first">
					{/* Header with name and score */}
					<div className="flex items-center gap-3">
						<h3 className="text-lg font-bold">{store.name}</h3>
						<div
							className="flex items-center gap-2 tooltip tooltip-primary"
							data-tip="Dieser Score wird von unserer KI generiert basierend auf verschiedenen Faktoren wie Qualität, Preis-Leistungs-Verhältnis und Geschmack." // TODO: Hier richtige faktoren einfügen
						>
							<Badge
								text={store.aiScore.toString()}
								icon={<Aistars className="size-4 fill-secondary" />}
								className="badge-secondary"
							/>
							<InfoCircle className="size-4" />
						</div>
					</div>
					{/* Header with name and score End */}

					{/* Closing/Opening Hour Today & Price */}
					<div className="flex items-center">
						<div className="text-neutral text-sm">{openClosingText}</div>
						<CircleSolid className="size-1 fill-neutral mx-2" />
						{store.price && (
							<div className="text-neutral text-sm">
								Döner Preis {store.price}€
							</div>
						)}
					</div>
					{/* Closing/Opening Hour Today & Price End */}

					{/* District */}
					<div className="flex items-center gap-2 mb-4">
						<Location className="size-4 fill-neutral" />
						<p className="text-neutral text-sm">
							{store.district && DISTRICT_LABELS[store.district]
								? DISTRICT_LABELS[store.district]
								: store.district}
						</p>
					</div>
					{/* District End */}

					{/* Badges */}
					<div className="flex flex-wrap grid-cols-2 gap-2">
						{badges.map((badgeType) => {
							const config = badgeConfig[badgeType]
							return (
								<Badge
									key={badgeType}
									text={config.text}
									icon={config.icon}
									className={`${config.colorClass}`}
								/>
							)
						})}
					</div>
					{/* Badges End */}
				</div>

				{/* Image */}
				{mainImage ? (
					<Image
						src={mainImage}
						alt={store.name}
						loading="eager"
						width={128}
						height={128}
						className="object-cover w-full h-50 md:size-32 rounded-lg"
					/>
				) : (
					<div className="hidden md:block md:min-w-24 md:size-24"></div>
				)}
				{/* Image End */}
			</article>
		</Link>
	)
}

export function DonerCardSkeleton() {
	return (
		<article className="border rounded-lg p-4 shadow-sm animate-pulse mt-3">
			<div className="h-6 bg-neutral-content/30 rounded w-3/4 mb-2"></div>
			<div className="h-4 bg-neutral-content/30 rounded w-1/4 mb-4"></div>
			<div className="flex items-center justify-between mb-4">
				<div className="h-4 bg-neutral-content/30 rounded w-20"></div>
				<div className="h-4 bg-neutral-content/30 rounded w-16"></div>
			</div>
			<div className="h-4 bg-neutral-content/30 rounded w-5/6"></div>
		</article>
	)
}
