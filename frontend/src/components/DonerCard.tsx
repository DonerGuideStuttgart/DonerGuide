export type StoreSummary = {
    id: string;
    name: string;
    district?: string;
    ai_score?: number;
    price?: number;
    open_hours?: string;
    ai_summary?: string;
    distance_from_me?: number;
};

export default function DonerCard({ store }: { store: StoreSummary }) {
    return (
        <article className="border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold">{store.name}</h3>
            <div className="text-sm text-muted">{store.district}</div>
            <div className="mt-2 flex items-center justify-between">
                <div className="text-sm">Rating: {store.ai_score ?? "—"}</div>
                <div className="text-sm">Price: €{store.price ?? "—"}</div>
            </div>
            <p className="mt-2 text-sm text-gray-700">{store.ai_summary}</p>
        </article>
    );
}