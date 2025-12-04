import { Review } from "@/types/Review";

export default function ReviewItem({ user, date, rating, text }: Review) {
    return (
        <div className="pb-6">
            <p className="text-ml">{user}</p>
            {/* Rating + Date */}
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1 mb-2 text-sm"> Sterne
                    {/*{Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon
                        key={i}
                        className={`w-4 h-4 ${
                            i < rating ? "text-yellow-500" : "text-gray-300"
                        }`}
                    />
                ))}*/}
                </div>
                <span className="text-sm text-base-content">{date}</span>
            </div>

            {/* Review Text */}
            <p className="text-sm text-base-content">{text}</p>
        </div>
    );
}