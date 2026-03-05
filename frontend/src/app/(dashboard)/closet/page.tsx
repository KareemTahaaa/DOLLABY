"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Upload, Filter, Search, Tag, Trash2, X, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiGetCloset, apiDeleteItem, apiUploadItem } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";


type ClothingItem = {
    id: string;
    name: string;
    category: string;
    color: string;
    season: string;
    brand?: string;
    fabric?: string;
    tags?: string[];
    image_url?: string;
};

const CATEGORIES = ["Top", "Bottom", "Outerwear", "Shoes", "Accessories", "Dress"];
const SEASONS = ["Summer", "Winter", "Spring", "Fall", "All"];

export default function MyClosetPage() {
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadStep, setUploadStep] = useState<"initial" | "processing" | "done" | "error">("initial");
    const [uploadError, setUploadError] = useState("");
    const [search, setSearch] = useState("");
    const [filterCategory, setFilterCategory] = useState<string[]>([]);
    const [filterSeason, setFilterSeason] = useState<string | null>(null);

    // Upload form state
    const [form, setForm] = useState({ name: "", category: "Top", color: "", season: "All", brand: "", fabric: "" });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await apiGetCloset();
            setItems(data);
        } catch (err: any) {
            setError(err.message ?? "Failed to load wardrobe. Make sure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiDeleteItem(id);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            alert("Failed to delete: " + err.message);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!imageFile) { setUploadError("Please select an image."); return; }
        if (!form.name || !form.color) { setUploadError("Name and color are required."); return; }

        setUploadStep("processing");
        setUploadError("");
        try {
            const fd = new FormData();
            fd.append("image", imageFile);
            fd.append("name", form.name);
            fd.append("category", form.category);
            fd.append("color", form.color);
            fd.append("season", form.season);
            if (form.brand) fd.append("brand", form.brand);
            if (form.fabric) fd.append("fabric", form.fabric);

            const newItem = await apiUploadItem(fd);
            setItems(prev => [newItem, ...prev]);
            setUploadStep("done");
        } catch (err: any) {
            setUploadError(err.message ?? "Upload failed");
            setUploadStep("error");
        }
    };

    const resetUpload = () => {
        setUploadStep("initial");
        setUploadError("");
        setImageFile(null);
        setImagePreview(null);
        setForm({ name: "", category: "Top", color: "", season: "All", brand: "", fabric: "" });
    };

    const filteredItems = items.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCategory.length === 0 || filterCategory.includes(item.category);
        const matchSeason = !filterSeason || item.season === filterSeason || item.season === "All";
        return matchSearch && matchCat && matchSeason;
    });

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">My Closet</h1>
                    <p className="text-foreground/60">{items.length} items digitized</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-full text-sm bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <button
                        onClick={() => setFilterOpen(!filterOpen)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all border ${filterOpen ? "bg-accent/10 text-accent border-accent/20" : "glass border-black/5 dark:border-white/5"}`}
                    >
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                    <button
                        onClick={() => { setUploadOpen(true); resetUpload(); }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md"
                    >
                        <Upload className="w-4 h-4" /> Upload Item
                    </button>
                </div>
            </div>

            <div className="flex gap-6 flex-1 min-h-0">
                {/* Filter Panel */}
                <AnimatePresence>
                    {filterOpen && (
                        <motion.div
                            initial={{ opacity: 0, width: 0, x: -20 }}
                            animate={{ opacity: 1, width: 260, x: 0 }}
                            exit={{ opacity: 0, width: 0, x: -20, transition: { duration: 0.2 } }}
                            className="flex-shrink-0 h-full overflow-y-auto glass rounded-3xl p-6 border border-black/5 dark:border-white/5"
                        >
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
                                                <input
                                                    type="checkbox"
                                                    checked={filterCategory.includes(cat)}
                                                    onChange={e => setFilterCategory(prev => e.target.checked ? [...prev, cat] : prev.filter(c => c !== cat))}
                                                    className="rounded border-black/20 text-accent"
                                                />
                                                {cat}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3 block">Season</label>
                                    <div className="flex flex-wrap gap-2">
                                        {SEASONS.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setFilterSeason(filterSeason === s ? null : s)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filterSeason === s ? "bg-accent text-white border-accent" : "border-black/10 dark:border-white/10 hover:border-accent hover:text-accent"}`}
                                            >{s}</button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => { setFilterCategory([]); setFilterSeason(null); }} className="text-xs text-foreground/50 hover:text-accent transition-colors">Clear all filters</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Clothing Grid */}
                <div className="flex-1 overflow-y-auto pb-10">
                    {loading && (
                        <div className="flex items-center justify-center h-48 gap-3 text-foreground/50">
                            <Loader2 className="w-6 h-6 animate-spin" /> Loading wardrobe...
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
                            <p className="font-medium">No items yet. Upload your first garment!</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item, idx) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: idx * 0.04 }}
                                key={item.id}
                                className="group relative aspect-[3/4] rounded-3xl glass border border-black/5 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-xl transition-all"
                            >
                                <div className="absolute inset-0 p-4 pb-16 flex items-center justify-center bg-white/40 dark:bg-black/20">
                                    {item.image_url ? (
                                        <img
                                            src={`${API_BASE}${item.image_url}`}
                                            alt={item.name}
                                            className="w-full h-full object-contain rounded-xl transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-foreground/20">
                                            <Tag className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md flex items-center justify-center text-red-500 hover:text-red-600 transition-colors shadow-sm"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 px-4 flex flex-col justify-center">
                                    <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/60">
                                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {item.category}</span>
                                        <span>&bull;</span>
                                        <span>{item.color}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {uploadOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg glass dark:glass-dark rounded-[2rem] shadow-2xl overflow-hidden border border-white/20"
                        >
                            <div className="p-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-accent" />
                                    Add Clothing Item
                                </h2>
                                <button onClick={() => setUploadOpen(false)} disabled={uploadStep === "processing"} className="text-foreground/50 hover:text-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto max-h-[75vh]">
                                {uploadStep === "initial" || uploadStep === "error" ? (
                                    <div className="space-y-4">
                                        {uploadError && (
                                            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm">
                                                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {uploadError}
                                            </div>
                                        )}
                                        {/* Image picker */}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-black/5 transition-colors"
                                        >
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="preview" className="max-h-40 object-contain rounded-xl mb-2" />
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-foreground/30 mb-2" />
                                                    <p className="text-sm text-foreground/60">Click to select a photo</p>
                                                    <p className="text-xs text-foreground/40 mt-1">JPG, PNG, WEBP — Max 10MB</p>
                                                </>
                                            )}
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1 block">Name *</label>
                                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Black V-Neck" className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1 block">Color *</label>
                                                <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="e.g. Navy Blue" className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1 block">Category</label>
                                                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm">
                                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1 block">Season</label>
                                                <select value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm">
                                                    {SEASONS.map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1 block">Brand</label>
                                                <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Optional" className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1 block">Fabric</label>
                                                <input value={form.fabric} onChange={e => setForm(f => ({ ...f, fabric: e.target.value }))} placeholder="Optional" className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleUpload}
                                            className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium hover:bg-primary/90 transition-all shadow-md mt-2"
                                        >
                                            Upload to Wardrobe
                                        </button>
                                    </div>
                                ) : uploadStep === "processing" ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="relative w-24 h-24 mb-6">
                                            <div className="absolute inset-0 border-4 border-black/5 dark:border-white/5 rounded-full" />
                                            <div className="absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin" />
                                            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-accent animate-pulse" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">Uploading Item...</h3>
                                        <p className="text-sm text-foreground/60 max-w-xs">Saving to your digital wardrobe.</p>
                                    </div>
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center mb-6">
                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-xl mb-2">Item Added!</h3>
                                        <p className="text-sm text-foreground/60 mb-6">Your item has been saved to your wardrobe.</p>
                                        <div className="flex gap-3 w-full">
                                            <button onClick={resetUpload} className="flex-1 border border-black/10 dark:border-white/10 py-3 rounded-xl font-medium hover:bg-black/5">Add Another</button>
                                            <button onClick={() => setUploadOpen(false)} className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 shadow-md">Done</button>
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
