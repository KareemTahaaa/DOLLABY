"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Shirt } from "lucide-react";
import { useState } from "react";

// Mock calendar data
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const mockDays = Array.from({ length: 35 }, (_, i) => ({
    date: i + 1 > 31 ? i - 30 : i + 1,
    isCurrentMonth: i + 1 <= 31,
    hasOutfit: [5, 12, 18, 24].includes(i + 1),
    isToday: i + 1 === 18,
}));

export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState("October 2026");

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Wardrobe Calendar</h1>
                    <p className="text-foreground/60">Plan your looks ahead of time.</p>
                </div>
                <button
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md"
                >
                    <Plus className="w-4 h-4" />
                    Schedule Outfit
                </button>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 flex-1 min-h-0">

                {/* Calendar View */}
                <div className="flex-[2] glass rounded-3xl p-8 border border-black/5 dark:border-white/5 flex flex-col">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold">{currentMonth}</h2>
                        <div className="flex items-center gap-2">
                            <button className="w-10 h-10 rounded-full glass border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-foreground/70" />
                            </button>
                            <button className="w-10 h-10 rounded-full glass border border-black/5 dark:border-white/5 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <ChevronRight className="w-5 h-5 text-foreground/70" />
                            </button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-4 mb-4">
                        {daysOfWeek.map(day => (
                            <div key={day} className="text-center text-sm font-semibold text-foreground/50 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 grid grid-cols-7 gap-4 auto-rows-fr">
                        {mockDays.map((day, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ scale: day.isCurrentMonth ? 1.05 : 1 }}
                                className={`relative rounded-2xl p-2 border transition-colors flex flex-col items-center justify-center cursor-pointer group
                  ${day.isCurrentMonth ? "bg-white/40 dark:bg-black/20 hover:border-accent hover:shadow-md border-black/5 dark:border-white/5" : "opacity-30 border-transparent cursor-default"}
                  ${day.isToday ? "ring-2 ring-accent border-transparent" : ""}
                `}
                            >
                                <span className={`text-sm font-medium mb-1 ${day.isToday ? "text-accent" : "text-foreground"}`}>
                                    {day.date}
                                </span>

                                {day.hasOutfit ? (
                                    <div className="w-full flex-1 rounded-xl bg-accent/10 border border-accent/20 flex flex-col items-center justify-center gap-1 overflow-hidden relative">
                                        <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-multiply" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=200&q=80)' }} />
                                        <Shirt className="w-5 h-5 text-accent relative z-10" />
                                    </div>
                                ) : (
                                    <div className="w-full flex-1 rounded-xl border border-dashed border-black/10 dark:border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus className="w-4 h-4 text-foreground/40" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Selected Day Details */}
                <div className="flex-1 max-w-sm glass rounded-3xl p-8 border border-black/5 dark:border-white/5 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl -mx-10 -my-10 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 text-accent mb-6">
                            <CalendarIcon className="w-5 h-5" />
                            <span className="font-semibold uppercase tracking-wider text-sm">October 18, 2026</span>
                        </div>

                        <h3 className="text-2xl font-bold mb-2">Today's Outfit</h3>
                        <p className="text-foreground/60 text-sm mb-8">You have an important client meeting and a dinner party scheduled.</p>

                        <div className="aspect-[3/4] w-full rounded-2xl bg-white/40 dark:bg-black/20 border border-black/5 dark:border-white/5 p-4 mb-6 shadow-sm relative group overflow-hidden">
                            <div
                                className="w-full h-full bg-contain bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-500"
                                style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&q=80)', mixBlendMode: 'multiply' }}
                            />
                            <button className="absolute bottom-4 right-4 bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-semibold shadow-sm hover:text-accent transition-colors">
                                Edit Look
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
                            <div>
                                <h4 className="font-semibold text-sm">Need a change?</h4>
                                <p className="text-xs text-foreground/60">Generate a new suggestion.</p>
                            </div>
                            <button className="text-accent hover:text-accent/80 transition-colors p-2 bg-white/50 dark:bg-black/50 rounded-full shadow-sm">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
