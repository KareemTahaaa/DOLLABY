"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, Upload, Camera, ArrowRight, Wand2, X, Shirt, Layers,
    Download, Loader2, CheckCircle, AlertCircle, Zap, ExternalLink,
    RotateCcw, Info, UserCircle2
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiGetCloset, apiGetOutfits } from "@/lib/api";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ClothingItem = { id: string; name: string; category: string; image_url?: string };
type Outfit = { id: string; name: string; items: ClothingItem[] };

type ServiceStatus = {
    available: boolean;
    model: string;
    message: string;
    setup_url?: string | null;
};

type GenerationStep = {
    label: string;
    done: boolean;
    active: boolean;
};

const GENERATION_STEPS: GenerationStep[] = [
    { label: "Uploading images…", done: false, active: false },
    { label: "Analyzing body pose…", done: false, active: false },
    { label: "Aligning garment…", done: false, active: false },
    { label: "Running AI synthesis…", done: false, active: false },
    { label: "Finalizing result…", done: false, active: false },
];

export default function VirtualTryOnPage() {
    // ── Image state ────────────────────────────────────────────────────────────
    const [personImage, setPersonImage] = useState<string | null>(null);
    const [personFile, setPersonFile] = useState<File | null>(null);
    const [selectedGarment, setSelectedGarment] = useState<{ name: string; url: string; id?: string } | null>(null);

    // ── UI state ───────────────────────────────────────────────────────────────
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"closet" | "outfits">("closet");

    // ── Data ───────────────────────────────────────────────────────────────────
    const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
    const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
    const [steps, setSteps] = useState<GenerationStep[]>(GENERATION_STEPS);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const photoInputRef = useRef<HTMLInputElement>(null);

    // ── Check service availability on mount ────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("dollaby_token");
        if (!token) return;

        fetch(`${API_BASE}/try-on/status`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => setServiceStatus(data))
            .catch(() => {
                setServiceStatus({
                    available: false,
                    model: "Unknown",
                    message: "Could not connect to the try-on service.",
                });
            });
    }, []);

    // ── Load closet/outfits when selection modal opens ─────────────────────────
    useEffect(() => {
        if (showSelectionModal) {
            setLoadingItems(true);
            Promise.all([
                apiGetCloset().catch(() => []),
                apiGetOutfits().catch(() => []),
            ]).then(([items, outfits]) => {
                setClosetItems(items);
                setSavedOutfits(outfits);
            }).finally(() => setLoadingItems(false));
        }
    }, [showSelectionModal]);

    // ── Animate generation steps ───────────────────────────────────────────────
    const animateSteps = useCallback(() => {
        setSteps(GENERATION_STEPS.map((s) => ({ ...s })));
        let i = 0;
        const interval = setInterval(() => {
            setSteps((prev) => prev.map((s, idx) => ({
                ...s,
                done: idx < i,
                active: idx === i,
            })));
            i++;
            if (i >= GENERATION_STEPS.length) clearInterval(interval);
        }, 4500 / GENERATION_STEPS.length);
        return interval;
    }, []);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPersonFile(file);
            setPersonImage(URL.createObjectURL(file));
            setResultImage(null);
            setErrorMessage(null);
        }
    };

    const handleGenerate = async () => {
        if (!personFile || !selectedGarment) return;

        setIsGenerating(true);
        setErrorMessage(null);
        setResultImage(null);

        const stepsInterval = animateSteps();

        try {
            const token = localStorage.getItem("dollaby_token");
            if (!token) throw new Error("Not authenticated");

            // Fetch garment image as blob
            let garmentBlob: Blob;
            const garmentUrl = selectedGarment.url;

            if (garmentUrl.startsWith("blob:") || garmentUrl.startsWith("data:")) {
                const r = await fetch(garmentUrl);
                garmentBlob = await r.blob();
            } else {
                // Either absolute or relative URL
                const fullUrl = garmentUrl.startsWith("http")
                    ? garmentUrl
                    : `${API_BASE}${garmentUrl}`;
                const r = await fetch(fullUrl);
                if (!r.ok) throw new Error("Could not fetch garment image");
                garmentBlob = await r.blob();
            }

            const garmentFile = new File([garmentBlob], "garment.jpg", { type: garmentBlob.type || "image/jpeg" });

            // Build multipart form
            const formData = new FormData();
            formData.append("person_image", personFile, personFile.name);
            formData.append("garment_image", garmentFile, garmentFile.name);

            const response = await fetch(`${API_BASE}/try-on/generate`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            clearInterval(stepsInterval);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: "Inference failed" }));
                const detail = errData?.detail;
                const msg = typeof detail === "object"
                    ? detail?.message ?? "Try-on inference failed."
                    : detail ?? "Try-on inference failed.";
                throw new Error(msg);
            }

            const data = await response.json();
            const rawUrl: string = data.result_url;

            // Build display URL
            const displayUrl = rawUrl.startsWith("http")
                ? rawUrl
                : `${API_BASE}${rawUrl}`;

            // Mark all steps done
            setSteps(GENERATION_STEPS.map((s) => ({ ...s, done: true, active: false })));

            await new Promise((r) => setTimeout(r, 400));

            setResultImage(displayUrl);
            setShowResultModal(true);
            toast.success("✨ Virtual Try-On Ready!");

        } catch (err: unknown) {
            clearInterval(stepsInterval);
            const msg = err instanceof Error ? err.message : "Something went wrong.";
            setErrorMessage(msg);
            toast.error(msg.length > 80 ? "Try-on failed. See details below." : msg);
        } finally {
            setIsGenerating(false);
            setSteps(GENERATION_STEPS.map((s) => ({ ...s })));
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const a = document.createElement("a");
        a.href = resultImage;
        a.download = "dollaby-tryon-result.jpg";
        a.click();
        toast.success("Downloading your look…");
    };

    const handleSelectGarment = (name: string, url: string, id?: string) => {
        setSelectedGarment({ name, url, id });
        setShowSelectionModal(false);
        setResultImage(null);
        setErrorMessage(null);
    };

    // ── Derived ────────────────────────────────────────────────────────────────
    const canGenerate = !!personFile && !!selectedGarment && !isGenerating;

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                        Virtual Try-On <Sparkles className="w-5 h-5 text-accent" />
                    </h1>
                    <p className="text-foreground/60">
                        Upload your photo, choose a garment from your wardrobe, and preview the look with AI.
                    </p>
                </div>

                <Link
                    href="/try-on/room"
                    className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-black/10 dark:border-white/10 hover:bg-foreground/5 transition-colors shrink-0"
                >
                    <UserCircle2 className="w-4 h-4" /> Try-On Room
                </Link>

                {/* Service Status Badge */}
                {serviceStatus && (
                    <div
                        className={`flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border ${
                            serviceStatus.available
                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                                : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
                        }`}
                    >
                        {serviceStatus.available ? (
                            <><Zap className="w-3.5 h-3.5" /> HR-VITON · Live</>
                        ) : (
                            <><Wand2 className="w-3.5 h-3.5" /> Setup Required</>
                        )}
                    </div>
                )}
            </div>

            {/* Setup Banner (shown only when API key not configured) */}
            {serviceStatus && !serviceStatus.available && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-start gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 rounded-2xl p-4"
                >
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                            Service Unavailable
                        </p>
                        <p className="text-amber-700 dark:text-amber-400">
                            {serviceStatus.message}
                        </p>
                    </div>
                    {serviceStatus.setup_url && (
                        <a
                            href={serviceStatus.setup_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600 px-3 py-1.5 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors shrink-0"
                        >
                            Get Key <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </motion.div>
            )}

            <div className="flex flex-col xl:flex-row gap-8 flex-1 min-h-0 items-start">

                {/* Input Controls */}
                <div className="w-full xl:w-1/3 flex flex-col gap-6">

                    {/* Step 1 — Photo Upload */}
                    <div className="glass rounded-3xl p-6 border border-black/5 dark:border-white/5 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${personFile ? "bg-emerald-500 text-white" : "bg-accent/20 text-accent"}`}>
                                {personFile ? <CheckCircle className="w-4 h-4" /> : "1"}
                            </span>
                            Your Photo
                        </h3>
                        <div
                            onClick={() => photoInputRef.current?.click()}
                            className="aspect-[3/4] rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 relative overflow-hidden group cursor-pointer hover:border-accent/50 transition-colors bg-white/40 dark:bg-black/20"
                        >
                            {personImage ? (
                                <>
                                    <img src={personImage} className="w-full h-full object-cover" alt="Your photo" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <span className="text-white text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4" /> Change Photo</span>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/40 gap-3 group-hover:text-accent transition-colors">
                                    <Camera className="w-8 h-8" />
                                    <span className="text-sm font-medium">Upload Full Body Photo</span>
                                    <span className="text-xs text-foreground/40">JPG, PNG — front-facing</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                        />
                        <p className="text-xs text-foreground/50 text-center">
                            Use a well-lit, front-facing full-body photo for best results.
                        </p>
                    </div>

                    {/* Step 2 — Garment Selection */}
                    <div className="glass rounded-3xl p-6 border border-black/5 dark:border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedGarment ? "bg-emerald-500 text-white" : "bg-accent/20 text-accent"}`}>
                                    {selectedGarment ? <CheckCircle className="w-4 h-4" /> : "2"}
                                </span>
                                Select Clothing
                            </h3>
                            {selectedGarment && (
                                <button onClick={() => setShowSelectionModal(true)} className="text-xs font-medium text-accent hover:underline">Change</button>
                            )}
                        </div>
                        <div
                            className="aspect-[4/3] rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 relative overflow-hidden group cursor-pointer hover:border-accent/50 transition-colors bg-white/40 dark:bg-black/20"
                            onClick={() => setShowSelectionModal(true)}
                        >
                            {selectedGarment ? (
                                <>
                                    <img
                                        src={selectedGarment.url.startsWith("http") ? selectedGarment.url : `${API_BASE}${selectedGarment.url}`}
                                        alt={selectedGarment.name}
                                        className="w-full h-full object-contain p-4"
                                    />
                                    <div className="absolute bottom-0 w-full bg-white/80 dark:bg-black/80 backdrop-blur p-2 text-center text-xs font-medium border-t border-black/5">
                                        {selectedGarment.name}
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/40 gap-3 group-hover:text-accent transition-colors">
                                    <Shirt className="w-8 h-8" />
                                    <span className="text-sm font-medium">Choose from Closet or Outfits</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action & Result Canvas */}
                <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[500px] relative">
                    <div className="absolute inset-0 glass rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-inner" />
                    <div className="relative z-10 flex flex-col items-center text-center p-8 w-full max-w-md">

                        {isGenerating ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-8 w-full">
                                {/* Spinner */}
                                <div className="relative w-24 h-24">
                                    <div className="absolute inset-0 border-4 border-black/5 dark:border-white/5 rounded-full" />
                                    <div className="absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin" />
                                    <Wand2 className="absolute inset-0 m-auto w-9 h-9 text-accent animate-pulse" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold mb-1">Generating Preview…</h3>
                                    <p className="text-foreground/50 text-sm">
                                        Powered by HR-VITON · IDM-VTON
                                    </p>
                                </div>

                                {/* Progress Steps */}
                                <div className="w-full space-y-3">
                                    {steps.map((step, i) => (
                                        <motion.div
                                            key={i}
                                            animate={step.active ? { opacity: 1, x: 0 } : { opacity: step.done ? 0.5 : 0.3, x: 0 }}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                                step.done
                                                    ? "bg-emerald-500"
                                                    : step.active
                                                    ? "bg-accent animate-pulse"
                                                    : "bg-black/10 dark:bg-white/10"
                                            }`}>
                                                {step.done ? (
                                                    <CheckCircle className="w-3 h-3 text-white" />
                                                ) : step.active ? (
                                                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                                                ) : null}
                                            </div>
                                            <span className={step.active ? "font-semibold text-foreground" : "text-foreground/50"}>
                                                {step.label}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : errorMessage ? (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 w-full">
                                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2 text-red-600 dark:text-red-400">Generation Failed</h3>
                                    <p className="text-sm text-foreground/60 max-w-xs">{errorMessage}</p>
                                </div>
                                <button
                                    onClick={() => { setErrorMessage(null); setResultImage(null); }}
                                    className="flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground border border-black/10 dark:border-white/10 rounded-full px-5 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                >
                                    <RotateCcw className="w-4 h-4" /> Try Again
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent to-amber-200 flex items-center justify-center shadow-lg shadow-accent/30 mb-8 text-black">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <h2 className="text-3xl font-bold mb-4 tracking-tight">See yourself in it.</h2>
                                <p className="text-foreground/70 mb-8 max-w-sm text-sm">
                                    Upload your photo, select a garment, and click Generate to preview the look using AI.
                                </p>
                                <button
                                    onClick={handleGenerate}
                                    disabled={!canGenerate}
                                    className="bg-primary text-primary-foreground px-10 py-4 rounded-full text-lg font-medium hover:bg-primary/90 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                >
                                    Generate Try-On <ArrowRight className="w-5 h-5" />
                                </button>
                                {(!personFile || !selectedGarment) && (
                                    <p className="text-xs text-foreground/40 mt-4">
                                        {!personFile && !selectedGarment
                                            ? "Complete both steps to continue."
                                            : !personFile
                                            ? "⬆ Add your photo first."
                                            : "⬆ Select a clothing item first."}
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Garment Selection Modal ────────────────────────────────── */}
            <AnimatePresence>
                {showSelectionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="w-full max-w-2xl bg-white dark:bg-[#111] rounded-[2rem] shadow-2xl overflow-hidden border border-black/10 dark:border-white/10 flex flex-col max-h-[80vh]"
                        >
                            <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
                                <h2 className="text-xl font-bold">Select Clothing</h2>
                                <button onClick={() => setShowSelectionModal(false)} className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="px-6 pt-4 flex gap-4 border-b border-black/5 dark:border-white/5">
                                <button
                                    onClick={() => setActiveTab("closet")}
                                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "closet" ? "border-accent text-accent" : "border-transparent text-foreground/50 hover:text-foreground"}`}
                                >
                                    <div className="flex items-center gap-2"><Shirt className="w-4 h-4" /> My Closet</div>
                                </button>
                                <button
                                    onClick={() => setActiveTab("outfits")}
                                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "outfits" ? "border-accent text-accent" : "border-transparent text-foreground/50 hover:text-foreground"}`}
                                >
                                    <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Saved Outfits</div>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 bg-black/5 dark:bg-white/5">
                                {loadingItems ? (
                                    <div className="flex items-center justify-center h-32 gap-2 text-foreground/40">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Loading your wardrobe…
                                    </div>
                                ) : activeTab === "closet" ? (
                                    closetItems.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-foreground/40 gap-2 text-sm text-center">
                                            <Shirt className="w-8 h-8" />
                                            <p>No items in your closet yet.<br />Upload items in My Closet first.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {closetItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleSelectGarment(
                                                        item.name,
                                                        item.image_url ?? "",
                                                        item.id
                                                    )}
                                                    className="bg-white dark:bg-black rounded-xl p-3 border border-black/5 dark:border-white/5 cursor-pointer hover:border-accent hover:shadow-md transition-all group"
                                                >
                                                    <div className="aspect-square bg-black/5 dark:bg-white/5 rounded-lg mb-3 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                                                        {item.image_url ? (
                                                            <img src={`${API_BASE}${item.image_url}`} alt={item.name} className="w-full h-full object-contain p-2" />
                                                        ) : (
                                                            <Shirt className="w-8 h-8 text-foreground/20" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-semibold truncate">{item.name}</p>
                                                    <p className="text-[10px] text-foreground/50 uppercase">{item.category}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    savedOutfits.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-foreground/40 gap-2 text-sm text-center">
                                            <Layers className="w-8 h-8" />
                                            <p>No saved outfits yet.<br />Build and save outfits in the Outfit Builder.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {savedOutfits.map((outfit) => {
                                                const firstItem = outfit.items?.[0];
                                                const imgUrl = firstItem?.image_url ?? "";
                                                return (
                                                    <div
                                                        key={outfit.id}
                                                        onClick={() => handleSelectGarment(outfit.name, imgUrl, outfit.id)}
                                                        className="bg-white dark:bg-black rounded-xl p-3 border border-black/5 dark:border-white/5 cursor-pointer hover:border-accent hover:shadow-md transition-all group"
                                                    >
                                                        <div className="aspect-square bg-black/5 dark:bg-white/5 rounded-lg mb-3 overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                                                            {imgUrl ? (
                                                                <img src={`${API_BASE}${imgUrl}`} alt={outfit.name} className="w-full h-full object-contain p-2" />
                                                            ) : (
                                                                <Layers className="w-8 h-8 text-foreground/20" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs font-semibold truncate">{outfit.name}</p>
                                                        <p className="text-[10px] text-foreground/50">{outfit.items?.length ?? 0} items</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Result Modal ───────────────────────────────────────────── */}
            <AnimatePresence>
                {showResultModal && resultImage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="w-full max-w-5xl h-full max-h-[90vh] glass dark:glass-dark rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col md:flex-row"
                        >
                            {/* Image */}
                            <div className="w-full md:w-2/3 h-64 md:h-full bg-black relative flex items-center justify-center">
                                <img src={resultImage} alt="Try On Result" className="max-w-full max-h-full object-contain" />
                                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20">
                                    <Sparkles className="w-4 h-4 text-accent" /> HR-VITON Result
                                </div>
                            </div>
                            {/* Sidebar */}
                            <div className="w-full md:w-1/3 flex flex-col p-8 bg-white/50 dark:bg-black/50">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="text-2xl font-bold">Your Look</h3>
                                        <p className="text-xs text-foreground/50 mt-1">Generated by IDM-VTON · HR-VITON</p>
                                    </div>
                                    <button
                                        onClick={() => setShowResultModal(false)}
                                        className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-6 flex-1">
                                    {selectedGarment && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-3">Garment Applied</h4>
                                            <div className="flex items-center gap-4 bg-white/80 dark:bg-black/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                                                {selectedGarment.url && (
                                                    <img
                                                        src={selectedGarment.url.startsWith("http") ? selectedGarment.url : `${API_BASE}${selectedGarment.url}`}
                                                        alt={selectedGarment.name}
                                                        className="w-14 h-14 rounded-xl object-contain bg-black/5 p-1"
                                                    />
                                                )}
                                                <div>
                                                    <p className="font-semibold text-sm truncate max-w-[150px]">{selectedGarment.name}</p>
                                                    <p className="text-xs text-foreground/60">From your wardrobe</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-3">Actions</h4>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={handleDownload}
                                                className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-medium shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download className="w-4 h-4" /> Download Image
                                            </button>
                                            <button
                                                onClick={() => { setShowResultModal(false); setResultImage(null); }}
                                                className="w-full glass bg-white/50 border border-black/10 dark:border-white/10 py-3.5 rounded-2xl font-medium hover:bg-white dark:hover:bg-black transition-all"
                                            >
                                                Try Another Look
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
