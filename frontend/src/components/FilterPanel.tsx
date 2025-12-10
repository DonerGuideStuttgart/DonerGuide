"use client";
import { useState } from "react";
import { forwardRef, useImperativeHandle } from 'react';
import { Slider } from "@heroui/slider";

export type Filters = {
    district?: string;
    min_score?: number;
    max_score?: number;
    price_min?: number;
    price_max?: number;
    open_hours?: string;
    vegetarian?: string;
    sauce_amount_min?: number;
    sauce_amount_max?: number;
    meat_ratio_min?: number;
    meat_ratio_max?: number;
    halal?: string;
    waiting_time?: string;
    payment_methods?: string;
    limit?: number;
    offset?: number;
};

const DISTRICTS = [
    "Mitte",
    "Nord",
    "Süd",
    "Ost",
    "West",
    "Bad_Cannstatt",
    "Feuerbach",
    "Zuffenhausen",
    "Vaihingen",
    "Möhringen",
    "Degerloch",
    "Plieningen",
    "Sillenbuch",
    "Hedelfingen",
    "Wangen",
    "Botnang",
    "Birkach",
    "Untertürkheim",
    "Obertürkheim",
    "Mühlhausen",
    "Weilimdorf"
];
const OPEN_HOURS = ["open_now", "open_this_evening", "open_late"]
const VEGETARIAN = ["meat", "vegetarian", "vegan"]

export interface FilterPanelHandle {
    removeFilter: (key: keyof Filters, value?: string) => void;
}

