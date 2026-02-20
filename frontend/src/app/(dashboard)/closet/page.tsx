"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Upload, Filter, Search, Tag, Trash2, Edit2, X, Sparkles, Shirt } from "lucide-react";
import { useState } from "react";

const mockClothes = [
    { id: 1, name: "Black V-Neck", category: "Top", color: "Black", season: "All", fabric: "Cotton", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80" },
    { id: 2, name: "Classic Blue Jeans", category: "Bottom", color: "Blue", season: "All", fabric: "Denim", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&q=80" },
    { id: 3, name: "Beige Trench Coat", category: "Outerwear", color: "Beige", season: "Winter", fabric: "Wool", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80" },
    { id: 4, name: "White Sneakers", category: "Shoes", color: "White", season: "All", fabric: "Leather", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80" },
];

export default function MyClosetPage() {
    const [filterOpen, setFilterOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadStep, setUploadStep] = useState<"initial" | "processing" | "done">("initial");

    const triggerUploadMock = () => {
        setUploadStep("processing");
        setTimeout(() => {
            setUploadStep("done");
        }, 2500);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">My Closet</h1>
                    <p className="text-foreground/60">{mockClothes.length} items digitized</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setFilterOpen(!filterOpen)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all border ${filterOpen ? "bg-accent/10 text-accent border-accent/20" : "glass border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>

                    <button
                        onClick={() => { setUploadOpen(true); setUploadStep("initial"); }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md hover:shadow-xl hover:shadow-primary/20"
                    >
                        <Upload className="w-4 h-4" />
                        Upload Item
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex gap-6 flex-1 min-h-0">

                {/* Filter Panel (Animated) */}
                <AnimatePresence>
                    {filterOpen && (
                        <motion.div
                            initial={{ opacity: 0, width: 0, x: -20 }}
                            animate={{ opacity: 1, width: 280, x: 0 }}
                            exit={{ opacity: 0, width: 0, x: -20, transition: { duration: 0.2 } }}
                            className="flex-shrink-0 h-full overflow-y-auto glass rounded-3xl p-6 border border-black/5 dark:border-white/5"
                        >
                            <h3 className="font-semibold mb-6 flex items-center justify-between">
                                Filter Items
                                <button onClick={() => setFilterOpen(false)} className="text-foreground/40 hover:text-foreground">
                                    <X className="w-4 h-4" />
                                </button>
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">Category</label>
                                    <div className="flex flex-col gap-2">
                                        {["Tops", "Bottoms", "Outerwear", "Shoes", "Accessories"].map(cat => (
                                            <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer hover:text-accent transition-colors">
                                                <input type="checkbox" className="rounded-sm border-black/20 text-accent focus:ring-accent" />
                                                {cat}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">Season</label>
                                    <div className="flex flex-wrap gap-2">
                                        {["Summer", "Winter", "Spring", "Fall", "All"].map(season => (
                                            <button key={season} className="px-3 py-1 rounded-full text-xs font-medium border border-black/10 dark:border-white/10 hover:border-accent hover:text-accent transition-colors">
                                                {season}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">Color</label>
                                    <div className="flex flex-wrap gap-2">
                                        {["bg-black", "bg-white border border-black/10", "bg-blue-500", "bg-red-500", "bg-yellow-800", "bg-green-600"].map((colorClass, idx) => (
                                            <button key={idx} className={`w-6 h-6 rounded-full ${colorClass} hover:scale-110 transition-transform shadow-sm`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Clothing Grid */}
                <div className="flex-1 overflow-y-auto pb-10">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {mockClothes.map((item, idx) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                key={item.id}
                                className="group relative aspect-[3/4] rounded-3xl glass border border-black/5 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-xl transition-all"
                            >
                                {/* Image Placeholder (assuming 2D PNGs without background) */}
                                <div className="absolute inset-0 p-4 pb-16 flex items-center justify-center bg-white/40 dark:bg-black/20">
                                    <div
                                        className="w-full h-full bg-contain bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-110 rounded-xl"
                                        style={{ backgroundImage: `url(${item.image})`, mixBlendMode: 'multiply' }}
                                    />
                                </div>

                                {/* Overlay actions */}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md flex items-center justify-center text-foreground hover:text-accent transition-colors shadow-sm">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md flex items-center justify-center text-red-500 hover:text-red-600 transition-colors shadow-sm">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Details Footer */}
                                <div className="absolute bottom-0 inset-x-0 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 px-4 flex flex-col justify-center transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                    <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/60">
                                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {item.category}</span>
                                        <span>&bull;</span>
                                        <span>{item.fabric}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Upload Modal */}
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
                                    AI Garment Processing
                                </h2>
                                <button onClick={() => setUploadOpen(false)} disabled={uploadStep === "processing"} className="text-foreground/50 hover:text-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8">
                                {uploadStep === "initial" && (
                                    <div className="border-2 border-dashed border-black/20 dark:border-white/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={triggerUploadMock}>
                                        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4 text-accent">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-1">Click to browse or drag image</h3>
                                        <p className="text-sm text-foreground/60 mb-4">Supported formats: JPG, PNG, WEBP (Max 5MB)</p>
                                        <div className="flex gap-2">
                                            <span className="text-xs bg-primary/5 px-2 py-1 rounded-md text-primary font-medium">U²-Net BG Removal</span>
                                            <span className="text-xs bg-primary/5 px-2 py-1 rounded-md text-primary font-medium">CNN Tagging</span>
                                        </div>
                                    </div>
                                )}

                                {uploadStep === "processing" && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="relative w-24 h-24 mb-6">
                                            <div className="absolute inset-0 border-4 border-black/5 dark:border-white/5 rounded-full" />
                                            <div className="absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin" />
                                            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-accent animate-pulse" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">Analyzing Garment...</h3>
                                        <p className="text-sm text-foreground/60 max-w-xs">Removing background and extracting metadata (color, season, fabric) via AI.</p>
                                    </div>
                                )}

                                {uploadStep === "done" && (
                                    <div className="py-8 flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-600 flex items-center justify-center mb-6">
                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-xl mb-2">Processing Complete</h3>
                                        <p className="text-sm text-foreground/60 mb-6">Item successfully added to your digital wardrobe with AI tags.</p>
                                        <button onClick={() => setUploadOpen(false)} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium shadow-md hover:bg-primary/90 transition-all w-full">
                                            View in Closet
                                        </button>
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
