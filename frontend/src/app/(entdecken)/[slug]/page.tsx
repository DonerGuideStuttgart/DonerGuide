import { fetchPlaceBySlug, fetchPlaces } from '@/helpers/api'
import { routes } from '@/helpers/routes'
import { Store } from '@/types/store'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ChevronLeft from '@/assets/icons/chevronleft.svg'
import Badge from '@/components/badge/Badge'
import Aistars from '@/assets/icons/aistars.svg'
import InfoCircle from '@/assets/icons/infocircle.svg'
import { getOpeningStatusText } from '@/helpers/openingHours'
import { getStoreBadges } from '@/helpers/storeBadges'
import { badgeConfig } from '@/components/badge/badgeConfig'
import Image from 'next/image'

type Props = {
	params: Promise<{ slug: string }>
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
		<main className="container my-4">
			<Link
				href={routes.explore}
				className="flex items-center text-neutral hover:text-primary fill-neutral hover:fill-primary mb-2 md:mb-4"
			>
				<ChevronLeft className=" size-4 mr-1" />
				Zurück zur Übersicht
			</Link>

			<section className="flex flex-col lg:flex-row gap-4">
				<section className="lg:w-2/3 order-last lg:order-first">
					{/* Info Section */}
					<div className="bg-base-300 lg:bg-white border-0 lg:border lg:border-primary lg:rounded-xl lg:px-8 lg:py-6 h-full">
						{/* Store Name and AI Score */}
						<div className="flex items-center gap-3 mb-2">
							<h1 className="text-lg md:text-xl font-bold">{store.name}</h1>
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
			</section>
		</main>
	)
}
