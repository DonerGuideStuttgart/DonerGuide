import { PaymentMethods } from "./PaymentMethods";
import { Photo } from "./Photo";


export interface Place {
    id: string;
    doner_guide_version: number;
    internationalPhoneNumber?: string;
    latitude: number;
    longitude: number;
    openingHours: {
        Mo?: [number, number];
        Tu?: [number, number];
        We?: [number, number];
        Th?: [number, number];
        Fr?: [number, number];
        Sa?: [number, number];
        Su?: [number, number];
    };
    address: {
        postalCode?: string;
        locality?: string;
        sublocality?: string;
        streetAddress?: string;
    };
    photos: {
        uncategorized?: Photo[];
        food?: Photo[];
        places?: Photo[];
    }
    paymentMethods?: PaymentMethods[]; // e.g., ["CASH", "CREDIT_CARD", "DEBIT_CARD", "NFC"]
    takeout?: boolean;
    delivery?: boolean;
    dineIn?: boolean;
    servesVegetarianFood?: boolean;
}