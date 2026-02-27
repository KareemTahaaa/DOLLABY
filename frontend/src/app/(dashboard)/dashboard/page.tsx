"use client";

import { motion } from "framer-motion";
import { Shirt, Plus, Calendar as CalendarIcon, Sun } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { apiGetCloset } from "@/lib/api";

type ClothingItem = {
    id: string;
    name: string;
    category: string;
    color: string;
    image_url?: string;
};

const API_BASE = "http://localhost:8000";

export default function DashboardOverview() {
    const [userName, setUserName] = useState("User");
    const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);

    useEffect(() => {
        const storedName = localStorage.getItem("dollaby_userName");
        if (storedName) setUserName(storedName);
        // Fetch real wardrobe items
        apiGetCloset().then(setWardrobeItems).catch(() => { });
    }, []);

    const topCount = wardrobeItems.filter(i => i.category === "Top").length;
    const bottomCount = wardrobeItems.filter(i => i.category === "Bottom").length;
    const otherCount = wardrobeItems.filter(i => !["Top", "Bottom"].includes(i.category)).length;
    const recentItems = wardrobeItems.slice(0, 3);


    return (
        <div className="flex flex-col gap-8 pb-10">

            {/* Header & Quick Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 cursor-default">Good morning, {userName}</h1>
                    <p className="text-foreground/60">Here is your wardrobe overview for today.</p>
                </div>
                <Link href="/closet/upload" className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20 transition-all">
                    <Plus className="w-4 h-4" />
                    Add New Item
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weather & Outline Suggestion */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="col-span-1 lg:col-span-2 p-6 rounded-3xl glass shadow-md border border-white/40 dark:border-white/5 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none" />
                    <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-accent mb-2">
                                <Sun className="w-5 h-5" />
                                <span className="font-medium">72°F / Sunny</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Perfect weather for light layers</h2>
                            <p className="text-foreground/70 mb-6">Your AI stylist recommends a breezy linen shirt with your beige chinos today.</p>
                            <div className="flex gap-3">
                                <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-primary/90 transition-all shadow-md">
                                    Wear Suggestion
                                </button>
                                <button className="glass bg-white/50 px-5 py-2.5 rounded-2xl text-sm font-medium hover:bg-white border border-black/5 transition-all">
                                    Show Alternatives
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4 items-end justify-center w-full sm:w-auto">
                            <div className="w-32 h-40 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm p-3 flex flex-col items-center justify-center transform -rotate-6 hover:rotate-0 transition-all cursor-pointer">
                                <Shirt className="w-10 h-10 text-foreground/20 mb-2" />
                                <span className="text-xs font-semibold text-foreground/50">Linen Shirt</span>
                            </div>
                            <div className="w-32 h-40 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm p-3 flex flex-col items-center justify-center transform rotate-3 hover:rotate-0 transition-all cursor-pointer">
                                <svg className="w-10 h-10 text-foreground/20 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 3 L18 3 L16 21 L8 21 Z" />
                                </svg>
                                <span className="text-xs font-semibold text-foreground/50">Beige Chinos</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Widget */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="col-span-1 p-6 rounded-3xl glass shadow-md border border-white/40 dark:border-white/5 flex flex-col justify-between"
                >
                    <div>
                        <h3 className="font-bold text-lg mb-1">Wardrobe Stats</h3>
                        <p className="text-xs text-foreground/50 mb-6">Total digitized items</p>
                    </div>

                    <div className="flex items-end gap-2 mb-6">
                        <span className="text-5xl font-bold tracking-tighter">{wardrobeItems.length}</span>
                        <span className="text-foreground/50 pb-1 font-medium">Items</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent" /> Tops</span>
                            <span className="font-semibold">{topCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Bottoms</span>
                            <span className="font-semibold">{bottomCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-foreground/20" /> Shoes &amp; Acc.</span>
                            <span className="font-semibold">{otherCount}</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                {/* Recently Added */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="flex justify-between items-end mb-4 px-2">
                        <h3 className="font-bold text-lg">Recently Added</h3>
                        <Link href="/closet" className="text-sm font-medium text-accent hover:underline">View All</Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {recentItems.length === 0 ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="aspect-[3/4] rounded-2xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm p-4 flex items-center justify-center">
                                    <Shirt className="w-12 h-12 text-foreground/10" />
                                </div>
                            ))
                        ) : (
                            recentItems.map(item => (
                                <div key={item.id} className="aspect-[3/4] rounded-2xl bg-white/50 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer">
                                    {item.image_url ? (
                                        <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Shirt className="w-10 h-10 text-foreground/20" /></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Upcoming Outfits */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <div className="flex justify-between items-end mb-4 px-2">
                        <h3 className="font-bold text-lg">Upcoming Outfits</h3>
                        <Link href="/calendar" className="text-sm font-medium text-accent hover:underline">Open Calendar</Link>
                    </div>
                    <div className="flex flex-col gap-3">
                        {[
                            { day: "Tomorrow", event: "Office Presentation", desc: "Navy Suit + White Silk Blouse" },
                            { day: "Saturday", event: "Dinner Party", desc: "Black Midi Dress + Gold Accents" }
                        ].map((plan, idx) => (
                            <div key={idx} className="p-4 rounded-2xl glass border border-white/40 dark:border-white/5 flex items-center gap-4 hover:bg-white/60 transition-colors cursor-pointer">
                                <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                                    <CalendarIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{plan.day} &middot; {plan.event}</h4>
                                    <p className="text-xs text-foreground/60">{plan.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

        </div>
    );
}
