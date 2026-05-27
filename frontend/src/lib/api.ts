// Shared API utility for Dollaby frontend
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("dollaby_token");
}

export function getAuthHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers ?? {}),
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "API error");
    }
    return res.json();
}

// ---- Auth ----
export async function apiRegister(name: string, email: string, password: string) {
    return apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    });
}

export async function apiLogin(email: string, password: string) {
    return apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
}

export async function apiGetMe() {
    return apiFetch("/auth/me");
}

// ---- Closet ----
export async function apiGetCloset() {
    return apiFetch("/closet");
}

export async function apiDeleteItem(id: string) {
    return apiFetch(`/closet/${id}`, { method: "DELETE" });
}

export async function apiUploadItem(formData: FormData) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/closet/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Upload failed");
    }
    return res.json();
}

// ---- Outfits ----
export async function apiGenerateOutfit(occasion: string, season: string) {
    return apiFetch("/outfits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion, season }),
    });
}

export async function apiGetOutfits() {
    return apiFetch("/outfits");
}

export async function apiSaveOutfit(data: {
    name: string;
    occasion?: string;
    items: string[];
    ai_score?: number;
    ai_reasoning?: string;
}) {
    return apiFetch("/outfits/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
}

export async function apiDeleteOutfit(id: string) {
    return apiFetch(`/outfits/${id}`, { method: "DELETE" });
}

// ---- Assistant ----
export async function apiChat(
    message: string,
    history: { role: string; content: string }[]
): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/assistant/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, history }),
    });
    if (!res.ok) return null;
    return res.body?.getReader() ?? null;
}

// ---- Calendar ----
export async function apiGetCalendar() {
    return apiFetch("/calendar");
}

export async function apiSaveCalendarEntry(data: {
    date: string;
    outfit_id?: string;
    outfit_name?: string;
    note?: string;
}) {
    return apiFetch("/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
}

export async function apiDeleteCalendarEntry(id: string) {
    return apiFetch(`/calendar/${id}`, { method: "DELETE" });
}

// ---- Weather ----
export async function apiGetWeather() {
    return apiFetch("/weather/forecast");
}

// ---- Catalog ----
export async function apiGetCatalog(params: {
    category?: string;
    gender?: string;
    occasion?: string;
    season?: string;
    search?: string;
    limit?: number;
    offset?: number;
} = {}) {
    const qs = new URLSearchParams();
    if (params.category) qs.set("category", params.category);
    if (params.gender)   qs.set("gender",   params.gender);
    if (params.occasion) qs.set("occasion", params.occasion);
    if (params.season)   qs.set("season",   params.season);
    if (params.search)   qs.set("search",   params.search);
    if (params.limit)    qs.set("limit",    String(params.limit));
    if (params.offset)   qs.set("offset",   String(params.offset));
    const q = qs.toString();
    return apiFetch(`/catalog${q ? "?" + q : ""}`);
}

export async function apiAddCatalogToCloset(itemId: string) {
    return apiFetch(`/catalog/${itemId}/add`, { method: "POST" });
}
