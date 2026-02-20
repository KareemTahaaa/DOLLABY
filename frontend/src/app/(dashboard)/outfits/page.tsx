"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shirt, CheckCircle2, Star, Target, Save, Info, Sparkles } from "lucide-react";
import { useState } from "react";

const availableClothes = {
    Top: [
        { id: 1, name: "Silk Blouse", color: "Ivory", image: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=500&q=80" },
        { id: 2, name: "Ribbed Turtleneck", color: "Black", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80" },
    ],
    Bottom: [
        { id: 3, name: "Tailored Trousers", color: "Beige", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&q=80" },
        { id: 4, name: "Pleated Skirt", color: "Black", image: "https://images.unsplash.com/photo-1582142407894-ec85a1260a46?w=500&q=80" },
    ],
    Shoes: [
        { id: 5, name: "Leather Loafers", color: "Brown", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&q=80" },
    ],
    Accessories: [
        { id: 6, name: "Gold Minimalist Watch", color: "Gold", image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500&q=80" },
    ]
};

type Slot = "Top" | "Bottom" | "Shoes" | "Accessories";

export default function OutfitBuilderPage() {
    const [activeSlot, setActiveSlot] = useState<Slot>("Top");
    const [outfit, setOutfit] = useState<Record<Slot, any | null>>({
        Top: null,
        Bottom: null,
        Shoes: null,
        Accessories: null,
    });

    const [aiScore, setAiScore] = useState<number | null>(null);

    const handleSelectItem = (item: any, slot: Slot) => {
        setOutfit(prev => {
            const newOutfit = { ...prev, [slot]: item };
            // Simulate AI evaluating color harmony
            const filledSlots = Object.values(newOutfit).filter(Boolean).length;
            if (filledSlots >= 2) {
                setAiScore(Math.floor(Math.random() * 15) + 85); // Score between 85-99
            } else {
                setAiScore(null);
            }
            return newOutfit;
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Outfit Builder</h1>
                    <p className="text-foreground/60">Mix and match to create your perfect look.</p>
                </div>
                <button
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={Object.values(outfit).filter(Boolean).length === 0}
                >
                    <Save className="w-4 h-4" />
                    Save Outfit
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">

                {/* Outfit Canvas & AI Suggestions */}
                <div className="flex-[1.5] flex flex-col gap-6">
                    <div className="flex-1 glass rounded-3xl p-8 border border-black/5 dark:border-white/5 relative flex items-center justify-center">

                        {/* AI Score Badge overlay */}
                        <AnimatePresence>
                            {aiScore && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: -20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute top-6 right-6 bg-green-500/10 text-green-600 border border-green-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm font-medium"
                                >
                                    <Target className="w-4 h-4" />
                                    Color Harmony: {aiScore}%
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* The Outfit Slots */}
                        <div className="relative w-full max-w-sm flex flex-col items-center gap-4">
                            {(Object.keys(outfit) as Slot[]).map((slot) => {
                                const item = outfit[slot];
                                return (
                                    <motion.button
                                        layout
                                        key={slot}
                                        onClick={() => setActiveSlot(slot)}
                                        className={`w-4/5 ${slot === "Accessories" ? "w-1/2 aspect-square self-start absolute right-0 top-1/4" : "aspect-[16/9]"} 
                        rounded-2xl border-2 flex items-center justify-center transition-all overflow-hidden relative group
                        ${activeSlot === slot ? "border-accent ring-4 ring-accent/10" : "border-dashed border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30"}
                        ${item ? 'bg-white/40 dark:bg-black/20' : 'bg-transparent'}
                      `}
                                    >
                                        {item ? (
                                            <div
                                                className="absolute inset-0 bg-contain bg-center bg-no-repeat"
                                                style={{ backgroundImage: `url(${item.image})`, mixBlendMode: 'multiply' }}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center text-foreground/30 group-hover:text-foreground/50 transition-colors">
                                                <Shirt className="w-6 h-6 mb-2" />
                                                <span className="text-xs font-semibold uppercase tracking-wider">{slot}</span>
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="h-32 rounded-3xl p-6 bg-gradient-to-r from-accent/10 to-transparent border border-accent/20 flex items-center gap-6">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-1">AI Stylist Suggestion</h3>
                            {outfit.Top && !outfit.Bottom ? (
                                <p className="text-foreground/70 text-sm">Since you selected the {outfit.Top.name}, try pairing it with the Beige Tailored Trousers for a classic look.</p>
                            ) : outfit.Top && outfit.Bottom ? (
                                <p className="text-foreground/70 text-sm">This is a strong combination. Add the Gold Minimalist Watch to elevate the luxury feel.</p>
                            ) : (
                                <p className="text-foreground/70 text-sm">Start by selecting a Top or Bottom to get intelligent pairing suggestions based on season and color.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Wardrobe Drawer */}
                <div className="flex-1 glass rounded-3xl border border-black/5 dark:border-white/5 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md">
                        <h3 className="font-semibold mb-4">Select {activeSlot}</h3>
                        <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
                            {(Object.keys(availableClothes) as Slot[]).map(slot => (
                                <button
                                    key={slot}
                                    onClick={() => setActiveSlot(slot)}
                                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeSlot === slot ? "bg-foreground text-background" : "bg-black/5 dark:bg-white/5 text-foreground/70 hover:bg-black/10 dark:hover:bg-white/10"}`}
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            {availableClothes[activeSlot].map(item => {
                                const isSelected = outfit[activeSlot]?.id === item.id;
                                return (
                                    <motion.button
                                        key={item.id}
                                        onClick={() => handleSelectItem(item, activeSlot)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`relative aspect-[3/4] rounded-2xl glass border overflow-hidden transition-all ${isSelected ? "border-accent ring-2 ring-accent shadow-md" : "border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20"}`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 z-10 text-accent bg-background rounded-full">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 p-4 pb-12 bg-white/40 dark:bg-black/20 flex items-center justify-center">
                                            <div
                                                className="w-full h-full bg-contain bg-center bg-no-repeat rounded-xl"
                                                style={{ backgroundImage: `url(${item.image})`, mixBlendMode: 'multiply' }}
                                            />
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 h-12 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 px-3 flex flex-col justify-center text-left">
                                            <h4 className="font-medium text-xs truncate">{item.name}</h4>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
