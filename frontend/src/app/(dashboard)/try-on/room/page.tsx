"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Camera,
    Shirt,
    Loader2,
    Sparkles,
    Upload,
    CheckCircle,
    X,
    ArrowLeft,
    Download,
    RefreshCw,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    apiGetCloset,
    apiGetTryonRoom,
    apiUploadTryonAvatar,
    apiGenerateRoomTryon,
} from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ClothingItem = {
    id: string;
    name: string;
    category: string;
    image_url?: string;
};

function absUrl(url: string): string {
    if (!url) return url;
    return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

type PageState = "loading" | "no-avatar" | "ready";

export default function TryOnRoomPage() {
    // ── Page state ──────────────────────────────────────────────────────────────
    const [pageState, setPageState] = useState<PageState>("loading");

    // ── Avatar & wardrobe ───────────────────────────────────────────────────────
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [items, setItems] = useState<ClothingItem[]>([]);

    // ── Selection & result ──────────────────────────────────────────────────────
    const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [cachedResults, setCachedResults] = useState<Record<string, string>>({});

    // ── Loading flags ───────────────────────────────────────────────────────────
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);

    // ── Load room data on mount ─────────────────────────────────────────────────
    const loadRoom = useCallback(async () => {
        try {
            const [room, closet] = await Promise.all([
                apiGetTryonRoom(),
                apiGetCloset().catch(() => [] as ClothingItem[]),
            ]);
            setAvatarUrl(room.avatar_url);
            setCachedResults(room.cached_results ?? {});
            setItems(closet);
            setPageState(room.avatar_url ? "ready" : "no-avatar");
        } catch {
            toast.error("Failed to load your try-on room.");
            setPageState("no-avatar");
        }
    }, []);

    useEffect(() => {
        loadRoom();
    }, [loadRoom]);

    // ── Avatar upload ───────────────────────────────────────────────────────────
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // reset input so same file can be re-selected
        e.target.value = "";

        setIsUploading(true);
        try {
            const res = await apiUploadTryonAvatar(file);
            setAvatarUrl(res.avatar_url);
            // clear any active result when avatar changes
            setResultUrl(null);
            setSelectedItem(null);
            setPageState("ready");
            toast.success("Avatar updated!");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Upload failed.");
        } finally {
            setIsUploading(false);
        }
    };

    // ── Generate try-on ─────────────────────────────────────────────────────────
    const generate = useCallback(
        async (item: ClothingItem, force = false) => {
            if (!avatarUrl) {
                toast.error("Please set your avatar photo first.");
                return;
            }

            // Use cache unless force regenerate
            if (!force && cachedResults[item.id]) {
                setSelectedItem(item);
                setResultUrl(absUrl(cachedResults[item.id]));
                return;
            }

            setSelectedItem(item);
            setResultUrl(null);
            setIsGenerating(true);

            try {
                const data = await apiGenerateRoomTryon(item.id);
                const url = absUrl(data.result_url);
                setResultUrl(url);
                setCachedResults((prev) => ({ ...prev, [item.id]: data.result_url }));
                toast.success("Try-on ready!");
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Generation failed.");
                setResultUrl(null);
            } finally {
                setIsGenerating(false);
            }
        },
        [avatarUrl, cachedResults]
    );

    // ── Card click ──────────────────────────────────────────────────────────────
    const handleCardClick = (item: ClothingItem) => {
        if (isGenerating) return;
        generate(item, false);
    };

    // ── Download ────────────────────────────────────────────────────────────────
    const handleDownload = () => {
        if (!resultUrl) return;
        const a = document.createElement("a");
        a.href = resultUrl;
        a.download = `dollaby-room-tryon-${selectedItem?.id ?? "result"}.jpg`;
        a.target = "_blank";
        a.click();
        toast.success("Downloading your look…");
    };

    // ── Regenerate ──────────────────────────────────────────────────────────────
    const handleRegenerate = () => {
        if (!selectedItem) return;
        generate(selectedItem, true);
    };

    // ── Clear ───────────────────────────────────────────────────────────────────
    const handleClear = () => {
        setResultUrl(null);
        setSelectedItem(null);
    };

    // ══════════════════════════════════════════════════════════════════════════════
    // RENDER — Loading
    // ══════════════════════════════════════════════════════════════════════════════
    if (pageState === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-accent" />
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // RENDER — No avatar
    // ══════════════════════════════════════════════════════════════════════════════
    if (pageState === "no-avatar") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 px-4">
                {/* Back link */}
                <Link
                    href="/try-on"
                    className="absolute top-6 left-6 flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Try-On
                </Link>

                {/* Icon */}
                <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-accent" />
                </div>

                {/* Text */}
                <div>
                    <h1 className="text-2xl font-bold mb-2">Set Your Avatar</h1>
                    <p className="text-foreground/60 max-w-sm text-sm">
                        Upload a full-body photo to use as your personal avatar. Once set, you can
                        virtually try on any item from your wardrobe instantly.
                    </p>
                </div>

                {/* Upload button */}
                <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-full font-medium hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    ) : (
                        <><Upload className="w-4 h-4" /> Upload Avatar Photo</>
                    )}
                </button>

                <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                />
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // RENDER — Ready (avatar set)
    // ══════════════════════════════════════════════════════════════════════════════
    const displayImageUrl = resultUrl ?? (avatarUrl ? absUrl(avatarUrl) : null);
    const showResult = !!resultUrl && !isGenerating;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/try-on"
                        className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Link>
                    <span className="text-foreground/20">/</span>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        Try-On Room <Sparkles className="w-4 h-4 text-accent" />
                    </h1>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">

                {/* ── LEFT PANEL — Avatar / Result ─────────────────────────────── */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
                    {/* Image area */}
                    <div className="glass rounded-3xl p-4 border border-black/5 dark:border-white/5">
                        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5">
                            {/* Main image — avatar or result with AnimatePresence fade */}
                            <AnimatePresence mode="wait">
                                {displayImageUrl && (
                                    <motion.img
                                        key={resultUrl ?? "avatar"}
                                        src={displayImageUrl}
                                        alt={showResult ? "Try-on result" : "Your avatar"}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Generating spinner overlay */}
                            {isGenerating && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                                    <span className="text-white text-sm font-medium">Generating…</span>
                                </div>
                            )}

                            {/* Result badge */}
                            {showResult && selectedItem && (
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg z-20">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span className="max-w-[120px] truncate">{selectedItem.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Change avatar button */}
                        <button
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={isUploading || isGenerating}
                            className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-foreground/60 hover:text-foreground border border-black/10 dark:border-white/10 rounded-xl py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                            ) : (
                                <><Camera className="w-4 h-4" /> Change Avatar</>
                            )}
                        </button>

                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>

                    {/* Action buttons — shown only when result is displayed */}
                    <AnimatePresence>
                        {showResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex flex-col gap-2"
                            >
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-medium hover:bg-primary/90 transition-all text-sm"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </button>
                                <button
                                    onClick={handleRegenerate}
                                    disabled={isGenerating}
                                    className="flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 py-3 rounded-2xl font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm disabled:opacity-40"
                                >
                                    <RefreshCw className="w-4 h-4" /> Regenerate
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="flex items-center justify-center gap-2 border border-black/10 dark:border-white/10 py-3 rounded-2xl font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm text-foreground/60"
                                >
                                    <X className="w-4 h-4" /> Clear
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── RIGHT PANEL — Wardrobe grid ──────────────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                    {/* Title row */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            Your Wardrobe{" "}
                            <span className="text-sm font-normal text-foreground/50">
                                ({items.length} item{items.length !== 1 ? "s" : ""})
                            </span>
                        </h2>
                    </div>

                    {/* Grid or empty state */}
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-24 text-foreground/40">
                            <Shirt className="w-12 h-12" />
                            <p className="text-sm text-center">
                                No items in your closet yet.
                                <br />
                                Add clothes in{" "}
                                <Link href="/closet" className="text-accent hover:underline">
                                    My Closet
                                </Link>{" "}
                                first.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {items.map((item) => {
                                const isCached = !!cachedResults[item.id];
                                const isSelected = selectedItem?.id === item.id;
                                const isThisGenerating = isGenerating && isSelected;

                                return (
                                    <motion.div
                                        key={item.id}
                                        whileHover={{ scale: isGenerating ? 1 : 1.02 }}
                                        whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                                        onClick={() => handleCardClick(item)}
                                        className={`
                                            relative bg-white dark:bg-black rounded-2xl border cursor-pointer transition-all overflow-hidden
                                            ${isSelected
                                                ? "border-accent shadow-md shadow-accent/20 ring-2 ring-accent/30"
                                                : "border-black/5 dark:border-white/5 hover:border-accent/50 hover:shadow-md"
                                            }
                                            ${isGenerating && !isSelected ? "opacity-60 cursor-not-allowed" : ""}
                                        `}
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative aspect-square bg-black/5 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                                            {item.image_url ? (
                                                <img
                                                    src={absUrl(item.image_url)}
                                                    alt={item.name}
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            ) : (
                                                <Shirt className="w-8 h-8 text-foreground/20" />
                                            )}

                                            {/* Spinner overlay for this card while generating */}
                                            {isThisGenerating && (
                                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                                    <Loader2 className="w-7 h-7 animate-spin text-white" />
                                                </div>
                                            )}

                                            {/* Cached result badge */}
                                            {isCached && !isThisGenerating && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                                                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-2.5">
                                            <p className="text-xs font-semibold truncate">{item.name}</p>
                                            <p className="text-[10px] text-foreground/50 uppercase tracking-wider mt-0.5">
                                                {item.category}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
