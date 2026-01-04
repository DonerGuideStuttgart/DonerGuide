'use client'
import ChevronLeft from '@/assets/icons/chevronleft.svg'
import ChevronRight from '@/assets/icons/chevronright.svg'
import Image from 'next/image'
import { useRef } from 'react'

type ImageCarouselProps = {
	images: string[]
	storeName: string
}

export default function ImageCarousel({
	images,
	storeName,
}: ImageCarouselProps) {
	const carouselRef = useRef<HTMLDivElement>(null)

	const scrollToSlide = (index: number) => {
		if (!carouselRef.current) return
		const slideWidth = carouselRef.current.offsetWidth
		carouselRef.current.scrollTo({
			left: slideWidth * index,
			behavior: 'smooth',
		})
	}

	const handlePrev = () => {
		if (!carouselRef.current) return
		const slideWidth = carouselRef.current.offsetWidth
		const currentScroll = carouselRef.current.scrollLeft
		const currentIndex = Math.round(currentScroll / slideWidth)
		const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
		scrollToSlide(prevIndex)
	}

	const handleNext = () => {
		if (!carouselRef.current) return
		const slideWidth = carouselRef.current.offsetWidth
		const currentScroll = carouselRef.current.scrollLeft
		const currentIndex = Math.round(currentScroll / slideWidth)
		const nextIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
		scrollToSlide(nextIndex)
	}

	return (
		<div className="relative w-full h-64 lg:h-full">
			<div
				ref={carouselRef}
				className="carousel w-full h-full rounded-xl border border-primary"
			>
				{images.map((imageUrl, idx) => (
					<div
						key={idx}
						id={`slide${idx}`}
						className="carousel-item relative w-full h-full"
					>
						<Image
							src={imageUrl}
							alt={`${storeName} - Bild ${idx + 1}`}
							fill
							loading="eager"
							className="object-cover"
						/>
					</div>
				))}
			</div>
			{images.length > 1 && (
				<div className="absolute left-2 right-2 top-1/2 flex -translate-y-1/2 transform justify-between">
					<button
						onClick={handlePrev}
						className="bg-base-100 hover:bg-base-300 border border-primary cursor-pointer rounded-full p-2"
						aria-label="Vorheriges Bild"
					>
						<ChevronLeft className="size-4 fill-primary" />
					</button>
					<button
						onClick={handleNext}
						className="bg-base-100 hover:bg-base-300 border border-primary cursor-pointer rounded-full p-2"
						aria-label="Nächstes Bild"
					>
						<ChevronRight className="size-4 fill-primary" />
					</button>
				</div>
			)}
		</div>
	)
}
