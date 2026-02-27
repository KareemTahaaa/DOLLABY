"use client";

import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiLogin } from "@/lib/api";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            const data = await apiLogin(email, password);
            localStorage.setItem("dollaby_token", data.access_token);
            // Decode name from JWT payload
            const payload = JSON.parse(atob(data.access_token.split(".")[1]));
            localStorage.setItem("dollaby_userName", payload.name ?? email.split("@")[0]);
            window.location.href = "/dashboard";
        } catch (err: any) {
            setError(err.message ?? "Login failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
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
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}
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

                    <p className="mt-8 text-center text-sm text-foreground/60">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-foreground font-semibold hover:underline decoration-accent underline-offset-4">
                            Sign up
                        </Link>
                    </p>

                </div>
            </motion.div>
        </div>
    );
}
