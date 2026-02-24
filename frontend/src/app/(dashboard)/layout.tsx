"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Shirt, Layers, Calendar, Sparkles, MessageSquare, Settings, Search, Bell, User, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Closet", href: "/closet", icon: Shirt },
    { name: "Outfit Builder", href: "/outfits", icon: Layers },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Virtual Try-On", href: "/try-on", icon: Sparkles },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
    { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [searchFocused, setSearchFocused] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-black/5 dark:border-white/5 flex flex-col glass dark:glass-dark hidden md:flex z-20">
                <div className="h-20 flex items-center px-8 border-b border-black/5 dark:border-white/5">
                    <Link href="/" className="text-2xl font-bold tracking-tighter">Dollaby</Link>
                </div>

                <div className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
                    <div className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2 px-4">Menu</div>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? "text-accent" : ""}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 md:hidden flex">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="w-64 h-full bg-background border-r border-black/5 dark:border-white/5 glass dark:glass-dark relative z-50 flex flex-col"
                        >
                            <div className="h-20 flex items-center justify-between px-8 border-b border-black/5 dark:border-white/5">
                                <Link href="/" className="text-2xl font-bold tracking-tighter" onClick={() => setIsMobileMenuOpen(false)}>Dollaby.</Link>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-foreground/70" />
                                </button>
                            </div>
                            <div className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
                                <div className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2 px-4">Menu</div>
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${isActive
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                                                }`}
                                        >
                                            <item.icon className={`w-5 h-5 ${isActive ? "text-accent" : ""}`} />
                                            <span className="font-medium">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
                {/* Top Navbar */}
                <header className="h-20 glass dark:glass-dark border-b border-black/5 dark:border-white/5 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-30">

                    <div className="flex items-center gap-2 w-full max-w-md">
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-6 h-6 text-foreground" />
                        </button>
                        <div className={`flex items-center bg-white/50 dark:bg-black/20 border transition-all rounded-full px-4 py-2 w-full ${searchFocused ? "border-accent ring-2 ring-accent/20" : "border-black/10 dark:border-white/10"}`}>
                            <Search className="w-4 h-4 text-foreground/40 mr-2 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Search clothes, outfits, or ask AI..."
                                className="bg-transparent border-none outline-none w-full text-sm placeholder:text-foreground/40"
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-black/5 transition-colors relative">
                            <Bell className="w-5 h-5 text-foreground/70" />
                            <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border border-background"></div>
                        </button>
                        <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 hover:ring-2 hover:ring-accent/50 transition-all overflow-hidden relative">
                            <User className="w-5 h-5 text-primary" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-[#fafaf8] dark:bg-[#0c0c0c] relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px] z-0 pointer-events-none" />
                    <div className="relative z-10 p-6 lg:p-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
