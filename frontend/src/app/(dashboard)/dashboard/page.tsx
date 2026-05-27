"use client";

import { motion } from "framer-motion";
import { Shirt, Calendar as CalendarIcon, ArrowRight, Cloud, Wind, Droplets, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { apiGetCloset, apiGetWeather, apiGetCalendar } from "@/lib/api";

type ClothingItem = { id: string; name: string; category: string; color: string; image_url?: string };
type WeatherDay = { date: string; maxText: string; minText: string; condition: string; icon: string; description: string };
type CalendarEntry = { id: string; date: string; outfit_id?: string; outfit_name?: string; note?: string };

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

function formatDate(iso: string) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function weatherSuggestion(condition: string, maxTemp: number): string {
    const c = condition.toLowerCase();
    if (maxTemp >= 30) return "It's hot — light fabrics and breathable layers.";
    if (maxTemp >= 22) return "Warm and pleasant — a perfect day for casual looks.";
    if (maxTemp >= 15) return "A light jacket will keep you comfortable.";
    if (maxTemp >= 8) return "Layer up today — it's a bit chilly.";
    return "Bundle up! Heavy outerwear is a must today.";
}

export default function DashboardOverview() {
    const [userName, setUserName] = useState("User");
    const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
    const [weather, setWeather] = useState<{ location: string; today: WeatherDay } | null>(null);
    const [upcomingEntries, setUpcomingEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedName = localStorage.getItem("dollaby_userName");
        if (storedName) setUserName(storedName);

        const today = new Date().toISOString().split("T")[0];

        Promise.all([
            apiGetCloset().catch(() => []),
            apiGetWeather().catch(() => null),
            apiGetCalendar().catch(() => []),
        ]).then(([items, weatherData, calendarData]) => {
            setWardrobeItems(items);
            if (weatherData?.forecast?.length) {
                setWeather({ location: weatherData.location, today: weatherData.forecast[0] });
            }
            // Filter upcoming entries (today and future, with outfit assigned)
            const upcoming = (calendarData as CalendarEntry[])
                .filter(e => e.date >= today && e.outfit_name)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 3);
            setUpcomingEntries(upcoming);
        }).finally(() => setLoading(false));
    }, []);

    const topCount = wardrobeItems.filter(i => i.category === "Top").length;
    const bottomCount = wardrobeItems.filter(i => i.category === "Bottom").length;
    const shoeCount = wardrobeItems.filter(i => i.category === "Shoes").length;
    const otherCount = wardrobeItems.filter(i => !["Top", "Bottom", "Shoes"].includes(i.category)).length;
    const recentItems = wardrobeItems.slice(0, 4);

    const maxTemp = weather ? parseInt(weather.today.maxText) : null;

    const stagger = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: i * 0.08 } });

    return (
        <div className="flex flex-col gap-7 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <p className="text-sm text-foreground/40 font-medium mb-1 tracking-wide">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                    <h1 className="font-heading text-4xl font-semibold tracking-tight">{getGreeting()}, {userName}</h1>
                </div>
                <Link href="/closet"
                    className="inline-flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity self-start md:self-auto">
                    Add to closet <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Top row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Weather Card */}
                <motion.div {...stagger(0)}
                    className="col-span-1 lg:col-span-2 rounded-3xl p-7 relative overflow-hidden border border-black/5 dark:border-white/5"
                    style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.02) 60%, transparent 100%)" }}>
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40"
                        style={{ background: "radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

                    {loading ? (
                        <div className="flex items-center gap-3 text-foreground/40">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading weather…</span>
                        </div>
                    ) : weather ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8 relative z-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-5xl">{weather.today.icon}</span>
                                    <div>
                                        <p className="text-3xl font-heading font-semibold">{weather.today.maxText}</p>
                                        <p className="text-sm text-foreground/50">{weather.today.condition} · {weather.location}</p>
                                    </div>
                                </div>
                                <p className="text-foreground/70 text-sm mb-5 max-w-sm leading-relaxed">
                                    {maxTemp !== null ? weatherSuggestion(weather.today.condition, maxTemp) : "Check your wardrobe for today's look."}
                                </p>
                                <div className="flex gap-4 text-xs text-foreground/50">
                                    <span className="flex items-center gap-1.5"><Wind className="w-3.5 h-3.5" /> {weather.today.minText} low</span>
                                    <span className="flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> {weather.today.condition}</span>
                                </div>
                            </div>
                            <div className="flex gap-3 items-end justify-center">
                                <Link href="/outfits"
                                    className="flex items-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-2xl text-sm font-medium hover:opacity-80 transition-opacity">
                                    Build outfit <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <p className="font-heading text-2xl font-semibold mb-2">Style your day</p>
                            <p className="text-foreground/60 text-sm mb-4">Weather unavailable — but your wardrobe is ready.</p>
                            <Link href="/outfits" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline">
                                Build an outfit <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Wardrobe Stats */}
                <motion.div {...stagger(1)}
                    className="col-span-1 rounded-3xl p-6 border border-black/5 dark:border-white/5 glass flex flex-col justify-between">
                    <div>
                        <p className="text-xs text-foreground/40 uppercase tracking-[0.1em] font-medium mb-1">Wardrobe</p>
                        <div className="flex items-baseline gap-2 mb-5">
                            {loading ? <div className="skeleton h-12 w-20" /> : (
                                <span className="font-heading text-5xl font-semibold tracking-tight">{wardrobeItems.length}</span>
                            )}
                            <span className="text-foreground/40 text-sm">items</span>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {[
                            { label: "Tops", count: topCount, color: "#c9a84c" },
                            { label: "Bottoms", count: bottomCount, color: "#111111" },
                            { label: "Shoes", count: shoeCount, color: "#888877" },
                            { label: "Other", count: otherCount, color: "#cccccc" },
                        ].map(({ label, count, color }) => (
                            <div key={label} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-foreground/70">
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                    {label}
                                </span>
                                <span className="font-semibold tabular-nums">{loading ? "—" : count}</span>
                            </div>
                        ))}
                    </div>

                    <Link href="/closet" className="mt-5 text-xs text-foreground/40 hover:text-accent transition-colors flex items-center gap-1 font-medium">
                        View all items <ArrowRight className="w-3 h-3" />
                    </Link>
                </motion.div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Recently Added */}
                <motion.div {...stagger(2)}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-heading text-xl font-semibold">Recently Added</h3>
                        <Link href="/closet" className="text-xs font-medium text-foreground/40 hover:text-accent transition-colors flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {loading
                            ? [1, 2, 3, 4].map(i => <div key={i} className="aspect-[3/4] skeleton" />)
                            : recentItems.length === 0
                                ? [1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-[3/4] rounded-2xl glass border border-black/5 flex items-center justify-center">
                                        <Shirt className="w-8 h-8 text-foreground/10" />
                                    </div>
                                ))
                                : recentItems.map(item => (
                                    <Link href="/closet" key={item.id}
                                        className="aspect-[3/4] rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 glass hover:shadow-md transition-all group">
                                        {item.image_url
                                            ? <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300" />
                                            : <div className="w-full h-full flex items-center justify-center"><Shirt className="w-8 h-8 text-foreground/15" /></div>
                                        }
                                    </Link>
                                ))
                        }
                    </div>
                </motion.div>

                {/* Upcoming Outfits */}
                <motion.div {...stagger(3)}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-heading text-xl font-semibold">Upcoming Outfits</h3>
                        <Link href="/calendar" className="text-xs font-medium text-foreground/40 hover:text-accent transition-colors flex items-center gap-1">
                            Calendar <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {loading ? (
                            [1, 2].map(i => <div key={i} className="skeleton h-16 w-full" />)
                        ) : upcomingEntries.length === 0 ? (
                            <div className="p-6 rounded-2xl border border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center text-center gap-2 text-foreground/40">
                                <CalendarIcon className="w-8 h-8" />
                                <p className="text-sm">No upcoming outfits planned.</p>
                                <Link href="/calendar" className="text-xs text-accent hover:underline font-medium">Plan your week →</Link>
                            </div>
                        ) : (
                            upcomingEntries.map((entry) => (
                                <Link href="/calendar" key={entry.id}
                                    className="p-4 rounded-2xl border border-black/5 dark:border-white/5 glass flex items-center gap-4 hover:border-accent/30 transition-all group">
                                    <div className="w-10 h-10 rounded-xl border border-accent/20 bg-accent/8 flex items-center justify-center flex-shrink-0">
                                        <CalendarIcon className="w-4 h-4 text-accent" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-semibold text-sm truncate group-hover:text-accent transition-colors">{entry.outfit_name}</h4>
                                        <p className="text-xs text-foreground/50 mt-0.5">{formatDate(entry.date)}</p>
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-foreground/20 group-hover:text-accent ml-auto transition-colors flex-shrink-0" />
                                </Link>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