export default function FilterPanel({
    onChange,
    initial = {},
}: {
    onChange: (f: Filters) => void;
    initial?: Filters;
}) {
    const [filters, setFilters] = useState<Filters>(initial);
    const [selectedDistricts, setSelectedDistricts] = useState<string[]>(
        filters.district ? filters.district.split(",") : []
    );
    const [selectedOpenHours, setSelectedOpenHours] = useState<string[]>(
        filters.open_hours ? filters.open_hours.split(",") : []
    );
    const [selectedVegetarian, setSelectedVegetarian] = useState<string[]>(
        filters.vegetarian ? filters.vegetarian.split(",") : []
    );

    function update(partial: Partial<Filters>) {
        const next = { ...filters, ...partial };
        setFilters(next);
        onChange(next);
    }

    function removeFilter(key: keyof Filters, value?: string) {
        if (value && (key === "district" || key === "open_hours" || key === "vegetarian")) {
            const current = filters[key]?.split(",") || [];
            const updated = current.filter(v => v !== value);

            if (key === "district") setSelectedDistricts(updated);
            if (key === "open_hours") setSelectedOpenHours(updated);
            if (key === "vegetarian") setSelectedVegetarian(updated);

            update({ [key]: updated.length > 0 ? updated.join(",") : undefined });
        } else {
            update({ [key]: undefined });
        }
    }

    (FilterPanel as any).removeFilter = removeFilter;

    function toggleDistrict(district: string) {
        const newSelection = selectedDistricts.includes(district)
            ? selectedDistricts.filter(d => d !== district)
            : [...selectedDistricts, district];

        setSelectedDistricts(newSelection);
        update({ district: newSelection.join(",") || undefined });
    }

    function toggleOpenHour(hour: string) {
        const newSelection = selectedDistricts.includes(hour)
            ? selectedDistricts.filter(d => d !== hour)
            : [...selectedDistricts, hour];

        setSelectedOpenHours(newSelection);
        update({ open_hours: newSelection.join(",") || undefined });
    }

    function toggleVegetarian(vegetarian: string) {
        const newSelection = selectedVegetarian.includes(vegetarian)
            ? selectedVegetarian.filter(d => d !== vegetarian)
            : [...selectedVegetarian, vegetarian];

        setSelectedVegetarian(newSelection);
        update({ vegetarian: newSelection.join(",") || undefined });
    }

    return (
        <section className="p-4 border rounded-md">
            <div className="grid gap-6">
                <label className="flex flex-col col-span-2">
                    <Slider
                        className="max-w-md"
                        defaultValue={[
                            filters.min_score ?? 0,
                            filters.max_score ?? 100
                        ]}
                        label="Bewertung"
                        maxValue={100}
                        minValue={0}
                        step={1}
                        onChange={(e) => {
                            console.log(e);
                            const [min, max] = e as [number, number];
                            update({
                                min_score: min,
                                max_score: max
                            });
                        }}
                    />
                </label>
                <label className="flex flex-col col-span-2">
                    <Slider
                        className="max-w-md"
                        defaultValue={[
                            filters.price_min ?? 0,
                            filters.price_max ?? 30
                        ]}
                        formatOptions={{ style: "currency", currency: "EUR" }}
                        label="Preis"
                        maxValue={30}
                        minValue={0}
                        step={1}
                        onChange={(e) => {
                            console.log(e);
                            const [min, max] = e as [number, number];
                            update({
                                price_min: min,
                                price_max: max
                            });
                        }}
                    />
                </label>
                <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-medium">Bezirk</label>
                    <input
                        className="input input-sm"
                        value={filters.district || ""}
                        onChange={(e) => update({ district: e.target.value })}
                        placeholder="Stuttgart-West"
                    />
                    <div className="h-[200px] overflow-y-auto border rounded-md p-2 bg-base-100">
                        <div className="flex flex-col gap-1">
                            {DISTRICTS.map((district) => (
                                <label
                                    key={district}
                                    className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm"
                                        checked={selectedDistricts.includes(district)}
                                        onChange={() => toggleDistrict(district)}
                                    />
                                    <span className="text-sm">{district}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-medium">Öffnungszeiten</label>
                    <div className="overflow-y-auto border rounded-md p-2 bg-base-100">
                        <div className="flex flex-col gap-1">
                            {OPEN_HOURS.map((hour) => (
                                <label
                                    key={hour}
                                    className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm"
                                        checked={selectedOpenHours.includes(hour)}
                                        onChange={() => toggleOpenHour(hour)}
                                    />
                                    <span className="text-sm">{hour}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-medium">Vegetarisch/Vegan</label>
                    <div className="overflow-y-auto border rounded-md p-2 bg-base-100">
                        <div className="flex flex-col gap-1">
                            {VEGETARIAN.map((vegetarian) => (
                                <label
                                    key={vegetarian}
                                    className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm"
                                        checked={selectedVegetarian.includes(vegetarian)}
                                        onChange={() => toggleVegetarian(vegetarian)}
                                    />
                                    <span className="text-sm">{vegetarian}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-medium">Halal</label>
                    <div className="overflow-y-auto border rounded-md p-2 bg-base-100">
                        <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={filters.halal == "halal"}
                                    onChange={() => update({
                                        halal:
                                            filters.halal == "halal" ? undefined : "halal"
                                    })}
                                />
                                <span className="text-sm">ja</span>
                            </label>
                            <label className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={filters.halal == "not_halal"}
                                    onChange={() => update({
                                        halal:
                                            filters.halal == "not_halal" ? undefined : "not_halal"
                                    })}
                                />
                                <span className="text-sm">nein</span>
                            </label>
                        </div>
                    </div>
                </div>
                <label className="flex flex-col col-span-2">
                    <Slider
                        className="max-w-md"
                        defaultValue={[
                            filters.sauce_amount_min ?? 0,
                            filters.sauce_amount_max ?? 100
                        ]}
                        label="Soßenmenge"
                        maxValue={100}
                        minValue={0}
                        step={1}
                        onChange={(e) => {
                            console.log(e);
                            const [min, max] = e as [number, number];
                            update({
                                sauce_amount_min: min,
                                sauce_amount_max: max
                            });
                        }}
                    />
                </label>
                <label className="flex flex-col col-span-2">
                    <Slider
                        className="max-w-md"
                        defaultValue={[
                            filters.meat_ratio_min ?? 0,
                            filters.meat_ratio_max ?? 100
                        ]}
                        label="Fleischanteil"
                        maxValue={100}
                        minValue={0}
                        step={1}
                        onChange={(e) => {
                            console.log(e);
                            const [min, max] = e as [number, number];
                            update({
                                meat_ratio_min: min,
                                meat_ratio_max: max
                            });
                        }}
                    />
                </label>
                <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-medium">Wartezeit</label>
                    <div className="overflow-y-auto border rounded-md p-2 bg-base-100">
                        <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={filters.waiting_time == "FAST"}
                                    onChange={() => update({
                                        waiting_time:
                                            filters.waiting_time == "FAST" ? undefined : "FAST"
                                    })}
                                />
                                <span className="text-sm">Schnell</span>
                            </label>
                            <label className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={filters.waiting_time == "AVERAGE"}
                                    onChange={() => update({
                                        waiting_time:
                                            filters.waiting_time == "AVERAGE" ? undefined : "AVERAGE"
                                    })}
                                />
                                <span className="text-sm">normal</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-medium">Bezahlung</label>
                    <div className="overflow-y-auto border rounded-md p-2 bg-base-100">
                        <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={filters.payment_methods == "NFC"}
                                    onChange={() => update({
                                        payment_methods:
                                            filters.payment_methods == "NFC" ? undefined : "NFC"
                                    })}
                                />
                                <span className="text-sm">Kartenzahlung möglich</span>
                            </label>
                            <label className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={filters.payment_methods == "CASH"}
                                    onChange={() =>
                                        update({
                                            payment_methods:
                                                filters.payment_methods == "CASH" ? undefined : "CASH"
                                        })
                                    }
                                />
                                <span className="text-sm">nur Cash</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}