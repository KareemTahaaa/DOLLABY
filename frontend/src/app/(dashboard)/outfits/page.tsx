"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Shirt, CheckCircle2, Target, Save, Sparkles, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { apiGetCloset, apiGenerateOutfit, apiSaveOutfit, apiGetOutfits, apiDeleteOutfit } from "@/lib/api";
import toast from "react-hot-toast";

type ClothingItem = { id: string; name: string; category: string; color: string; season: string; brand?: string; image_url?: string };
type Slot = "Top" | "Bottom" | "Shoes" | "Accessories" | "Outerwear" | "Dress";
type OutfitMode = "outfit" | "dress";
type SavedOutfit = { id: string; name: string; occasion?: string; items: ClothingItem[]; ai_score?: number; ai_reasoning?: string };

const OUTFIT_SLOTS: Slot[] = ["Outerwear", "Top", "Bottom", "Shoes", "Accessories"];
const DRESS_SLOTS: Slot[]  = ["Outerwear", "Dress", "Shoes", "Accessories"];
const ALL_SLOTS: Slot[]    = ["Top", "Bottom", "Shoes", "Accessories", "Outerwear", "Dress"];
const OCCASIONS = ["Casual", "Formal", "Business", "Party", "Sport", "Vacation"];
const SEASONS   = ["All", "Summer", "Winter", "Spring", "Fall"];
const API_BASE  = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ── Per-slot SVG icons ────────────────────────────────────────────── */
const TopIcon       = ({ className }: { className?: string }) => <Shirt className={className} />;

const PantsIcon     = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16l-2.5 9L14 21h-4L6.5 13 4 4z" />
        <path d="M12 4v8" />
    </svg>
);

const DressIcon     = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2h8" />
        <path d="M9 2L6 8l3.5 2V22h5V10l3.5-2L15 2" />
        <path d="M9.5 10c0 0 1.2.8 2.5.8s2.5-.8 2.5-.8" />
    </svg>
);

const ShoeIcon      = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13.5c0-1.1.6-2 1.5-2.5L9 8.5l3-4.5h3l1.5 4.5H20a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-.5z" />
        <path d="M3 13.5h18" />
    </svg>
);

const JacketIcon    = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2L3 6.5V11l4-1v13h10V10l4 1V6.5L15 2" />
        <path d="M9 2l3 3.5L15 2" />
        <path d="M12 5.5V11" />
    </svg>
);

const GemIcon       = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
        <path d="M11 3L8 9l4 12 4-12-3-6" />
        <path d="M2 9h20" />
    </svg>
);

const LayersIcon    = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
);

type IconComp = ({ className }: { className?: string }) => React.ReactElement;

const SLOT_ICONS: Record<Slot, IconComp> = {
    Top: TopIcon, Bottom: PantsIcon, Dress: DressIcon,
    Shoes: ShoeIcon, Outerwear: JacketIcon, Accessories: GemIcon,
};

const SLOT_LABELS: Record<Slot, string> = {
    Top: "Top", Bottom: "Bottom", Dress: "Dress",
    Shoes: "Shoes", Outerwear: "Outerwear", Accessories: "Accessories",
};

