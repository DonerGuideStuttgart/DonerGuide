"use client";
import { Filters } from "./FilterPanel";

const DISTRICT_LABELS: Record<string, string> = {
    Mitte: "Mitte",
    Nord: "Nord",
    Süd: "Süd",
    Ost: "Ost",
    West: "West",
    Bad_Cannstatt: "Bad Cannstatt",
    Feuerbach: "Feuerbach",
    Zuffenhausen: "Zuffenhausen",
    Vaihingen: "Vaihingen",
    Möhringen: "Möhringen",
    Degerloch: "Degerloch",
    Plieningen: "Plieningen",
    Sillenbuch: "Sillenbuch",
    Hedelfingen: "Hedelfingen",
    Wangen: "Wangen",
    Botnang: "Botnang",
    Birkach: "Birkach",
    Untertürkheim: "Untertürkheim",
    Obertürkheim: "Obertürkheim",
    Mühlhausen: "Mühlhausen",
    Weilimdorf: "Weilimdorf"
};

const OPEN_HOURS_LABELS: Record<string, string> = {
    open_now: "Jetzt geöffnet",
    open_this_evening: "Heute Abend",
    open_late: "Spät geöffnet"
};

const VEGETARIAN_LABELS: Record<string, string> = {
    meat: "Fleisch",
    vegetarian: "Vegetarisch",
    vegan: "Vegan"
};

const HALAL_LABELS: Record<string, string> = {
    halal: "Halal",
    not_halal: "Nicht Halal"
};

const WAITING_TIME_LABELS: Record<string, string> = {
    FAST: "Schnell",
    AVERAGE: "Normal"
};

const PAYMENT_LABELS: Record<string, string> = {
    NFC: "Kartenzahlung",
    CASH: "Nur Cash"
};

interface ChipsFilterBarProps {
    filters: Filters;
    onRemove: (key: keyof Filters, value?: string) => void;
}

export default function ChipsFilterBar({ filters, onRemove }: ChipsFilterBarProps) {
    const chips: { label: string; onRemove: () => void }[] = [];

    // Score range
    if (filters.min_score !== undefined || filters.max_score !== undefined) {
        const min = filters.min_score ?? 0;
        const max = filters.max_score ?? 100;
        chips.push({
            label: `${min}-${max}⭐`,
            onRemove: () => {
                onRemove("min_score");
                onRemove("max_score");
            }
        });
    }

    // Price range
    if (filters.price_min !== undefined || filters.price_max !== undefined) {
        const min = filters.price_min ?? 0;
        const max = filters.price_max ?? 30;
        chips.push({
            label: `${min}-${max}€`,
            onRemove: () => {
                onRemove("price_min");
                onRemove("price_max");
            }
        });
    }

    // Districts
    if (filters.district) {
        filters.district.split(",").forEach((district) => {
            chips.push({
                label: DISTRICT_LABELS[district] || district,
                onRemove: () => onRemove("district", district)
            });
        });
    }

    // Open hours
    if (filters.open_hours) {
        filters.open_hours.split(",").forEach((hour) => {
            chips.push({
                label: OPEN_HOURS_LABELS[hour] || hour,
                onRemove: () => onRemove("open_hours", hour)
            });
        });
    }

    // Vegetarian
    if (filters.vegetarian) {
        filters.vegetarian.split(",").forEach((veg) => {
            chips.push({
                label: VEGETARIAN_LABELS[veg] || veg,
                onRemove: () => onRemove("vegetarian", veg)
            });
        });
    }

    // Halal
    if (filters.halal) {
        chips.push({
            label: HALAL_LABELS[filters.halal] || filters.halal,
            onRemove: () => onRemove("halal")
        });
    }

    // Sauce amount
    if (filters.sauce_amount_min !== undefined || filters.sauce_amount_max !== undefined) {
        const min = filters.sauce_amount_min ?? 0;
        const max = filters.sauce_amount_max ?? 100;
        chips.push({
            label: `Soße ${min}-${max}`,
            onRemove: () => {
                onRemove("sauce_amount_min");
                onRemove("sauce_amount_max");
            }
        });
    }

    // Meat ratio
    if (filters.meat_ratio_min !== undefined || filters.meat_ratio_max !== undefined) {
        const min = filters.meat_ratio_min ?? 0;
        const max = filters.meat_ratio_max ?? 100;
        chips.push({
            label: `Fleisch ${min}-${max}`,
            onRemove: () => {
                onRemove("meat_ratio_min");
                onRemove("meat_ratio_max");
            }
        });
    }

    // Waiting time
    if (filters.waiting_time) {
        chips.push({
            label: WAITING_TIME_LABELS[filters.waiting_time] || filters.waiting_time,
            onRemove: () => onRemove("waiting_time")
        });
    }

    // Payment methods
    if (filters.payment_methods) {
        chips.push({
            label: PAYMENT_LABELS[filters.payment_methods] || filters.payment_methods,
            onRemove: () => onRemove("payment_methods")
        });
    }

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 p-4 bg-base-200 rounded-md">
            {chips.map((chip, index) => (
                <div
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-content rounded-full text-sm"
                >
                    <span>{chip.label}</span>
                    <button
                        onClick={(e) => {
                            console.log("Remove filter clicked:", chip.label);
                            chip.onRemove();
                        }}
                        className="hover:bg-secondary-focus rounded-full w-4 h-4 flex items-center justify-center"
                        aria-label="Remove filter"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}