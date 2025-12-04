/*import {
    CheckCircleIcon,
    XCircleIcon,
    BoltIcon,
    LeafIcon,
    FireIcon,
    CurrencyEuroIcon,
    SparklesIcon,
    HandThumbUpIcon,
} from "@heroicons/react/24/solid";*/

import { BadgeType } from "@/types/BadgeType";

export const badgeConfig = {
    [BadgeType.HALAL]: {
        text: "Halal",
        //icon: <CheckCircleIcon className="w-4 h-4" />,
        className: "badge-success",
    },
    [BadgeType.SCHNELL]: {
        text: "Schnell",
        //icon: <BoltIcon className="w-4 h-4" />,
        className: "badge-info",
    },
    [BadgeType.VEGETARISCH]: {
        text: "Vegetarisch",
        //icon: <LeafIcon className="w-4 h-4" />,
        className: "badge-success",
    },
    [BadgeType.VEGAN]: {
        text: "Vegan",
        //icon: <LeafIcon className="w-4 h-4" />,
        className: "badge-success",
    },
    [BadgeType.FLEISCH_HEAVY]: {
        text: "Fleisch heavy",
        //icon: <FireIcon className="w-4 h-4" />,
        className: "badge-error",
    },
    [BadgeType.GEOEFFNET]: {
        text: "Geöffnet",
        //icon: <HandThumbUpIcon className="w-4 h-4" />,
        className: "badge-success",
    },
    [BadgeType.GESCHLOSSEN]: {
        text: "Geschlossen",
        //icon: <XCircleIcon className="w-4 h-4" />,
        className: "badge-neutral",
    },
    [BadgeType.NUR_CASH]: {
        text: "Nur Cash",
        //icon: <CurrencyEuroIcon className="w-4 h-4" />,
        className: "badge-warning",
    },
    [BadgeType.AI_RATING]: {
        //icon: <SparklesIcon className="w-4 h-4" />,
        className: "badge-accent",
        tooltip: <div className="tooltip" data-tip="AI basiertes Rating anhand der Bilder">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" height="10"
                 width="10">
                <path fill="#c0c0c0"
                      d="M256 0a256 256 0 1 1 0 512 256 256 0 1 1 0-512zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/>
            </svg>
        </div>,
    }
};
