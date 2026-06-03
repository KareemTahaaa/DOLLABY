"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Upload, Filter, Search, Tag, Trash2, X, Sparkles, Loader2, AlertCircle, BookOpen, Plus, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiGetCloset, apiDeleteItem, apiUploadItem, apiGetCatalog, apiAddCatalogToCloset } from "@/lib/api";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ClothingItem = {
    id: string; name: string; category: string; color: string;
    season: string; brand?: string; fabric?: string; tags?: string[]; image_url?: string;
};
type CatalogItem = ClothingItem & { gender: string; occasion: string; description?: string };

const CATEGORIES  = ["Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessories"];
const SEASONS     = ["Summer", "Winter", "Spring", "Fall", "All"];
const GENDERS     = ["All", "Men", "Women", "Unisex"];
const OCCASIONS   = ["Casual", "Formal", "Business", "Party", "Sport", "Vacation"];

/* ─── helper: resolve image source ─────────────────────────────────── */
function imgSrc(url: string | undefined): string | null {
    if (!url) return null;
    if (url.startsWith("http")) return url;          // external (catalog / Unsplash)
    return `${API_BASE}${url}`;                       // local upload
}

export default function MyClosetPage() {
    /* ── Tab state ─────────────────────────────────────────────────── */
    const [tab, setTab] = useState<"closet" | "catalog">("closet");

    /* ── My Closet state ───────────────────────────────────────────── */
    const [items,         setItems]         = useState<ClothingItem[]>([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState("");
    const [filterOpen,    setFilterOpen]    = useState(false);
    const [uploadOpen,    setUploadOpen]    = useState(false);
    const [uploadStep,    setUploadStep]    = useState<"initial"|"processing"|"done"|"error">("initial");
    const [uploadError,   setUploadError]   = useState("");
    const [search,        setSearch]        = useState("");
    const [filterCategory,setFilterCategory]= useState<string[]>([]);
    const [filterSeason,  setFilterSeason]  = useState<string | null>(null);
    const [form,          setForm]          = useState({ name: "", brand: "" });
    const [imageFile,     setImageFile]     = useState<File | null>(null);
    const [imagePreview,  setImagePreview]  = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── Catalog state ─────────────────────────────────────────────── */
    const [catalog,       setCatalog]       = useState<CatalogItem[]>([]);
    const [catalogLoading,setCatalogLoading]= useState(false);
    const [catalogTotal,  setCatalogTotal]  = useState(0);
    const [catalogOffset, setCatalogOffset] = useState(0);
    const [loadingMore,   setLoadingMore]   = useState(false);
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catCategory,   setCatCategory]   = useState("");
    const [catGender,     setCatGender]     = useState("All");
    const [catOccasion,   setCatOccasion]   = useState("");
    const [catSeason,     setCatSeason]     = useState("");
    const [addingIds,     setAddingIds]     = useState<Set<string>>(new Set());
    const [addedIds,      setAddedIds]      = useState<Set<string>>(new Set());
    const PAGE_SIZE = 200;

    useEffect(() => {
        fetchItems();
        const q = new URLSearchParams(window.location.search).get("search");
        if (q) setSearch(q);
    }, []);

    /* ── Load catalog when switching to that tab ───────────────────── */
    useEffect(() => {
        if (tab === "catalog") loadCatalog();
    }, [tab]);

    const loadCatalog = useCallback(async (reset = true) => {
        const offset = reset ? 0 : catalogOffset;
        if (reset) { setCatalogLoading(true); setCatalogOffset(0); }
        else         setLoadingMore(true);
        try {
            const data = await apiGetCatalog({
                category: catCategory || undefined,
                gender:   catGender !== "All" ? catGender : undefined,
                occasion: catOccasion || undefined,
                season:   catSeason   || undefined,
                search:   catalogSearch || undefined,
                limit:  PAGE_SIZE,
                offset,
            });
            if (reset) {
                setCatalog(data);
                setCatalogTotal(data.length < PAGE_SIZE ? data.length : data.length + 1);
            } else {
                setCatalog(prev => [...prev, ...data]);
                setCatalogTotal(prev => prev + data.length);
            }
            setCatalogOffset(offset + data.length);
        } catch (err: any) {
            toast.error("Could not load catalog: " + err.message);
        } finally {
            setCatalogLoading(false);
            setLoadingMore(false);
        }
    }, [catCategory, catGender, catOccasion, catSeason, catalogSearch, catalogOffset]);

    /* Re-fetch catalog whenever filters change */
    useEffect(() => {
        if (tab === "catalog") loadCatalog(true);
    }, [catCategory, catGender, catOccasion, catSeason]);

    /* Debounce catalog search */
    useEffect(() => {
        if (tab !== "catalog") return;
        const t = setTimeout(() => loadCatalog(true), 350);
        return () => clearTimeout(t);
    }, [catalogSearch]);

    /* ── My closet helpers ─────────────────────────────────────────── */
    const fetchItems = async () => {
        setLoading(true);
        try { setItems(await apiGetCloset()); }
        catch (err: any) { const m = err.message ?? "Failed to load."; setError(m); toast.error(m); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiDeleteItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
            toast.success("Item deleted.");
        } catch (err: any) { toast.error("Delete failed: " + err.message); }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
    };

    const handleUpload = async () => {
        if (!imageFile)         { toast.error("Please select an image."); return; }
        if (!form.name.trim())  { toast.error("Name is required."); return; }
        setUploadStep("processing"); setUploadError("");
        try {
            const fd = new FormData();
            fd.append("image", imageFile);
            fd.append("name",  form.name);
            if (form.brand) fd.append("brand", form.brand);
            const newItem = await apiUploadItem(fd);
            setItems(prev => [newItem, ...prev]);
            setUploadStep("done");
            toast.success("Item added to your closet!");
        } catch (err: any) {
            setUploadError(err.message ?? "Upload failed");
            setUploadStep("error");
            toast.error("Upload failed: " + err.message);
        }
    };

    const resetUpload = () => {
        setUploadStep("initial"); setUploadError("");
        setImageFile(null); setImagePreview(null);
        setForm({ name: "", brand: "" });
    };

    /* ── Catalog helper ────────────────────────────────────────────── */
    const handleAddFromCatalog = async (item: CatalogItem) => {
        if (addingIds.has(item.id) || addedIds.has(item.id)) return;
        setAddingIds(prev => new Set(prev).add(item.id));
        try {
            const newItem = await apiAddCatalogToCloset(item.id);
            setItems(prev => [newItem, ...prev]);
            setAddedIds(prev => new Set(prev).add(item.id));
            toast.success(`"${item.name}" added to your closet!`);
        } catch (err: any) {
            toast.error("Could not add item: " + err.message);
        } finally {
            setAddingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
        }
    };

    /* ── Filtered closet items ─────────────────────────────────────── */
    const filteredItems = items.filter(item => {
        const matchSearch   = item.name.toLowerCase().includes(search.toLowerCase())
                           || item.category.toLowerCase().includes(search.toLowerCase());
        const matchCat      = filterCategory.length === 0 || filterCategory.includes(item.category);
        const matchSeason   = !filterSeason || item.season === filterSeason || item.season === "All";
        return matchSearch && matchCat && matchSeason;
    });

    /* ─────────────────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-heading text-4xl font-semibold tracking-tight mb-1">My Closet</h1>
                    <p className="text-foreground/50 text-sm">
                        {items.length} items digitised — AI-classified &amp; background-removed
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Tab switcher */}
                    <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 gap-1">
                        {(["closet", "catalog"] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)}
                                className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all
                                    ${tab === t ? "" : "text-foreground/50 hover:text-foreground"}`}>
                                {tab === t && (
                                    <motion.div layoutId="closet-tab-bg"
                                        className="absolute inset-0 bg-background rounded-full shadow-sm"
                                        transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                                )}
                                <span className="relative flex items-center gap-1.5">
                                    {t === "closet" ? <Tag className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                    {t === "closet" ? "My Closet" : "Catalog"}
                                </span>
                            </button>
                        ))}
                    </div>

                    {tab === "closet" && (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                                <input type="text" placeholder="Search items…" value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 rounded-full text-sm bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent" />
                            </div>
                            <button onClick={() => setFilterOpen(!filterOpen)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all border
                                    ${filterOpen ? "bg-accent/10 text-accent border-accent/20" : "glass border-black/5 dark:border-white/5"}`}>
                                <Filter className="w-4 h-4" /> Filters
                            </button>
                            <button onClick={() => { setUploadOpen(true); resetUpload(); }}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md">
                                <Upload className="w-4 h-4" /> Upload Item
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── MY CLOSET TAB ──────────────────────────────────────── */}
            {tab === "closet" && (
                <div className="flex gap-6 flex-1 min-h-0">
                    {/* Filter panel */}
                    <AnimatePresence>
                        {filterOpen && (
                            <motion.div
                                initial={{ opacity: 0, width: 0, x: -20 }}
                                animate={{ opacity: 1, width: 260, x: 0 }}
                                exit={{ opacity: 0, width: 0, x: -20, transition: { duration: 0.2 } }}
                                className="flex-shrink-0 h-full overflow-y-auto glass rounded-3xl p-6 border border-black/5 dark:border-white/5">
                                <h3 className="font-semibold mb-6 flex items-center justify-between">
                                    Filter Items
                                    <button onClick={() => setFilterOpen(false)} className="text-foreground/40 hover:text-foreground"><X className="w-4 h-4" /></button>
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3 block">Category</label>
                                        <div className="flex flex-col gap-2">
                                            {CATEGORIES.map(cat => (
                                                <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer hover:text-accent transition-colors">
                                                    <input type="checkbox" checked={filterCategory.includes(cat)}
                                                        onChange={e => setFilterCategory(prev => e.target.checked ? [...prev, cat] : prev.filter(c => c !== cat))}
                                                        className="rounded border-black/20 text-accent" />
                                                    {cat}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3 block">Season</label>
                                        <div className="flex flex-wrap gap-2">
                                            {SEASONS.map(s => (
                                                <button key={s} onClick={() => setFilterSeason(filterSeason === s ? null : s)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                                                        ${filterSeason === s ? "bg-accent text-white border-accent" : "border-black/10 dark:border-white/10 hover:border-accent hover:text-accent"}`}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => { setFilterCategory([]); setFilterSeason(null); }}
                                        className="text-xs text-foreground/50 hover:text-accent transition-colors">
                                        Clear all filters
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Clothing grid */}
                    <div className="flex-1 overflow-y-auto pb-10">
                        {loading && (
                            <div className="flex items-center justify-center h-48 gap-3 text-foreground/50">
                                <Loader2 className="w-6 h-6 animate-spin" /> Loading wardrobe…
                            </div>
                        )}
                        {!loading && error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                            </div>
                        )}
                        {!loading && !error && filteredItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-foreground/40 gap-3">
                                <Upload className="w-10 h-10" />
                                <p className="font-medium">No items yet — upload your first garment!</p>
                                <button onClick={() => setTab("catalog")}
                                    className="text-xs text-accent hover:underline font-medium">
                                    Or browse the catalog →
                                </button>
                            </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filteredItems.map((item, idx) => (
                                <motion.div layout key={item.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                                    className="group relative aspect-[3/4] rounded-3xl border border-foreground/5 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 card-bg">
                                    <div className="absolute inset-0 p-4 pb-16 flex items-center justify-center bg-white/40 dark:bg-black/20">
                                        {item.image_url ? (
                                            <img src={imgSrc(item.image_url)!} alt={item.name}
                                                className="w-full h-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-foreground/20">
                                                <Tag className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleDelete(item.id)}
                                            className="w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md flex items-center justify-center text-red-500 hover:text-red-600 transition-colors shadow-sm">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 translate-y-1 group-hover:translate-y-0 glass-heavy border-t border-foreground/5 px-4 py-3 transition-transform duration-300">
                                        <h4 className="font-heading font-semibold text-sm truncate">{item.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-foreground/50">
                                            <span className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">{item.category}</span>
                                            <span className="w-1 h-1 rounded-full bg-foreground/20" />
                                            <span>{item.color}</span>
                                            <span className="w-1 h-1 rounded-full bg-foreground/20" />
                                            <span>{item.season}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CATALOG TAB ────────────────────────────────────────── */}
            {tab === "catalog" && (
                <div className="flex gap-5 flex-1 min-h-0">

                    {/* Catalog filter sidebar */}
                    <div className="w-52 flex-shrink-0 glass rounded-3xl border border-black/5 dark:border-white/5 p-5 flex flex-col gap-5 overflow-y-auto scrollbar-hide">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/35" />
                            <input type="text" placeholder="Search catalog…" value={catalogSearch}
                                onChange={e => setCatalogSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 focus:outline-none focus:ring-2 focus:ring-accent/40" />
                        </div>

                        <FilterGroup label="Category" value={catCategory} options={["", ...CATEGORIES]}
                            labels={["All", ...CATEGORIES]} onChange={setCatCategory} />
                        <FilterGroup label="Gender" value={catGender} options={GENDERS}
                            labels={GENDERS} onChange={setCatGender} />
                        <FilterGroup label="Occasion" value={catOccasion} options={["", ...OCCASIONS]}
                            labels={["All", ...OCCASIONS]} onChange={setCatOccasion} />
                        <FilterGroup label="Season" value={catSeason} options={["", ...SEASONS]}
                            labels={["All", ...SEASONS]} onChange={setCatSeason} />

                        <button onClick={() => { setCatCategory(""); setCatGender("All"); setCatOccasion(""); setCatSeason(""); setCatalogSearch(""); }}
                            className="text-xs text-foreground/40 hover:text-accent transition-colors text-left">
                            Clear all filters
                        </button>
                    </div>

                    {/* Catalog grid */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide pb-6">
                        {catalogLoading ? (
                            <div className="flex items-center justify-center h-48 gap-3 text-foreground/40">
                                <Loader2 className="w-5 h-5 animate-spin" /> Loading catalog…
                            </div>
                        ) : catalog.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-foreground/30 gap-3">
                                <BookOpen className="w-10 h-10" />
                                <p className="text-sm font-medium">No items match your filters.</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-foreground/40 mb-4">{catalog.length} items in catalog</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {catalog.map((item, idx) => {
                                        const adding = addingIds.has(item.id);
                                        const added  = addedIds.has(item.id);
                                        const src    = imgSrc(item.image_url);
                                        return (
                                            <motion.div key={item.id} layout
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.28, delay: Math.min(idx * 0.025, 0.25) }}
                                                className={`group relative aspect-[3/4] rounded-2xl border overflow-hidden cursor-pointer
                                                    shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300
                                                    bg-[#f7f7f5] dark:bg-[#f5f4f2]
                                                    ${added ? "border-accent/50 ring-1 ring-accent/20" : "border-black/6 dark:border-white/6"}`}>

                                                {/* Full-bleed product image */}
                                                {src ? (
                                                    <img
                                                        src={src}
                                                        alt={item.name}
                                                        className={`absolute inset-0 w-full h-full object-contain p-3 pb-16
                                                            transition-transform duration-500 group-hover:scale-108
                                                            ${item.category === "Shoes" ? "object-bottom" : "object-top"}`}
                                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Tag className="w-12 h-12 text-foreground/10" />
                                                    </div>
                                                )}

                                                {/* Subtle top gradient for badges */}
                                                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />

                                                {/* Gender badge */}
                                                {item.gender !== "Unisex" && (
                                                    <span className="absolute top-2.5 left-2.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/25 text-white/90 backdrop-blur-sm">
                                                        {item.gender}
                                                    </span>
                                                )}

                                                {/* Add button */}
                                                <button
                                                    onClick={() => handleAddFromCatalog(item)}
                                                    disabled={adding || added}
                                                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200
                                                        ${added
                                                            ? "bg-emerald-500 text-white scale-100"
                                                            : "bg-white/90 dark:bg-black/70 backdrop-blur-md text-foreground/70 hover:bg-accent hover:text-white hover:scale-110 opacity-0 group-hover:opacity-100"}`}>
                                                    {adding  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                     : added ? <CheckCircle2 className="w-3.5 h-3.5" />
                                                     : <Plus className="w-3.5 h-3.5" />}
                                                </button>

                                                {/* Info footer — slides up on hover */}
                                                <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0
                                                    bg-white/95 dark:bg-[#e8e7e4]/95 backdrop-blur-md border-t border-black/8
                                                    px-3.5 py-3 transition-transform duration-300 ease-out">
                                                    <h4 className="font-semibold text-[13px] leading-tight truncate text-gray-900">{item.name}</h4>
                                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">{item.category}</span>
                                                        <span className="text-[10px] text-gray-500">{item.color}</span>
                                                        <span className="text-[10px] text-gray-400">·</span>
                                                        <span className="text-[10px] text-gray-500">{item.season}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Load More */}
                                {catalog.length > 0 && catalog.length % PAGE_SIZE === 0 && (
                                    <div className="flex justify-center mt-8">
                                        <button
                                            onClick={() => loadCatalog(false)}
                                            disabled={loadingMore}
                                            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium glass border border-foreground/10 hover:border-accent/40 hover:text-accent transition-all disabled:opacity-50">
                                            {loadingMore
                                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                                                : <><Plus className="w-4 h-4" /> Load more</>}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Upload Modal ────────────────────────────────────────── */}
            <AnimatePresence>
                {uploadOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg glass rounded-[2rem] shadow-2xl overflow-hidden border border-white/20">
                            <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-accent" />
                                    Add Clothing Item
                                </h2>
                                <button onClick={() => setUploadOpen(false)} disabled={uploadStep === "processing"}
                                    className="text-foreground/50 hover:text-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto max-h-[75vh]">
                                {(uploadStep === "initial" || uploadStep === "error") && (
                                    <div className="space-y-4">
                                        {uploadError && (
                                            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm">
                                                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {uploadError}
                                            </div>
                                        )}
                                        <div onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-black/5 transition-colors">
                                            {imagePreview
                                                ? <img src={imagePreview} alt="preview" className="max-h-40 object-contain rounded-xl mb-2" />
                                                : <>
                                                    <Upload className="w-8 h-8 text-foreground/30 mb-2" />
                                                    <p className="text-sm text-foreground/60">Click to select a photo</p>
                                                    <p className="text-xs text-foreground/40 mt-1">JPG, PNG, WEBP — Max 10MB</p>
                                                  </>
                                            }
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1 block">Name *</label>
                                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                                    placeholder="e.g. Black V-Neck"
                                                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1 block">Brand</label>
                                                <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                                                    placeholder="Optional"
                                                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
                                            </div>
                                        </div>
                                        <p className="text-xs text-foreground/40 text-center">
                                            AI will auto-detect category, color, season &amp; fabric.
                                        </p>
                                        <button onClick={handleUpload}
                                            className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium hover:bg-primary/90 transition-all shadow-md mt-2">
                                            Upload to Wardrobe
                                        </button>
                                    </div>
                                )}

                                {uploadStep === "processing" && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="relative w-24 h-24 mb-6">
                                            <div className="absolute inset-0 border-4 border-black/5 dark:border-white/5 rounded-full" />
                                            <div className="absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin" />
                                            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-accent animate-pulse" />
                                        </div>
                                        <h3 className="font-heading text-2xl font-semibold mb-2">AI is working…</h3>
                                        <p className="text-sm text-foreground/60 max-w-xs leading-relaxed">
                                            Removing background, then detecting category, exact color, season &amp; fabric.
                                        </p>
                                    </div>
                                )}

                                {uploadStep === "done" && (
                                    <div className="py-8 flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center mb-6">
                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-xl mb-2">Item Added!</h3>
                                        <p className="text-sm text-foreground/60 mb-6">Your item has been saved with AI classification.</p>
                                        <div className="flex gap-3 w-full">
                                            <button onClick={resetUpload}
                                                className="flex-1 border border-black/10 dark:border-white/10 py-3 rounded-xl font-medium hover:bg-black/5">
                                                Add Another
                                            </button>
                                            <button onClick={() => setUploadOpen(false)}
                                                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 shadow-md">
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Small filter group component ───────────────────────────────────── */
function FilterGroup({
    label, value, options, labels, onChange,
}: { label: string; value: string; options: string[]; labels: string[]; onChange: (v: string) => void }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">{label}</p>
            <div className="flex flex-col gap-1">
                {options.map((opt, i) => (
                    <button key={opt} onClick={() => onChange(opt)}
                        className={`text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all
                            ${value === opt
                                ? "bg-foreground text-background"
                                : "text-foreground/55 hover:bg-foreground/5 hover:text-foreground"}`}>
                        {labels[i]}
                    </button>
                ))}
            </div>
        </div>
    );
}
