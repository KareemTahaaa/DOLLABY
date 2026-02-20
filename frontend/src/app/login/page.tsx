"use client";

import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Mock login delay
        setTimeout(() => {
            setIsLoading(false);
            window.location.href = "/dashboard";
        }, 1500);
    };

    return (
        <div className="min-h-screen animated-bg flex items-center justify-center p-6 text-foreground">
            <Link href="/" className="absolute top-8 left-8 text-2xl font-bold tracking-tighter">
                Dollaby.
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md p-8 sm:p-10 rounded-[2rem] glass dark:glass-dark shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mx-10 -my-10" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mx-10 -my-10" />

                <div className="relative z-10">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                        <p className="text-foreground/60">Enter your credentials to access your digital wardrobe.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground/80 pl-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full bg-white/40 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-foreground/30"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between pl-1 pr-1">
                                <label className="text-sm font-medium text-foreground/80">Password</label>
                                <Link href="#" className="text-sm text-accent hover:underline">Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/40 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all placeholder:text-foreground/30"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pl-1 my-2">
                            <input type="checkbox" id="remember" className="rounded-md border-black/20 text-accent focus:ring-accent w-4 h-4 cursor-pointer" />
                            <label htmlFor="remember" className="text-sm text-foreground/70 cursor-pointer">Remember me for 30 days</label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-medium tracking-wide hover:bg-primary/90 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 relative flex items-center justify-center">
                        <div className="absolute w-full border-t border-black/10 dark:border-white/10" />
                        <span className="relative bg-[#fdfdf9] glass dark:glass-dark px-4 text-xs font-medium text-foreground/50 uppercase tracking-widest rounded-full">Or continue with</span>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <button className="w-full bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 py-3 rounded-2xl font-medium flex items-center justify-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                    </div>

                    <p className="mt-8 text-center text-sm text-foreground/60">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-foreground font-semibold hover:underline decoration-accent underline-offset-4">
                            Sign up
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
