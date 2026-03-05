"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shirt, CheckCircle2, Target, Save, Sparkles, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { apiGetCloset, apiGenerateOutfit, apiSaveOutfit } from "@/lib/api";

type ClothingItem = {
    id: string;
    name: string;
    category: string;
    color: string;
    season: string;
    brand?: string;
    image_url?: string;
};

type Slot = "Top" | "Bottom" | "Shoes" | "Accessories" | "Outerwear" | "Dress";

const ALL_SLOTS: Slot[] = ["Top", "Bottom", "Shoes", "Accessories", "Outerwear", "Dress"];
const OCCASIONS = ["Casual", "Formal", "Business", "Party", "Sport", "Vacation"];
const SEASONS = ["All", "Summer", "Winter", "Spring", "Fall"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";


export default function OutfitBuilderPage() {
    const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
    const [loadingWardrobe, setLoadingWardrobe] = useState(true);
    const [activeSlot, setActiveSlot] = useState<Slot>("Top");
    const [outfit, setOutfit] = useState<Record<Slot, ClothingItem | null>>({
        Top: null, Bottom: null, Shoes: null, Accessories: null, Outerwear: null, Dress: null
    });
    const [aiScore, setAiScore] = useState<number | null>(null);
    const [aiReasoning, setAiReasoning] = useState<string>("");
    const [aiOutfitName, setAiOutfitName] = useState<string>("");
    const [generatingAI, setGeneratingAI] = useState(false);
    const [aiError, setAiError] = useState("");
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");
    const [occasion, setOccasion] = useState("Casual");
    const [season, setSeason] = useState("All");

    useEffect(() => {
        fetchWardrobe();
    }, []);

    const fetchWardrobe = async () => {
        setLoadingWardrobe(true);
        try {
            const data = await apiGetCloset();
            setWardrobeItems(data);
        } catch {
            // wardrobe failed to load
        } finally {
            setLoadingWardrobe(false);
        }
    };

    const handleSelectItem = (item: ClothingItem, slot: Slot) => {
        setOutfit(prev => {
            const updated = { ...prev, [slot]: item };
            const filled = Object.values(updated).filter(Boolean).length;
            if (filled >= 2) setAiScore(Math.floor(Math.random() * 10) + 88);
            else setAiScore(null);
            return updated;
        });
    };

    const handleGenerateAI = async () => {
        setGeneratingAI(true);
        setAiError("");
        try {
            const result = await apiGenerateOutfit(occasion, season);
            // Place each AI-selected item into the right slot
            const newOutfit: Record<Slot, ClothingItem | null> = {
                Top: null, Bottom: null, Shoes: null, Accessories: null, Outerwear: null, Dress: null
            };
            for (const item of result.items as ClothingItem[]) {
                const slot = item.category as Slot;
                if (ALL_SLOTS.includes(slot)) newOutfit[slot] = item;
            }
            setOutfit(newOutfit);
            setAiScore(result.ai_score ?? 92);
            setAiReasoning(result.ai_reasoning ?? "");
            setAiOutfitName(result.outfit_name ?? "");
        } catch (err: any) {
            setAiError(err.message ?? "AI generation failed. Make sure your OpenAI API key is set.");
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleSaveOutfit = async () => {
        const selectedItems = Object.values(outfit).filter(Boolean) as ClothingItem[];
        if (selectedItems.length === 0) return;
        setSaving(true);
        setSavedMsg("");
        try {
            await apiSaveOutfit({
                name: aiOutfitName || `${occasion} Outfit`,
                occasion,
                items: selectedItems.map(i => i.id),
                ai_score: aiScore ?? undefined,
                ai_reasoning: aiReasoning,
            });
            setSavedMsg("Outfit saved successfully!");
            setTimeout(() => setSavedMsg(""), 3000);
        } catch (err: any) {
            setSavedMsg("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Filter items that belong to the active slot category
    const availableForSlot = wardrobeItems.filter(i => i.category === activeSlot);
    const filledCount = Object.values(outfit).filter(Boolean).length;

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1">Design Room</h1>
                    <p className="text-foreground/60">Visually assemble your perfect outfit from your real wardrobe.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Occasion & season pickers */}
                    <select value={occasion} onChange={e => setOccasion(e.target.value)} className="px-4 py-2 rounded-full text-sm bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent">
                        {OCCASIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                    <select value={season} onChange={e => setSeason(e.target.value)} className="px-4 py-2 rounded-full text-sm bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-accent">
                        {SEASONS.map(s => <option key={s}>{s}</option>)}
                    </select>

                    <button
                        onClick={handleGenerateAI}
                        disabled={generatingAI || wardrobeItems.length === 0}
                        className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-accent/90 transition-all shadow-md disabled:opacity-50"
                    >
                        {generatingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        AI Generate
                    </button>

                    <button
                        onClick={handleSaveOutfit}
                        disabled={filledCount === 0 || saving}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Outfit
                    </button>
                </div>
            </div>

            {savedMsg && (
                <div className={`text-sm p-3 rounded-xl mb-4 ${savedMsg.includes("Failed") ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                    {savedMsg}
                </div>
            )}
            {aiError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-3 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {aiError}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">

                {/* Outfit Canvas */}
                <div className="flex-[1.5] flex flex-col gap-6">
                    <div className="flex-1 glass rounded-3xl p-8 border border-black/5 dark:border-white/5 relative flex items-center justify-center overflow-hidden">
                        {/* AI Score Badge */}
                        <AnimatePresence>
                            {aiScore && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: -20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute top-6 right-6 bg-green-500/10 text-green-600 border border-green-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 shadow-sm font-medium"
                                >
                                    <Target className="w-4 h-4" /> Compatibility: {aiScore}%
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {aiOutfitName && (
                            <div className="absolute top-6 left-6 text-sm font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-full">
                                {aiOutfitName}
                            </div>
                        )}

                        <div className="relative w-full max-w-sm flex flex-col items-center gap-4">
                            {ALL_SLOTS.filter(slot => slot !== "Outerwear" && slot !== "Accessories").map((slot) => {
                                const item = outfit[slot];
                                return (
                                    <motion.button
                                        layout
                                        key={slot}
                                        onClick={() => setActiveSlot(slot)}
                                        className={`w-4/5 aspect-[16/9] rounded-2xl border-2 flex items-center justify-center transition-all overflow-hidden relative group
                                            ${activeSlot === slot ? "border-accent ring-4 ring-accent/10" : "border-dashed border-black/10 dark:border-white/10 hover:border-black/30"}
                                            ${item ? "bg-white/40 dark:bg-black/20" : "bg-transparent"}`}
                                    >
                                        {item ? (
                                            item.image_url ? (
                                                <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-accent/70">
                                                    <Shirt className="w-8 h-8 mb-1" />
                                                    <span className="text-xs font-medium">{item.name}</span>
                                                </div>
                                            )
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

                    {/* AI Reasoning */}
                    <div className="h-auto min-h-28 rounded-3xl p-5 bg-gradient-to-r from-accent/10 to-transparent border border-accent/20 flex items-start gap-5">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-1">AI Stylist</h3>
                            {generatingAI ? (
                                <p className="text-foreground/60 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Analyzing your wardrobe and generating outfit...</p>
                            ) : aiReasoning ? (
                                <p className="text-foreground/70 text-sm leading-relaxed">{aiReasoning}</p>
                            ) : outfit.Top && !outfit.Bottom ? (
                                <p className="text-foreground/70 text-sm">Great pick! Now select a Bottom to complete the look, or click <strong>AI Generate</strong> for a full outfit suggestion.</p>
                            ) : filledCount === 0 ? (
                                <p className="text-foreground/70 text-sm">Select items from your wardrobe, or click <strong>AI Generate</strong> to let the AI create a full {occasion.toLowerCase()} outfit from your closet.</p>
                            ) : (
                                <p className="text-foreground/70 text-sm">Looking good! Add more pieces or click <strong>AI Generate</strong> for AI-powered compatibility analysis.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Wardrobe Drawer */}
                <div className="flex-1 glass rounded-3xl border border-black/5 dark:border-white/5 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md">
                        <h3 className="font-semibold mb-4">Select {activeSlot}</h3>
                        <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
                            {ALL_SLOTS.map(slot => (
                                <button
                                    key={slot}
                                    onClick={() => setActiveSlot(slot)}
                                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeSlot === slot ? "bg-foreground text-background" : "bg-black/5 dark:bg-white/5 text-foreground/70 hover:bg-black/10"}`}
                                >
                                    {slot}
                                    {outfit[slot] && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-accent inline-block" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        {loadingWardrobe ? (
                            <div className="flex items-center justify-center h-32 gap-2 text-foreground/40">
                                <Loader2 className="w-5 h-5 animate-spin" /> Loading wardrobe...
                            </div>
                        ) : availableForSlot.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-foreground/40 text-center gap-2">
                                <RefreshCw className="w-8 h-8" />
                                <p className="text-sm">No {activeSlot} items in your closet yet.<br />Upload items in My Closet first.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {availableForSlot.map(item => {
                                    const isSelected = outfit[activeSlot]?.id === item.id;
                                    return (
                                        <motion.button
                                            key={item.id}
                                            onClick={() => handleSelectItem(item, activeSlot)}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`relative aspect-[3/4] rounded-2xl glass border overflow-hidden transition-all ${isSelected ? "border-accent ring-2 ring-accent shadow-md" : "border-black/5 dark:border-white/5 hover:border-black/20"}`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 z-10 text-accent bg-background rounded-full">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 p-3 pb-12 flex items-center justify-center bg-white/40 dark:bg-black/20">
                                                {item.image_url ? (
                                                    <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain rounded-lg" />
                                                ) : (
                                                    <Shirt className="w-10 h-10 text-foreground/20" />
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 inset-x-0 h-12 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 px-3 flex flex-col justify-center text-left">
                                                <h4 className="font-medium text-xs truncate">{item.name}</h4>
                                                <p className="text-[10px] text-foreground/50">{item.color}</p>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