/* ── Page component ────────────────────────────────────────────────── */
export default function OutfitBuilderPage() {
    const [tab,            setTab]           = useState<"build" | "saved">("build");
    const [mode,           setMode]          = useState<OutfitMode>("outfit");
    const [wardrobeItems,  setWardrobeItems] = useState<ClothingItem[]>([]);
    const [loadingWardrobe,setLoadingWardrobe] = useState(true);
    const [savedOutfits,   setSavedOutfits]  = useState<SavedOutfit[]>([]);
    const [loadingSaved,   setLoadingSaved]  = useState(false);
    const [activeSlot,     setActiveSlot]    = useState<Slot>("Top");
    const [outfit,         setOutfit]        = useState<Record<Slot, ClothingItem | null>>({
        Top: null, Bottom: null, Shoes: null, Accessories: null, Outerwear: null, Dress: null,
    });
    const [aiScore,      setAiScore]      = useState<number | null>(null);
    const [aiReasoning,  setAiReasoning]  = useState("");
    const [aiOutfitName, setAiOutfitName] = useState("");
    const [generatingAI, setGeneratingAI] = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [deletingId,   setDeletingId]   = useState<string | null>(null);
    const [occasion,     setOccasion]     = useState("Casual");
    const [season,       setSeason]       = useState("All");
    const [previewOutfit,setPreviewOutfit]= useState<SavedOutfit | null>(null);

    const currentSlots = mode === "outfit" ? OUTFIT_SLOTS : DRESS_SLOTS;

    useEffect(() => {
        apiGetCloset()
            .then(setWardrobeItems)
            .catch(() => {})
            .finally(() => setLoadingWardrobe(false));
    }, []);

    useEffect(() => {
        if (tab === "saved") loadSaved();
    }, [tab]);

    const loadSaved = async () => {
        setLoadingSaved(true);
        try { setSavedOutfits(await apiGetOutfits()); }
        catch { /* silent */ }
        finally { setLoadingSaved(false); }
    };

    /* Mode toggle — clears conflicting slots */
    const switchMode = (next: OutfitMode) => {
        if (next === mode) return;
        setMode(next);
        setAiScore(null); setAiReasoning(""); setAiOutfitName("");
        if (next === "dress") {
            setOutfit(p => ({ ...p, Top: null, Bottom: null }));
            if (activeSlot === "Top" || activeSlot === "Bottom") setActiveSlot("Dress");
        } else {
            setOutfit(p => ({ ...p, Dress: null }));
            if (activeSlot === "Dress") setActiveSlot("Top");
        }
    };

    const handleGenerateAI = async () => {
        setGeneratingAI(true);
        try {
            const result = await apiGenerateOutfit(occasion, season);
            const newOutfit: Record<Slot, ClothingItem | null> = {
                Top: null, Bottom: null, Shoes: null, Accessories: null, Outerwear: null, Dress: null,
            };
            for (const item of result.items as ClothingItem[]) {
                const slot = item.category as Slot;
                if (ALL_SLOTS.includes(slot)) newOutfit[slot] = item;
            }
            /* Auto-switch mode based on AI result */
            if (newOutfit.Dress && !newOutfit.Top && !newOutfit.Bottom) setMode("dress");
            else if ((newOutfit.Top || newOutfit.Bottom) && !newOutfit.Dress) setMode("outfit");

            setOutfit(newOutfit);
            setAiScore(result.ai_score ?? 92);
            setAiReasoning(result.ai_reasoning ?? "");
            setAiOutfitName(result.outfit_name ?? "");
            toast.success("AI outfit generated!");
        } catch (err: any) {
            toast.error(err.message ?? "AI generation failed.");
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleSaveOutfit = async () => {
        const selected = Object.values(outfit).filter(Boolean) as ClothingItem[];
        if (!selected.length) return;
        setSaving(true);
        try {
            await apiSaveOutfit({
                name: aiOutfitName || `${occasion} ${mode === "dress" ? "Dress" : "Outfit"}`,
                occasion,
                items: selected.map(i => i.id),
                ai_score: aiScore ?? undefined,
                ai_reasoning: aiReasoning,
            });
            toast.success("Outfit saved!");
            setTab("saved");
        } catch (err: any) {
            toast.error("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteOutfit = async (id: string) => {
        setDeletingId(id);
        try {
            await apiDeleteOutfit(id);
            setSavedOutfits(prev => prev.filter(o => o.id !== id));
            if (previewOutfit?.id === id) setPreviewOutfit(null);
            toast.success("Outfit removed.");
        } catch (err: any) {
            toast.error("Delete failed: " + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const availableForSlot = wardrobeItems.filter(i => i.category === activeSlot);
    const filledCount = Object.values(outfit).filter(Boolean).length;

    /* ── Slot card (canvas) ── */
    const SlotCard = ({ slot, optional = false }: { slot: Slot; optional?: boolean }) => {
        const item   = outfit[slot];
        const active = activeSlot === slot;
        const Icon   = SLOT_ICONS[slot];
        return (
            <div
                onClick={() => setActiveSlot(slot)}
                className={`w-full h-full rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer transition-all
                    ${active
                        ? "border-accent ring-2 ring-accent/20"
                        : item
                            ? "border-foreground/8 card-bg"
                            : "border-dashed border-foreground/10 hover:border-foreground/25"}`}
            >
                {optional && !item && (
                    <span className="absolute top-2 left-2.5 text-[8px] uppercase tracking-widest text-foreground/25 font-bold leading-none">opt.</span>
                )}

                {item ? (
                    <>
                        {item.image_url
                            ? <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain p-2" />
                            : (
                                <div className="flex flex-col items-center text-accent/70 gap-1.5 p-3">
                                    <Icon className="w-6 h-6" />
                                    <span className="text-[10px] font-medium text-center leading-tight">{item.name}</span>
                                </div>
                            )
                        }
                        {/* Remove button */}
                        <button
                            onClick={e => { e.stopPropagation(); setOutfit(p => ({ ...p, [slot]: null })); setAiScore(null); }}
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                        >
                            <X className="w-2.5 h-2.5" />
                        </button>
                        {/* Name label */}
                        <div className="absolute bottom-0 inset-x-0 glass-heavy border-t border-foreground/5 px-2 py-1 flex items-center gap-1">
                            <Icon className="w-2.5 h-2.5 text-foreground/35 flex-shrink-0" />
                            <span className="text-[9px] text-foreground/50 truncate">{item.name}</span>
                        </div>
                    </>
                ) : (
                    <div className={`flex flex-col items-center gap-1.5 transition-colors
                        ${active ? "text-accent/55" : "text-foreground/20 group-hover:text-foreground/40"}`}>
                        <Icon className="w-5 h-5" />
                        <span className="text-[9px] font-semibold uppercase tracking-widest">{SLOT_LABELS[slot]}</span>
                    </div>
                )}
            </div>
        );
    };

    /* ──────────────────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col h-[calc(100vh-130px)]">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-heading text-4xl font-semibold tracking-tight mb-1">Design Room</h1>
                    <p className="text-foreground/50 text-sm">Assemble and save your perfect looks.</p>
                </div>
                <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 gap-1">
                    {(["build", "saved"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all ${tab === t ? "" : "text-foreground/50 hover:text-foreground"}`}>
                            {tab === t && (
                                <motion.div layoutId="tab-bg"
                                    className="absolute inset-0 bg-background rounded-full shadow-sm"
                                    transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                            )}
                            <span className="relative">{t === "build" ? "Builder" : `Saved (${savedOutfits.length})`}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── BUILDER TAB ─────────────────────────────────────────── */}
            {tab === "build" && (
                <div className="flex flex-col lg:flex-row gap-5 flex-1 min-h-0">

                    {/* Left — Canvas */}
                    <div className="flex-[1.4] flex flex-col gap-3 min-h-0">

                        {/* Controls */}
                        <div className="flex items-center gap-2 flex-wrap">

                            {/* Outfit / Dress mode toggle */}
                            <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 gap-0.5">
                                {(["outfit", "dress"] as OutfitMode[]).map(m => (
                                    <button key={m} onClick={() => switchMode(m)}
                                        className={`relative px-4 py-1.5 rounded-full text-xs font-semibold transition-all
                                            ${mode === m ? "" : "text-foreground/40 hover:text-foreground"}`}>
                                        {mode === m && (
                                            <motion.div layoutId="mode-bg"
                                                className="absolute inset-0 bg-foreground rounded-full"
                                                transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                                        )}
                                        <span className={`relative flex items-center gap-1.5 ${mode === m ? "text-background" : ""}`}>
                                            {m === "outfit" ? <TopIcon className="w-3 h-3" /> : <DressIcon className="w-3 h-3" />}
                                            {m === "outfit" ? "Outfit" : "Dress"}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1" />

                            <select value={occasion} onChange={e => setOccasion(e.target.value)}
                                className="px-3 py-1.5 rounded-full text-xs border border-black/8 dark:border-white/8 bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                                {OCCASIONS.map(o => <option key={o}>{o}</option>)}
                            </select>
                            <select value={season} onChange={e => setSeason(e.target.value)}
                                className="px-3 py-1.5 rounded-full text-xs border border-black/8 dark:border-white/8 bg-background focus:outline-none focus:ring-2 focus:ring-accent/40">
                                {SEASONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                            <button onClick={handleGenerateAI} disabled={generatingAI || wardrobeItems.length === 0}
                                className="flex items-center gap-1.5 bg-accent text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm">
                                {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                AI Style
                            </button>
                            <button onClick={handleSaveOutfit} disabled={filledCount === 0 || saving}
                                className="flex items-center gap-1.5 bg-foreground text-background px-4 py-1.5 rounded-full text-xs font-semibold hover:opacity-80 transition-all disabled:opacity-40">
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                            </button>
                        </div>

                        {/* Canvas card */}
                        <div className="flex-1 rounded-3xl border border-black/5 dark:border-white/5 glass overflow-hidden relative flex flex-col min-h-0">

                            {/* AI badges */}
                            {aiScore && (
                                <div className="absolute top-3.5 right-3.5 z-10">
                                    <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                        <Target className="w-2.5 h-2.5" /> {aiScore}% match
                                    </span>
                                </div>
                            )}
                            {aiOutfitName && (
                                <div className="absolute top-3.5 left-4 z-10">
                                    <span className="font-heading italic text-accent text-sm">{aiOutfitName}</span>
                                </div>
                            )}

                            {/* Body layout */}
                            <div className="flex-1 overflow-y-auto scrollbar-hide p-5 pt-11">
                                <div className="max-w-[290px] mx-auto">
                                    <AnimatePresence mode="wait">

                                        {/* OUTFIT MODE — Top + Bottom + Shoes | Outerwear + Accessories */}
                                        {mode === "outfit" && (
                                            <motion.div key="outfit"
                                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex gap-2.5">
                                                {/* Main body column */}
                                                <div className="flex flex-col gap-2.5 flex-1">
                                                    <div className="aspect-[3/4]"><SlotCard slot="Top" /></div>
                                                    <div className="aspect-[3/4]"><SlotCard slot="Bottom" /></div>
                                                    <div className="aspect-[16/6]"><SlotCard slot="Shoes" /></div>
                                                </div>
                                                {/* Side column — optional pieces */}
                                                <div className="flex flex-col gap-2.5 w-[88px]">
                                                    <div className="aspect-[3/4]"><SlotCard slot="Outerwear" optional /></div>
                                                    <div className="aspect-square"><SlotCard slot="Accessories" /></div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* DRESS MODE — Dress + Shoes | Outerwear + Accessories */}
                                        {mode === "dress" && (
                                            <motion.div key="dress"
                                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex gap-2.5">
                                                {/* Main body column */}
                                                <div className="flex flex-col gap-2.5 flex-1">
                                                    <div className="aspect-[2/3]"><SlotCard slot="Dress" /></div>
                                                    <div className="aspect-[16/6]"><SlotCard slot="Shoes" /></div>
                                                </div>
                                                {/* Side column */}
                                                <div className="flex flex-col gap-2.5 w-[88px]">
                                                    <div className="aspect-[3/4]"><SlotCard slot="Outerwear" optional /></div>
                                                    <div className="aspect-square"><SlotCard slot="Accessories" /></div>
                                                </div>
                                            </motion.div>
                                        )}

                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* AI reasoning strip */}
                            {(aiReasoning || generatingAI) && (
                                <div className="border-t border-black/5 dark:border-white/5 p-3.5 flex items-start gap-2.5 flex-shrink-0">
                                    <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-3 h-3 text-accent" />
                                    </div>
                                    <p className="text-xs text-foreground/55 leading-relaxed">
                                        {generatingAI
                                            ? <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Styling your look…</span>
                                            : aiReasoning}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right — Wardrobe drawer */}
                    <div className="flex-1 glass rounded-3xl border border-black/5 dark:border-white/5 flex flex-col overflow-hidden min-h-0">

                        {/* Slot tabs */}
                        <div className="p-4 border-b border-black/5 dark:border-white/5 flex-shrink-0">
                            <p className="text-[10px] text-foreground/40 uppercase tracking-[0.1em] font-semibold mb-2.5">
                                Select {SLOT_LABELS[activeSlot]}
                            </p>
                            <div className="flex gap-1.5 flex-wrap">
                                {currentSlots.map(slot => {
                                    const Icon = SLOT_ICONS[slot];
                                    return (
                                        <button key={slot} onClick={() => setActiveSlot(slot)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                                ${activeSlot === slot
                                                    ? "bg-foreground text-background"
                                                    : "bg-black/5 dark:bg-white/5 text-foreground/60 hover:bg-black/8 dark:hover:bg-white/8"}`}>
                                            <Icon className="w-3 h-3" />
                                            {slot}
                                            {outfit[slot] && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Items grid */}
                        <div className="p-4 flex-1 overflow-y-auto scrollbar-hide">
                            {loadingWardrobe ? (
                                <div className="flex items-center justify-center h-24 gap-2 text-foreground/30 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                                </div>
                            ) : availableForSlot.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-36 text-foreground/25 text-center gap-3">
                                    {(() => { const Icon = SLOT_ICONS[activeSlot]; return <Icon className="w-9 h-9" />; })()}
                                    <p className="text-sm">No {activeSlot} items in your closet yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2.5">
                                    {availableForSlot.map(item => {
                                        const isSelected = outfit[activeSlot]?.id === item.id;
                                        const Icon = SLOT_ICONS[activeSlot];
                                        return (
                                            <motion.button key={item.id}
                                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setOutfit(p => ({ ...p, [activeSlot]: item }));
                                                    setAiScore(null); setAiReasoning(""); setAiOutfitName("");
                                                }}
                                                className={`relative aspect-[3/4] rounded-2xl border overflow-hidden transition-all card-bg
                                                    ${isSelected
                                                        ? "border-accent ring-2 ring-accent/25 shadow-md"
                                                        : "border-foreground/5 hover:border-foreground/15"}`}>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 z-10 text-accent bg-background rounded-full shadow-sm">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 p-2 pb-10 flex items-center justify-center">
                                                    {item.image_url
                                                        ? <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain" />
                                                        : <Icon className="w-8 h-8 text-foreground/15" />
                                                    }
                                                </div>
                                                <div className="absolute bottom-0 inset-x-0 h-10 glass-heavy border-t border-foreground/5 px-2 flex flex-col justify-center">
                                                    <h4 className="font-medium text-xs truncate">{item.name}</h4>
                                                    <p className="text-[10px] text-foreground/40">{item.color}</p>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── SAVED OUTFITS TAB ───────────────────────────────────── */}
            {tab === "saved" && (
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5">

                    {/* Outfit grid */}
                    <div className="flex-[1.5] overflow-y-auto scrollbar-hide">
                        {loadingSaved ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-[3/4] skeleton" />)}
                            </div>
                        ) : savedOutfits.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-foreground/30 gap-3">
                                <LayersIcon className="w-12 h-12" />
                                <p className="text-sm font-medium">No outfits saved yet.</p>
                                <button onClick={() => setTab("build")} className="text-xs text-accent hover:underline font-medium">
                                    Build your first look →
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {savedOutfits.map(so => (
                                    <motion.div key={so.id} layout
                                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => setPreviewOutfit(so)}
                                        className={`relative rounded-3xl border overflow-hidden cursor-pointer group hover:shadow-lg transition-all card-bg
                                            ${previewOutfit?.id === so.id ? "border-accent ring-2 ring-accent/20" : "border-foreground/5"}`}>

                                        {/* Thumbnails */}
                                        <div className="grid grid-cols-2 gap-1 p-3 aspect-[4/3]">
                                            {so.items.slice(0, 4).map(item => {
                                                const Icon = SLOT_ICONS[item.category as Slot] ?? TopIcon;
                                                return (
                                                    <div key={item.id} className="rounded-xl overflow-hidden bg-black/3 dark:bg-white/3 flex items-center justify-center">
                                                        {item.image_url
                                                            ? <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain p-1" />
                                                            : <Icon className="w-5 h-5 text-foreground/15" />
                                                        }
                                                    </div>
                                                );
                                            })}
                                            {so.items.length === 0 && (
                                                <div className="col-span-2 flex items-center justify-center text-foreground/20">
                                                    <LayersIcon className="w-10 h-10" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="px-3 pb-3 pt-1 border-t border-black/4 dark:border-white/4">
                                            <h4 className="font-heading font-semibold text-sm truncate">{so.name}</h4>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-[10px] text-foreground/40">{so.occasion || "No occasion"}</p>
                                                {so.ai_score && <span className="text-[10px] text-emerald-600 font-semibold">{so.ai_score}%</span>}
                                            </div>
                                        </div>

                                        {/* Delete button */}
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDeleteOutfit(so.id); }}
                                            disabled={deletingId === so.id}
                                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                            {deletingId === so.id
                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                : <Trash2 className="w-3 h-3" />}
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview panel */}
                    <div className="flex-1 glass rounded-3xl border border-black/5 dark:border-white/5 overflow-hidden flex flex-col">
                        {previewOutfit ? (
                            <>
                                <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-start justify-between gap-3 flex-shrink-0">
                                    <div>
                                        <h3 className="font-heading text-xl font-semibold">{previewOutfit.name}</h3>
                                        <p className="text-xs text-foreground/40 mt-0.5">
                                            {previewOutfit.occasion} · {previewOutfit.items.length} items
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {previewOutfit.ai_score && (
                                            <span className="text-xs text-emerald-600 font-semibold bg-emerald-500/8 border border-emerald-500/15 px-2.5 py-1 rounded-full">
                                                {previewOutfit.ai_score}% match
                                            </span>
                                        )}
                                        <button onClick={() => handleDeleteOutfit(previewOutfit.id)}
                                            disabled={deletingId === previewOutfit.id}
                                            className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                                            {deletingId === previewOutfit.id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {previewOutfit.items.map(item => {
                                            const Icon = SLOT_ICONS[item.category as Slot] ?? TopIcon;
                                            return (
                                                <div key={item.id} className="aspect-[3/4] rounded-2xl border border-foreground/5 overflow-hidden relative card-bg">
                                                    {item.image_url
                                                        ? <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain p-2" />
                                                        : <div className="w-full h-full flex items-center justify-center">
                                                            <Icon className="w-10 h-10 text-foreground/15" />
                                                          </div>
                                                    }
                                                    <div className="absolute bottom-0 inset-x-0 glass-heavy border-t border-foreground/5 px-2.5 py-1.5 flex items-center gap-1.5">
                                                        <Icon className="w-3 h-3 text-foreground/35 flex-shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium truncate leading-tight">{item.name}</p>
                                                            <p className="text-[10px] text-foreground/40">{item.category}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {previewOutfit.ai_reasoning && (
                                        <div className="mt-4 p-3 rounded-2xl bg-accent/5 border border-accent/15 flex gap-2.5">
                                            <Sparkles className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-foreground/60 leading-relaxed">{previewOutfit.ai_reasoning}</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-foreground/25 gap-3 p-8 text-center">
                                <LayersIcon className="w-12 h-12" />
                                <p className="text-sm font-medium">Select an outfit to preview it here</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
