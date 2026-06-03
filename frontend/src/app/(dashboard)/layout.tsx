"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Shirt, Layers, Calendar, Sparkles, MessageSquare, Settings, Search, Bell, User, Menu, X, LogOut, ChevronDown, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const navigation = [
    { name: "Dashboard",       href: "/dashboard",    icon: LayoutDashboard },
    { name: "My Closet",       href: "/closet",       icon: Shirt },
    { name: "Outfit Builder",  href: "/outfits",      icon: Layers },
    { name: "Calendar",        href: "/calendar",     icon: Calendar },
    { name: "Virtual Try-On",  href: "/try-on",       icon: Sparkles },
    { name: "AI Assistant",    href: "/assistant",    icon: MessageSquare },
    { name: "Settings",        href: "/settings",     icon: Settings },
];

function logout() {
    localStorage.removeItem("dollaby_token");
    localStorage.removeItem("dollaby_userName");
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
    const [isDark, setIsDark] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedName = localStorage.getItem("dollaby_userName");
        if (storedName) setUserName(storedName);
        const storedAvatar = localStorage.getItem("dollaby_avatar");
        if (storedAvatar) setAvatarUrl(storedAvatar);
        setIsDark(document.documentElement.classList.contains("dark"));

        const handleAvatarUpdate = () => {
            const newAvatar = localStorage.getItem("dollaby_avatar");
            if (newAvatar) setAvatarUrl(newAvatar);
        };
        window.addEventListener("avatar_updated", handleAvatarUpdate);
        return () => window.removeEventListener("avatar_updated", handleAvatarUpdate);
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim()) {
            router.push(`/closet?search=${encodeURIComponent(searchValue.trim())}`);
            setSearchValue("");
        }
    };

    const NavItem = ({ item, onClick }: { item: typeof navigation[0]; onClick?: () => void }) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
            <Link href={item.href} onClick={onClick}
                className="relative flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-colors group">
                {isActive && (
                    <motion.div layoutId="nav-pill"
                        className="absolute inset-0 bg-foreground rounded-2xl"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                )}
                <item.icon style={{ width: 17, height: 17 }}
                    className={`relative transition-colors ${isActive ? "text-background" : "text-foreground/45 group-hover:text-foreground"}`} />
                <span className={`relative font-medium text-sm transition-colors ${isActive ? "text-background" : "text-foreground/65 group-hover:text-foreground"}`}>
                    {item.name}
                </span>
            </Link>
        );
    };

    const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
        <>
            <nav className="flex-1 py-5 px-3 flex flex-col gap-0.5 overflow-y-auto scrollbar-hide">
                <p className="text-[10px] font-semibold text-foreground/30 uppercase tracking-[0.12em] px-4 mb-2">Menu</p>
                {navigation.map(item => <NavItem key={item.href} item={item} onClick={onNavigate} />)}
            </nav>
            <div className="p-3 border-t border-foreground/5 space-y-1">
                <button onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-foreground/55 hover:bg-foreground/5 hover:text-foreground transition-all text-sm font-medium">
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {isDark ? "Light Mode" : "Dark Mode"}
                </button>
                <button onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-foreground/45 hover:bg-red-500/10 hover:text-red-500 transition-all text-sm font-medium">
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden">

            {/* Sidebar — Desktop */}
            <aside className="w-60 border-r border-foreground/5 flex-col hidden md:flex z-20 sidebar-glass">
                <div className="h-16 flex items-center px-6 border-b border-foreground/5">
                    <Link href="/" className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                        Dollaby<span className="text-accent">.</span>
                    </Link>
                </div>
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 md:hidden flex">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60" onClick={() => setIsMobileMenuOpen(false)} />
                        <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="w-60 h-full border-r border-foreground/5 relative z-50 flex flex-col sidebar-glass">
                            <div className="h-16 flex items-center justify-between px-6 border-b border-foreground/5">
                                <Link href="/" className="font-heading text-2xl font-semibold" onClick={() => setIsMobileMenuOpen(false)}>
                                    Dollaby<span className="text-accent">.</span>
                                </Link>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-foreground/5 rounded-lg">
                                    <X className="w-5 h-5 text-foreground/60" />
                                </button>
                            </div>
                            <SidebarContent onNavigate={() => setIsMobileMenuOpen(false)} />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Main */}
            <div className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">

                {/* Navbar */}
                <header className="h-16 border-b border-foreground/5 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 navbar-glass">
                    <div className="flex items-center gap-3 w-full max-w-sm">
                        <button className="md:hidden p-2 rounded-lg hover:bg-foreground/5 transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="w-5 h-5 text-foreground" />
                        </button>
                        <form onSubmit={handleSearch} className="w-full">
                            <div className={`flex items-center bg-foreground/4 border transition-all rounded-full px-4 py-2 w-full ${searchFocused ? "border-accent/50 ring-2 ring-accent/12" : "border-foreground/8"}`}>
                                <Search className="w-3.5 h-3.5 text-foreground/35 mr-2.5 flex-shrink-0" />
                                <input type="text" value={searchValue} onChange={e => setSearchValue(e.target.value)}
                                    placeholder="Search your closet…"
                                    className="bg-transparent border-none outline-none w-full text-sm placeholder:text-foreground/35 text-foreground"
                                    onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} />
                            </div>
                        </form>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button onClick={() => setNotifOpen(!notifOpen)}
                                className="w-9 h-9 rounded-full border border-foreground/8 flex items-center justify-center hover:bg-foreground/5 transition-colors">
                                <Bell className="w-4 h-4 text-foreground/55" />
                            </button>
                            <AnimatePresence>
                                {notifOpen && (
                                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                        className="absolute right-0 top-11 w-72 rounded-2xl shadow-xl border border-foreground/5 overflow-hidden dropdown-glass">
                                        <div className="p-4 border-b border-foreground/5">
                                            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                                        </div>
                                        <div className="p-3 space-y-1">
                                            {[
                                                { icon: Sparkles, color: "text-accent", bg: "bg-accent/10", title: "Welcome to Dollaby!", sub: "Start by uploading items to your closet." },
                                                { icon: MessageSquare, color: "text-foreground/60", bg: "bg-foreground/5", title: "AI Stylist is ready", sub: "Ask for outfit recommendations anytime." },
                                            ].map(({ icon: Icon, color, bg, title, sub }, i) => (
                                                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-foreground/4 transition-colors cursor-pointer">
                                                    <div className={`w-8 h-8 rounded-full ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{title}</p>
                                                        <p className="text-xs text-foreground/45 mt-0.5">{sub}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* User menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-foreground/8 hover:bg-foreground/5 transition-all">
                                <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarUrl
                                        ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                                        : <User className="w-3.5 h-3.5 text-accent" />
                                    }
                                </div>
                                <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate text-foreground">{userName}</span>
                                <ChevronDown className={`w-3.5 h-3.5 text-foreground/40 transition-transform hidden sm:block ${userMenuOpen ? "rotate-180" : ""}`} />
                            </button>

                            <AnimatePresence>
                                {userMenuOpen && (
                                    <motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                        className="absolute right-0 top-11 w-44 rounded-2xl shadow-xl border border-foreground/5 overflow-hidden dropdown-glass">
                                        <div className="px-3 py-2.5 border-b border-foreground/5">
                                            <p className="text-[10px] text-foreground/40 uppercase tracking-wider">Signed in as</p>
                                            <p className="text-sm font-semibold truncate text-foreground mt-0.5">{userName}</p>
                                        </div>
                                        <div className="p-1.5">
                                            <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-foreground/5 transition-colors text-foreground">
                                                <Settings className="w-3.5 h-3.5 text-foreground/45" /> Settings
                                            </Link>
                                            <button onClick={logout}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/8 transition-colors">
                                                <LogOut className="w-3.5 h-3.5" /> Sign Out
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto relative bg-background">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20 dark:opacity-10"
                        style={{ background: "radial-gradient(circle, #c9a84c 0%, transparent 70%)" }} />
                    <div className="relative z-10 p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
