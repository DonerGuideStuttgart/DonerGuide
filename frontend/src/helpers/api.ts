export function buildStoreQuery(filters: Record<string, any>, sort?: string) {
    const params = new URLSearchParams();
    for (const k of Object.keys(filters)) {
        const v = filters[k];
        if (v === undefined || v === null || v === "") continue;
        params.set(k, String(v));
    }
    if (sort) params.set("sort", sort);
    return params.toString();
}

export async function fetchStores(query: string) {
    const base = process.env.NEXT_PUBLIC_API_URL || "/api"; // default to local proxy
    const url = `${base}/stores${query ? `?${query}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch stores");
    return await res.json();
}

export async function fetchStoreById(id: string) {
    const base = process.env.NEXT_PUBLIC_API_URL || "/api";
    const res = await fetch(`${base}/stores/${id}`);
    if (!res.ok) throw new Error("Failed to fetch store");
    return await res.json();
}