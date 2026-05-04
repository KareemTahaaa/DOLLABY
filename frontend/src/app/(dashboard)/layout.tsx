"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Shirt, Layers, Calendar, Sparkles, MessageSquare, Settings, Search, Bell, User, Menu, X, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Closet", href: "/closet", icon: Shirt },
    { name: "Outfit Builder", href: "/outfits", icon: Layers },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Virtual Try-On", href: "/try-on", icon: Sparkles },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquare },
    { name: "Settings", href: "/settings", icon: Settings },
];

function logout() {
    localStorage.removeItem("dollaby_token");
    localStorage.removeItem("dollaby_userName");
    // Clear the auth cookie
    document.cookie = "dollaby_token=; path=/; max-age=0";
    window.location.href = "/login";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [searchValue, setSearchValue] = useState("");
    const [searchFocused, setSearchFocused] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [userName, setUserName] = useState("User");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedName = localStorage.getItem("dollaby_userName");
        if (storedName) setUserName(storedName);
        
        const storedAvatar = localStorage.getItem("dollaby_avatar");
        if (storedAvatar) setAvatarUrl(storedAvatar);

        const handleAvatarUpdate = () => {
            const newAvatar = localStorage.getItem("dollaby_avatar");
            if (newAvatar) setAvatarUrl(newAvatar);
        };
        window.addEventListener("avatar_updated", handleAvatarUpdate);
        return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim()) {
            router.push(`/closet?search=${encodeURIComponent(searchValue.trim())}`);
            setSearchValue("");
        }
    };

    const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
        <>
            {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={onNavigate}
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
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
            {/* Sidebar — Desktop */}
            <aside className="w-64 border-r border-black/5 dark:border-white/5 flex flex-col glass dark:glass-dark hidden md:flex z-20">
                <div className="h-20 flex items-center px-8 border-b border-black/5 dark:border-white/5">
                    <Link href="/" className="text-2xl font-bold tracking-tighter">Dollaby.</Link>
                </div>

                <div className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
                    <div className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2 px-4">Menu</div>
                    <NavLinks />
                </div>

                {/* Sidebar footer — Logout */}
                <div className="p-4 border-t border-black/5 dark:border-white/5">
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-foreground/60 hover:bg-red-500/10 hover:text-red-500 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sign Out</span>
                    </button>
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
                                <NavLinks onNavigate={() => setIsMobileMenuOpen(false)} />
                            </div>
                            <div className="p-4 border-t border-black/5 dark:border-white/5">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-foreground/60 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="font-medium">Sign Out</span>
                                </button>
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
                        {/* Global Search (navigates to /closet?search=...) */}
                        <form onSubmit={handleSearch} className="w-full">
                            <div className={`flex items-center bg-white/50 dark:bg-black/20 border transition-all rounded-full px-4 py-2 w-full ${searchFocused ? "border-accent ring-2 ring-accent/20" : "border-black/10 dark:border-white/10"}`}>
                                <Search className="w-4 h-4 text-foreground/40 mr-2 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder="Search closet items… (press Enter)"
                                    className="bg-transparent border-none outline-none w-full text-sm placeholder:text-foreground/40"
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                />
                            </div>
                        </form>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setNotifOpen(!notifOpen)}
                                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-black/5 transition-colors relative"
                            >
                                <Bell className="w-5 h-5 text-foreground/70" />
                            </button>
                            <AnimatePresence>
                                {notifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        className="absolute right-0 top-12 w-72 glass dark:glass-dark rounded-2xl shadow-xl border border-black/5 dark:border-white/5 overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-black/5 dark:border-white/5">
                                            <h3 className="font-semibold text-sm">Notifications</h3>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <Sparkles className="w-4 h-4 text-accent" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Welcome to Dollaby!</p>
                                                    <p className="text-xs text-foreground/50 mt-0.5">Start by uploading items to your closet.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <MessageSquare className="w-4 h-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">AI Assistant is ready</p>
                                                    <p className="text-xs text-foreground/50 mt-0.5">Ask your stylist for outfit ideas.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* User Avatar + Dropdown */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:ring-2 hover:ring-accent/50 transition-all"
                            >
                                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarUrl ? (
                                        <img src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-4 h-4 text-primary" />
                                    )}
                                </div>
                                <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">{userName}</span>
                                <ChevronDown className={`w-4 h-4 text-foreground/50 transition-transform hidden sm:block ${userMenuOpen ? "rotate-180" : ""}`} />
                            </button>

                            <AnimatePresence>
                                {userMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        className="absolute right-0 top-12 w-48 glass dark:glass-dark rounded-2xl shadow-xl border border-black/5 dark:border-white/5 overflow-hidden"
                                    >
                                        <div className="p-3 border-b border-black/5 dark:border-white/5">
                                            <p className="text-xs text-foreground/50">Signed in as</p>
                                            <p className="text-sm font-semibold truncate">{userName}</p>
                                        </div>
                                        <div className="p-2">
                                            <Link
                                                href="/settings"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <Settings className="w-4 h-4" /> Settings
                                            </Link>
                                            <button
                                                onClick={logout}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" /> Sign Out
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
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
