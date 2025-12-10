import { Review } from "@/types/Review";
import StarRating from "./StarRating";

export default function ReviewItem({ user, date, rating, text }: Review) {
    return (
        <div className="pb-6">
            <p className="text-ml">{user}</p>
            {/* Rating + Date */}
            <div className="flex justify-between items-center mb-1">
                <StarRating rating={rating} />
                <span className="text-sm text-base-content">{date}</span>
            </div>

            {/* Review Text */}
            <p className="text-sm text-base-content">{text}</p>
        </div>
    );
}