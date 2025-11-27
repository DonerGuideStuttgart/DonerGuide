export interface Location {
    coordinates: {
        lat: number;
        lng: number;
    };
    google_place_id: string;
    address: string;
    plus_code: string;
    maps_url: string;
}

export interface OpeningHours {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
}

export interface Review {
    id: string;
    user: string;
    date: string;
    rating: number;
    text: string;
}

export interface Store {
    id: string;
    name: string;
    district: string;
    location: Location;
    rating: number;
    price: number;
    vegetarian: string[];
    halal: string;
    waiting_time: string;
    payment: string[];
    open_hours: string;
    distance_from_me: number;
    ai_summary: string;
    opening_hours: OpeningHours;
    ai_reviews: Review[];
}