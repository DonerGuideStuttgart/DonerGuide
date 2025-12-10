import Link from "next/link";
import Badge from "../../../components/badges/Badge";
import {BadgeType} from "../../../types/BadgeType";
import ReviewItem from "../../../components/reviews/ReviewItem";
import {Review} from "../../../types/store";
import StarRating from "../../../components/reviews/StarRating";

const sampleReview: Review = {
    id: "1",
    user: "Joy",
    date: "vor 2 Tagen",
    rating: 3,
    text: "Absolutely the best kebab! Perfectly seasoned and crispy. Highly recommend!"
};

export default function Home() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
            {/* Go back */}
            <div className="lg:col-span-12">
                <Link href={"/stores"} className="btn btn-sm btn-link">Zurück zu allen Dönerläden</Link>
            </div>

            {/* Döner Laden section */}
            <div className="lg:col-span-5">
                <div className="carousel rounded-box w-64">
                    <div className="carousel-item w-full">
                        <img
                            src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
                            className="w-full"
                            alt="Tailwind CSS Carousel component"/>
                    </div>
                    <div className="carousel-item w-full">
                        <img
                            src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
                            className="w-full"
                            alt="Tailwind CSS Carousel component"/>
                    </div>
                    <div className="carousel-item w-full">
                        <img
                            src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
                            className="w-full"
                            alt="Tailwind CSS Carousel component"/>
                    </div>
                    <div className="carousel-item w-full">
                        <img
                            src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
                            className="w-full"
                            alt="Tailwind CSS Carousel component"/>
                    </div>
                    <div className="carousel-item w-full">
                        <img
                            src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
                            className="w-full"
                            alt="Tailwind CSS Carousel component"/>
                    </div>
                    <div className="carousel-item w-full">
                        <img
                            src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
                            className="w-full"
                            alt="Tailwind CSS Carousel component"/>
                    </div>
                    <div className="carousel-item w-full">
                        <img
                            src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
                            className="w-full"
                            alt="Tailwind CSS Carousel component"/>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">Dönerladen Name</h1>
                    <Badge type={BadgeType.AI_RATING} value={86}/>
                </div>

                <div className="flex items-center gap-4">
                    <div>4.0 <StarRating rating={4} /> (Anzahl) Döner Preis 8€</div>
                </div>

                {/* KI generierte Bewertung */}
                {/* Adresse */}
                <div className="flex items-center gap-4">
                    <svg className="size-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" height="14"
                         width="10.5">
                        <path fill="#c0c0c0"
                              d="M0 188.6C0 84.4 86 0 192 0S384 84.4 384 188.6c0 119.3-120.2 262.3-170.4 316.8-11.8 12.8-31.5 12.8-43.3 0-50.2-54.5-170.4-197.5-170.4-316.8zM192 256a64 64 0 1 0 0-128 64 64 0 1 0 0 128z"/>
                    </svg>
                    <span>Beispielstraße 12, 12345 Berlin</span>
                </div>

                {/* Öffnungszeiten */}
                <div className="flex items-center gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" height="14"
                         width="14">
                        <path fill="#c0c0c0"
                              d="M256 0a256 256 0 1 1 0 512 256 256 0 1 1 0-512zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/>
                    </svg>
                    <div className="collapse">
                        <input type="checkbox"/>
                        <div className="collapse-title font-semibold">Geöffnet Schließt um 23.00 Uhr</div>
                        <div className="collapse-content text-sm">
                            Montag: 10:00 - 23:00<br/>
                            Dienstag: 10:00 - 23:00<br/>
                            Mittwoch: 10:00 - 23:00<br/>
                            Donnerstag: 10:00 - 23:00<br/>
                            Freitag: 10:00 - 00:00<br/>
                            Samstag: 10:00 - 00:00<br/>
                        </div>
                    </div>
                </div>
                {/* Tags */}
                <Badge type={BadgeType.HALAL}/>
                <Badge type={BadgeType.VEGAN}/>
                <Badge type={BadgeType.GEOEFFNET}/>
                <Badge type={BadgeType.GESCHLOSSEN}/>
                <Badge type={BadgeType.VEGAN}/>

                {/* Reviews */}
                <ReviewItem {...sampleReview}/>
                <ReviewItem {...sampleReview}/>
                <ReviewItem {...sampleReview}/>
            </div>
        </div>

    )
}