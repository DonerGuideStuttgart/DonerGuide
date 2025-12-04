"use client";
import { useEffect, useState } from "react";

import FilterPanel, { Filters } from "@/components/FilterPanel";
import SortControl from "@/components/SortControl";
import DonerCard from "@/components/DonerCard";
import { buildStoreQuery, fetchPlaces } from "@/helpers/api";
import ChipsFilterBar from "@/components/ChipsFilterBar";

export default function StoresPage() {
    const [filters, setFilters] = useState<Filters>({ limit: 20, offset: 0 });
    const [filterPanelRef, setFilterPanelRef] = useState<any>(null);
    const [sort, setSort] = useState<string>("");
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const q = buildStoreQuery(filters as any, sort);
                console.debug("[StoresPage] fetch query:", q);
                const payload = await fetchPlaces(q);
                console.debug("[StoresPage] fetch payload:", payload);
                const items = Array.isArray(payload.items)
                    ? payload.items : [];
                if (!mounted) return;
                setStores(items);
                console.debug("[StoresPage] normalized items:", items);
            } catch (e: any) {
                console.error("[StoresPage] fetch error:", e);
                setError(e.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, [filters, sort]);

    function handleRemoveFilter(key: keyof Filters, value?: string) {
        if (filterPanelRef) {
            filterPanelRef.removeFilter(key, value);
        }
    }


    return (
        <main className="max-w-5xl mx-auto p-4">
            <header className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Dönerläden</h1>
                <SortControl value={sort} onChange={setSort} />
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                    <FilterPanel onChange={(f) => setFilters(f)} initial={filters} ref={setFilterPanelRef} />
                </div>
                <div className="md:col-span-3 space-y-3">
                    <ChipsFilterBar filters={filters} onRemove={handleRemoveFilter} />
                    {loading && <div>Loading…</div>}
                    {error && <div className="text-red-600">{error}</div>}
                    {stores.map((s: any) => (
                        <DonerCard key={s.id} store={s} />
                    ))}
                </div>
            </div>
        </main>
    );
}