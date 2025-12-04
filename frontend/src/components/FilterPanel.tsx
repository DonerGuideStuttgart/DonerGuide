"use client";
import { useState } from "react";
import { Slider } from "@heroui/slider";

export type Filters = {
    district?: string;
    rating?: number;
    price_min?: number;
    price_max?: number;
    vegetarian?: string;
    halal?: string;
    waiting_time?: string;
    limit?: number;
    offset?: number;
};

export default function FilterPanel({
    onChange,
    initial = {},
}: {
    onChange: (f: Filters) => void;
    initial?: Filters;
}) {
    const [filters, setFilters] = useState<Filters>(initial);

    function update(partial: Partial<Filters>) {
        const next = { ...filters, ...partial };
        setFilters(next);
        onChange(next);
    }

    return (
        <section className="p-4 border rounded-md">
            <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col">
                    District
                    <input
                        className="input input-sm"
                        value={filters.district || ""}
                        onChange={(e) => update({ district: e.target.value })}
                        placeholder="Stuttgart-West"
                    />
                </label>
                <label className="flex flex-col">
                    Min Rating
                    <select
                        className="select select-sm"
                        value={filters.rating ?? ""}
                        onChange={(e) => update({ rating: e.target.value ? Number(e.target.value) : undefined })}
                    >
                        <option value="">Any</option>
                        {[1, 2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>
                                {r}+
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col col-span-2">
                    <Slider
                        className="max-w-md"
                        defaultValue={[
                            filters.price_min ?? 0,
                            filters.price_max ?? 30
                        ]}
                        formatOptions={{ style: "currency", currency: "EUR" }}
                        label="Price Range"
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
            </div>
        </section>
    );
}