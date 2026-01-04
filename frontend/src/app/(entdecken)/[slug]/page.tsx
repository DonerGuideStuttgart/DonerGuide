import Aistars from '@/assets/icons/aistars.svg'
import ChevronLeft from '@/assets/icons/chevronleft.svg'
import CircleSolid from '@/assets/icons/circlesolid.svg'
import Clock from '@/assets/icons/clock.svg'
import InfoCircle from '@/assets/icons/infocircle.svg'
import Location from '@/assets/icons/location.svg'
import Phone from '@/assets/icons/phone.svg'
import Badge from '@/components/badge/Badge'
import { badgeConfig } from '@/components/badge/badgeConfig'
import { fetchPlaceBySlug, fetchPlaces } from '@/helpers/api'
import {
	getCurrentTimeInfo,
	getOpeningStatusText,
	isStoreOpen,
	minutesToTime,
	WEEKDAYS,
} from '@/helpers/openingHours'
import { routes } from '@/helpers/routes'
import { getStoreBadges } from '@/helpers/storeBadges'
import { Store } from '@/types/store'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = {
	params: Promise<{ slug: string }>
}

/**
 * Format time range from minutes
 */
function formatTimeRange(start: number, end: number): string {
	return `${minutesToTime(start)}-${minutesToTime(end)}`
}

export async function generateStaticParams() {
	const data = await fetchPlaces('')
	const places = data.items || []

	return places.map((place: Store) => ({
		slug: place.slug,
	}))
}

export default async function StoreDetail({ params }: Props) {
	const { slug } = await params

	const store: Store = await fetchPlaceBySlug(slug)

	if (!store) {
		return notFound()
	}

	const mainImage =
		store.imageUrls && store.imageUrls.length > 0 ? store.imageUrls[0] : null
	const badges = getStoreBadges(store)
	const openClosingText = getOpeningStatusText(store.openingHours)

	return (
		<main className="container my-4 space-y-4">
			<Link
				href={routes.explore}
				className="flex items-center text-neutral hover:text-primary fill-neutral hover:fill-primary mb-2 md:mb-4"
			>
				<ChevronLeft className=" size-4 mr-1" />
				Zurück zur Übersicht
			</Link>

			{/* Info and Image Section */}
			<section className="flex flex-col lg:flex-row gap-4">
				{/* Info Section */}
				<section className="lg:w-2/3 order-last lg:order-first mb-4 lg:mb-0">
					<div className="bg-base-300 lg:bg-white border-0 lg:border lg:border-primary lg:rounded-xl lg:px-8 lg:py-6 h-full">
						{/* Store Name and AI Score */}
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-xl font-bold">{store.name}</h1>
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

						{/* Price */}
						<div className="flex items-center mb-4">
							{store.price && (
								<div className="text-neutral">Döner Preis {store.price}€</div>
							)}
						</div>

						{/* AI Summary */}
						<div className="border-l border-primary pl-4 mb-8">
							<p className="mb-1">{store.aiSummary}</p>
							<p className="flex items-center text-neutral text-sm">
								<Aistars className="size-3 fill-neutral mr-2" />
								KI generierte Zusammenfassung von Google Bewertungen
							</p>
						</div>

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
				</section>
				{/* Info Section End */}

				{/* Image */}
				{mainImage && (
					<section className="lg:w-1/3">
						<div className="relative w-full h-64 lg:h-full">
							<Image
								src={mainImage}
								alt={store.name}
								fill
								loading="eager"
								className="object-cover rounded-xl border border-primary"
							/>
						</div>
					</section>
				)}
				{/* Image End */}
			</section>
			{/* Info and Image Section End */}

			{/* Additional Info Cards */}
			<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] gap-4 md:gap-6 lg:gap-4">
				{/* Öffnungszeiten */}
				<div className="order-3 lg:order-1 bg-base-300 lg:bg-white border-0 lg:border lg:border-primary lg:rounded-xl lg:px-6 lg:py-5 space-y-3">
					{store.openingHours?.hours ? (
						<div className="space-y-2">
							<h2 className="hidden md:block text-lg font-bold">
								Öffnungszeiten
							</h2>
							<div className="flex items-center gap-2">
								<Clock
									className={`${
										isStoreOpen(store.openingHours)
											? 'fill-success'
											: 'fill-secondary'
									} size-4`}
								/>
								<p
									className={
										isStoreOpen(store.openingHours)
											? 'text-success'
											: 'text-secondary'
									}
								>
									{isStoreOpen(store.openingHours) ? 'Geöffnet' : 'Geschlossen'}
								</p>
								<CircleSolid className="size-1 fill-neutral" />
								<div>{openClosingText}</div>
							</div>

							{/* Opening hours table */}
							<div className="space-y-1">
								{WEEKDAYS.map(({ key, label }) => {
									const dayHours = store.openingHours.hours[key]
									const { weekday: currentWeekday } = getCurrentTimeInfo(
										store.openingHours.timezone || 'Europe/Berlin',
									)
									const isToday = currentWeekday === key

									return (
										<div
											key={key}
											className={`flex justify-between ${isToday ? 'font-bold' : ''}`}
										>
											<span className="w-28">{label}</span>
											{dayHours && dayHours.length > 0 ? (
												<div className="flex gap-4">
													{dayHours.map((range, idx) => (
														<span key={idx}>
															{formatTimeRange(range.start, range.end)}
														</span>
													))}
												</div>
											) : (
												<span className={`${isToday ? '' : 'text-neutral'}`}>
													geschlossen
												</span>
											)}
										</div>
									)
								})}
							</div>
						</div>
					) : (
						<p className="text-neutral">Keine Öffnungszeiten verfügbar</p>
					)}
				</div>

				{/* Adresse */}
				<div className="order-1 lg:order-2 bg-base-300 lg:bg-white border-0 lg:border lg:border-primary lg:rounded-xl lg:px-6 lg:py-5 space-y-3">
					<h2 className="hidden md:block text-lg font-bold">Adresse</h2>
					<Link
						href={`https://www.google.com/maps/search/?api=1&query=${store.location.coordinates.lat},${store.location.coordinates.lng}`}
						target="_blank"
					>
						<div className="flex items-center gap-3 md:mb-4 hover:underline">
							<Location className="size-5 fill-primary" />
							<div>
								<p>
									{store.location.address.streetAddress},{' '}
									{store.location.address.postalCode}{' '}
									{store.location.address.locality}
								</p>
							</div>
						</div>

						<p className="hidden md:flex items-center justify-center cursor-pointer bg-primary text-white text-sm rounded-full shadow-[0_3px_0px_#000] active:shadow-none active:translate-y-0.5 py-1.5 px-4">
							Google Maps
						</p>
					</Link>
				</div>

				{/* Kontakt */}
				{store.phone && (
					<div className="order-2 lg:order-3 bg-base-300 lg:bg-white border-0 lg:border lg:border-primary lg:rounded-xl lg:px-6 lg:py-5 space-y-3">
						<h2 className="hidden md:block text-lg font-bold">Kontakt</h2>

						<div className="flex items-center gap-2">
							<Phone className="size-5 fill-primary" />
							<Link href={`tel:${store.phone}`} className="link link-hover">
								{store.phone}
							</Link>
						</div>
					</div>
				)}
			</section>
		</main>
	)
}
