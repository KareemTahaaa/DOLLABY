"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Shirt, X, Loader2, Layers } from "lucide-react";
import { useState, useEffect } from "react";
import { apiGetCalendar, apiSaveCalendarEntry, apiDeleteCalendarEntry, apiGetOutfits, apiGetWeather } from "@/lib/api";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type CalendarEntry = { id: string; date: string; outfit_id?: string; outfit_name?: string; note?: string };
type Outfit = { id: string; name: string };

function isoDate(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarPage() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [outfits, setOutfits] = useState<Outfit[]>([]);
    const [forecasts, setForecasts] = useState<any[]>([]);
    const [location, setLocation] = useState("Loading weather...");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [pickingOutfit, setPickingOutfit] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            apiGetCalendar().catch(() => []),
            apiGetOutfits().catch(() => []),
            apiGetWeather().catch(() => ({ forecast: [], location: "Unknown" }))
        ]).then(([cal, outs, weatherData]) => {
            setEntries(cal);
            setOutfits(outs);
            setForecasts(weatherData.forecast || []);
            setLocation(weatherData.location || "Unknown");
        }).finally(() => setLoading(false));
    }, []);

    const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
    const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

    // Build grid: days from previous month + current month + next month fill
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const cells: { day: number; currentMonth: boolean; date: string }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = daysInPrev - i;
        cells.push({ day: d, currentMonth: false, date: isoDate(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, currentMonth: true, date: isoDate(year, month, d) });
    }
    let fill = 1;
    while (cells.length % 7 !== 0) {
        cells.push({ day: fill++, currentMonth: false, date: isoDate(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, fill - 1) });
    }

    const entryMap = Object.fromEntries(entries.map(e => [e.date, e]));
    const forecastMap = Object.fromEntries(forecasts.map(f => [f.date, f]));
    const today = isoDate(now.getFullYear(), now.getMonth(), now.getDate());

    const selectedEntry = selectedDate ? entryMap[selectedDate] : null;

    const handleAssign = async (outfit: Outfit) => {
        if (!selectedDate) return;
        setSaving(true);
        try {
            const saved = await apiSaveCalendarEntry({ date: selectedDate, outfit_id: outfit.id, outfit_name: outfit.name });
            setEntries(prev => {
                const filtered = prev.filter(e => e.date !== selectedDate);
                return [...filtered, saved];
            });
        } finally {
            setSaving(false);
            setPickingOutfit(false);
        }
    };

    const handleRemove = async () => {
        if (!selectedEntry) return;
        setSaving(true);
        try {
            await apiDeleteCalendarEntry(selectedEntry.id);
            setEntries(prev => prev.filter(e => e.id !== selectedEntry.id));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-140px)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Wardrobe Calendar</h1>
                    <p className="text-foreground/60">Plan your looks ahead of time. Weather for <span className="font-semibold text-foreground/80">{location}</span>.</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 flex-1 min-h-0">
                {/* Calendar View */}
                <div className="flex-[2] glass rounded-3xl p-8 border border-black/5 dark:border-white/5 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold">{MONTHS[month]} {year}</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={prevMonth} className="w-10 h-10 rounded-full glass border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-foreground/70" />
                            </button>
                            <button onClick={nextMonth} className="w-10 h-10 rounded-full glass border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <ChevronRight className="w-5 h-5 text-foreground/70" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-3">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="text-center text-xs font-semibold text-foreground/40 uppercase tracking-widest">{day}</div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center gap-2 text-foreground/40">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading calendar…
                        </div>
                    ) : (
                        <div className="flex-1 grid grid-cols-7 gap-2 auto-rows-fr">
                            {cells.map((cell, idx) => {
                                const entry = entryMap[cell.date];
                                const isToday = cell.date === today;
                                const isSelected = cell.date === selectedDate;
                                const weather = forecastMap[cell.date];
                                return (
                                    <motion.div
                                        key={idx}
                                        whileHover={{ scale: cell.currentMonth ? 1.04 : 1 }}
                                        onClick={() => { if (cell.currentMonth) setSelectedDate(cell.date); }}
                                        className={`relative rounded-2xl p-1.5 border transition-all flex flex-col items-center cursor-pointer
                                            ${!cell.currentMonth ? "opacity-25 cursor-default border-transparent" : ""}
                                            ${isSelected ? "ring-2 ring-accent border-accent/30 bg-accent/5" : isToday ? "ring-2 ring-primary border-primary/20" : "border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 hover:border-accent/40 hover:shadow-sm"}
                                        `}
                                    >
                                        <span className={`text-xs font-semibold mb-1 ${isToday ? "text-primary" : isSelected ? "text-accent" : ""}`}>{cell.day}</span>
                                        {weather && cell.currentMonth && (
                                            <div className="flex items-center gap-1 text-[10px] text-foreground/60 mb-1.5 font-medium bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                                <span>{weather.icon}</span> <span>{weather.maxText}</span>
                                            </div>
                                        )}
                                        {entry ? (
                                            <div className="w-full flex-1 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center min-h-6">
                                                <Shirt className="w-3.5 h-3.5 text-accent" />
                                            </div>
                                        ) : cell.currentMonth ? (
                                            <div className="w-full flex-1 rounded-xl border border-dashed border-black/10 dark:border-white/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity min-h-6">
                                                <Plus className="w-3 h-3 text-foreground/30" />
                                            </div>
                                        ) : null}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Side Panel */}
                <div className="flex-1 max-w-sm glass rounded-3xl p-8 border border-black/5 dark:border-white/5 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl -mx-10 -my-10 pointer-events-none" />
                    <div className="relative z-10 flex-1 flex flex-col">
                        {selectedDate ? (
                            <>
                                <div className="flex items-center justify-between mb-6 border-b border-black/5 dark:border-white/5 border-dashed pb-4">
                                    <div className="flex items-center gap-3 text-accent">
                                        <CalendarIcon className="w-5 h-5" />
                                        <span className="font-semibold text-sm">
                                            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                                        </span>
                                    </div>
                                    {forecastMap[selectedDate] && (
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 justify-end font-semibold">
                                                <span className="text-lg">{forecastMap[selectedDate].icon}</span>
                                                {forecastMap[selectedDate].maxText}
                                            </div>
                                            <p className="text-[10px] text-foreground/50">{forecastMap[selectedDate].condition}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedEntry ? (
                                    <>
                                        <h3 className="text-xl font-bold mb-1">Outfit Scheduled</h3>
                                        <p className="text-foreground/60 text-sm mb-6">{selectedEntry.outfit_name}</p>
                                        <div className="aspect-[3/4] w-full rounded-2xl bg-accent/5 border border-accent/20 flex flex-col items-center justify-center mb-6 gap-3">
                                            <Layers className="w-12 h-12 text-accent/40" />
                                            <p className="text-sm font-medium text-foreground/60">{selectedEntry.outfit_name}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setPickingOutfit(true)} className="flex-1 py-3 rounded-2xl border border-black/10 dark:border-white/10 text-sm font-medium hover:bg-black/5 transition-colors">
                                                Change
                                            </button>
                                            <button onClick={handleRemove} disabled={saving} className="flex-1 py-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-200 dark:border-red-800 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50">
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Remove"}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-bold mb-1">No outfit yet</h3>
                                        <p className="text-foreground/60 text-sm mb-6">Assign a saved outfit to this day.</p>
                                        <button
                                            onClick={() => setPickingOutfit(true)}
                                            className="w-full bg-primary text-primary-foreground py-3 rounded-2xl text-sm font-medium hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Assign Outfit
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center text-foreground/40 gap-3">
                                <CalendarIcon className="w-12 h-12" />
                                <p className="font-medium">Select a day</p>
                                <p className="text-sm">Click any date to assign or view an outfit.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Outfit Picker Modal */}
            <AnimatePresence>
                {pickingOutfit && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-white dark:bg-[#111] rounded-[2rem] shadow-2xl overflow-hidden border border-black/10 dark:border-white/10 flex flex-col max-h-[80vh]"
                        >
                            <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
                                <h2 className="text-xl font-bold">Pick an Outfit</h2>
                                <button onClick={() => setPickingOutfit(false)} className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {outfits.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-foreground/40 gap-2 text-sm text-center">
                                        <Layers className="w-8 h-8" />
                                        <p>No saved outfits.<br />Build one in the Outfit Builder first.</p>
                                    </div>
                                ) : outfits.map((outfit) => (
                                    <button
                                        key={outfit.id}
                                        onClick={() => handleAssign(outfit)}
                                        disabled={saving}
                                        className="w-full text-left px-5 py-4 rounded-2xl border border-black/5 dark:border-white/5 hover:border-accent hover:bg-accent/5 transition-all text-sm font-medium disabled:opacity-50"
                                    >
                                        {outfit.name}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
