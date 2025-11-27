import Link from "next/link";

export type StoreSummary = {
    id: string;
    name: string;
    district?: string;
    rating?: number;
    price?: number;
    open_hours?: string;
    ai_summary?: string;
    distance_from_me?: number;
};

export default function DonerCard({ store }: { store: StoreSummary }) {
    return (
        <article className="border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold">
                <Link href={`/stores/${store.id}`}>
                    <a>{store.name}</a>
                </Link>
            </h3>
            <div className="text-sm text-muted">{store.district}</div>
            <div className="mt-2 flex items-center justify-between">
                <div className="text-sm">Rating: {store.rating ?? "—"}</div>
                <div className="text-sm">Price: €{store.price ?? "—"}</div>
            </div>
            <p className="mt-2 text-sm text-gray-700">{store.ai_summary}</p>
        </article>
    );
}