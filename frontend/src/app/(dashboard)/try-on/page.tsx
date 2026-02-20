"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Upload, Image as ImageIcon, Camera, ArrowRight, Wand2, X, Shirt, Save } from "lucide-react";
import { useState } from "react";

export default function VirtualTryOnPage() {
    const [personImage, setPersonImage] = useState<string | null>("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80"); // Mock default
    const [garmentImage, setGarmentImage] = useState<string | null>("https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=500&q=80");

    const [isGenerating, setIsGenerating] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate generation delay
        setTimeout(() => {
            setIsGenerating(false);
            // Mock result showing person wearing the garment (just showing the person for mockup purposes)
            setResultImage("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80");
            setShowModal(true);
        }, 4000);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                        Virtual Try-On <Sparkles className="w-5 h-5 text-accent" />
                    </h1>
                    <p className="text-foreground/60">Upload your photo and a garment to see how it looks instantly.</p>
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
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">2</span>
                            Select Garment
                        </h3>
                        <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 relative overflow-hidden group cursor-pointer hover:border-accent/50 transition-colors bg-white/40 dark:bg-black/20">
                            {garmentImage ? (
                                <>
                                    <div className="w-full h-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${garmentImage})`, mixBlendMode: 'multiply' }} />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <span className="text-white text-sm font-medium flex items-center gap-2"><Shirt className="w-4 h-4" /> Choose from Closet</span>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/40 gap-3 group-hover:text-accent transition-colors">
                                    <ImageIcon className="w-8 h-8" />
                                    <span className="text-sm font-medium">Select to Try On</span>
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
                                    <p className="text-foreground/60 text-sm leading-relaxed">Our generative AI is calculating fabric drape, lighting, and fit. This may take a few seconds.</p>
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
                                <p className="text-foreground/70 mb-8 max-w-sm">Combining your image and garment to create a hyper-realistic try-on rendering.</p>

                                <button
                                    onClick={handleGenerate}
                                    disabled={!personImage || !garmentImage}
                                    className="bg-primary text-primary-foreground px-10 py-4 rounded-full text-lg font-medium hover:bg-primary/90 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                >
                                    Generate Try-On <ArrowRight className="w-5 h-5" />
                                </button>
                            </motion.div>
                        )}

                    </div>
                </div>
            </div>

            {/* Result Modal */}
            <AnimatePresence>
                {showModal && resultImage && (
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
                                    <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-6 flex-1">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/50 uppercase tracking-wider mb-3">Garment</h4>
                                        <div className="flex items-center gap-4 bg-white/80 dark:bg-black/40 p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                                            <div className="w-16 h-16 rounded-xl bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${garmentImage})`, mixBlendMode: 'multiply' }} />
                                            <div>
                                                <p className="font-semibold text-sm">Silk Blouse</p>
                                                <p className="text-xs text-foreground/60">Ivory &middot; Top</p>
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
