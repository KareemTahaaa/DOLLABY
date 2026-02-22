"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Upload, Image as ImageIcon, Camera, ArrowRight, Wand2, X, Shirt, Save, Layers } from "lucide-react";
import { useState } from "react";

// Mock data for selections
const closetItems = [
    { id: 1, type: "Top", name: "White Silk Blouse", url: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=500&q=80" },
    { id: 2, type: "Bottom", name: "Beige Chinos", url: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&q=80" },
    { id: 3, type: "Top", name: "Navy Blazer", url: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80" },
];

const savedOutfits = [
    { id: 1, name: "Office Ready", items: ["White Silk Blouse", "Navy Blazer"], url: "https://images.unsplash.com/photo-1434389678369-182cb14b0972?w=500&q=80" }, // Visual representation
    { id: 2, name: "Casual Sunday", items: ["Linen Shirt", "Beige Chinos"], url: "https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=500&q=80" },
];

export default function VirtualTryOnPage() {
    const [personImage, setPersonImage] = useState<string | null>("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80"); // Mock default
    const [selectedGarment, setSelectedGarment] = useState<{ name: string, url: string } | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);

    // Selection Modal State
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [activeTab, setActiveTab] = useState<"closet" | "outfits">("closet");

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate generation delay
        setTimeout(() => {
            setIsGenerating(false);
            // Mock result
            setResultImage("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80");
            setShowResultModal(true);
        }, 4000);
    };

    const handleSelectGarment = (item: { name: string, url: string }) => {
        setSelectedGarment(item);
        setShowSelectionModal(false);
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                        Virtual Try-On <Sparkles className="w-5 h-5 text-accent" />
                    </h1>
                    <p className="text-foreground/60">Upload your photo and select a garment or outfit to try on.</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 flex-1 min-h-0 items-start">

                {/* Input Controls */}
                <div className="w-full xl:w-1/3 flex flex-col gap-6">
                    <div className="glass rounded-3xl p-6 border border-black/5 dark:border-white/5 space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">1</span>
                            Your Photo
                        </h3>
                        <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 relative overflow-hidden group cursor-pointer hover:border-accent/50 transition-colors bg-white/40 dark:bg-black/20">
                            {personImage ? (
                                <>
                                    <img src={personImage} className="w-full h-full object-cover" alt="You" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <span className="text-white text-sm font-medium flex items-center gap-2"><Upload className="w-4 h-4" /> Change Photo</span>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/40 gap-3 group-hover:text-accent transition-colors">
                                    <Camera className="w-8 h-8" />
                                    <span className="text-sm font-medium">Upload Full Body Photo</span>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-foreground/50 text-center">Use a well-lit, front-facing photo.</p>
                    </div>

                    <div className="glass rounded-3xl p-6 border border-black/5 dark:border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">2</span>
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
                                    <div className="w-full h-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${selectedGarment.url})`, mixBlendMode: 'multiply' }} />
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
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center min-h-[500px] relative">

                    <div className="absolute inset-0 glass rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-inner" />

                    <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md">

                        {isGenerating ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="relative w-32 h-32">
                                    <div className="absolute inset-0 border-4 border-black/5 dark:border-white/5 rounded-full" />
                                    <div className="absolute inset-0 border-4 border-accent rounded-full border-t-transparent animate-spin" />
                                    <Wand2 className="absolute inset-0 m-auto w-10 h-10 text-accent animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">Generating Preview</h3>
                                    <p className="text-foreground/60 text-sm leading-relaxed">Our generative AI is mapping the fabric physics and lighting to your photo. Please wait.</p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent to-amber-200 flex items-center justify-center shadow-lg shadow-accent/30 mb-8 text-black">
                                    <Sparkles className="w-8 h-8" />
                                </div>
                                <h2 className="text-3xl font-bold mb-4 tracking-tight">Ready to see the magic?</h2>
                                <p className="text-foreground/70 mb-8 max-w-sm">Combining your image and wardrobe selection to create a hyper-realistic try-on rendering.</p>

                                <button
                                    onClick={handleGenerate}
                                    disabled={!personImage || !selectedGarment}
                                    className="bg-primary text-primary-foreground px-10 py-4 rounded-full text-lg font-medium hover:bg-primary/90 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                >
                                    Generate Try-On <ArrowRight className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}

                    </div>
                </div>
            </div>

            {/* Garment Selection Modal */}
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
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {activeTab === "closet" ? (
                                        closetItems.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleSelectGarment(item)}
                                                className="bg-white dark:bg-black rounded-xl p-3 border border-black/5 dark:border-white/5 cursor-pointer hover:border-accent hover:shadow-md transition-all group"
                                            >
                                                <div className="aspect-square bg-white/40 dark:bg-black/20 rounded-lg mb-3 bg-contain bg-center bg-no-repeat group-hover:scale-105 transition-transform" style={{ backgroundImage: `url(${item.url})`, mixBlendMode: 'multiply' }} />
                                                <p className="text-xs font-semibold truncate">{item.name}</p>
                                                <p className="text-[10px] text-foreground/50 uppercase">{item.type}</p>
                                            </div>
                                        ))
                                    ) : (
                                        savedOutfits.map((outfit) => (
                                            <div
                                                key={outfit.id}
                                                onClick={() => handleSelectGarment(outfit)}
                                                className="bg-white dark:bg-black rounded-xl p-3 border border-black/5 dark:border-white/5 cursor-pointer hover:border-accent hover:shadow-md transition-all group"
                                            >
                                                <div className="aspect-square bg-white/40 dark:bg-black/20 rounded-lg mb-3 bg-contain bg-center bg-no-repeat group-hover:scale-105 transition-transform" style={{ backgroundImage: `url(${outfit.url})`, mixBlendMode: 'multiply' }} />
                                                <p className="text-xs font-semibold truncate">{outfit.name}</p>
                                                <p className="text-[10px] text-foreground/50 truncate">{outfit.items.length} items</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Result Modal */}
            <AnimatePresence>
                {showResultModal && resultImage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="w-full max-w-5xl h-full max-h-[90vh] glass dark:glass-dark rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col md:flex-row"
                        >
                            {/* Image Result */}
                            <div className="w-full md:w-2/3 h-64 md:h-full bg-black relative flex items-center justify-center">
                                <img src={resultImage} alt="Try On Result" className="max-w-full max-h-full object-contain" />
                                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/20">
                                    <Sparkles className="w-4 h-4 text-accent" /> AI Generated
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="w-full md:w-1/3 flex flex-col p-8 bg-white/50 dark:bg-black/50">
                                <div className="flex justify-between items-start mb-8">
                                    <h3 className="text-2xl font-bold">Try-On Result</h3>
                                    <button onClick={() => setShowResultModal(false)} className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-6 flex-1">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-3">Garment</h4>
                                        <div className="flex items-center gap-4 bg-white/80 dark:bg-black/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                                            <div className="w-16 h-16 rounded-xl bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${selectedGarment?.url})`, mixBlendMode: 'multiply' }} />
                                            <div>
                                                <p className="font-semibold text-sm truncate max-w-[150px]">{selectedGarment?.name}</p>
                                                <p className="text-xs text-foreground/60">Selected Wardrobe Item</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-3">Actions</h4>
                                        <div className="flex flex-col gap-3">
                                            <button className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-medium shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                                                <Save className="w-4 h-4" /> Save to Lookbook
                                            </button>
                                            <button className="w-full glass bg-white/50 border border-black/10 dark:border-white/10 py-3.5 rounded-2xl font-medium hover:bg-white dark:hover:bg-black transition-all">
                                                Download Image
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
