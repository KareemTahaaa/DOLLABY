"use client";

import { motion } from "framer-motion";
import { User, Lock, Palette, Trash2, Save, AlertCircle, CheckCircle2, Moon, Sun, Loader2, ShieldAlert, Camera } from "lucide-react";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function SettingsPage() {
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [userLocation, setUserLocation] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [darkMode, setDarkMode] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("dollaby_userName") || "";
        setUserName(stored);
        setNewName(stored);
        setDarkMode(document.documentElement.classList.contains("dark"));

        // Fetch full profile from backend
        apiFetch("/auth/me").then((data) => {
            setUserEmail(data.email);
            setUserName(data.name);
            setNewName(data.name);
            setUserLocation(data.location || "");
            if (data.profile_picture) {
                setAvatarUrl(data.profile_picture);
                localStorage.setItem("dollaby_avatar", data.profile_picture);
                window.dispatchEvent(new Event("avatar_updated"));
            }
        }).catch(() => {});
    }, []);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const token = localStorage.getItem("dollaby_token");
            const res = await fetch(`${API_BASE}/auth/upload-avatar`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            setAvatarUrl(data.profile_picture);
            localStorage.setItem("dollaby_avatar", data.profile_picture);
            window.dispatchEvent(new Event("avatar_updated"));
            toast.success("Profile picture updated!");
        } catch (err: any) {
            toast.error("Failed to upload picture.");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleToggleDark = () => {
        const isDark = document.documentElement.classList.toggle("dark");
        setDarkMode(isDark);
        localStorage.setItem("theme", isDark ? "dark" : "light");
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) { toast.error("Name cannot be empty."); return; }
        setSavingProfile(true);
        try {
            await apiFetch("/auth/update-profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName, location: userLocation }),
            });
            localStorage.setItem("dollaby_userName", newName);
            setUserName(newName);
            toast.success("Profile updated successfully!");
        } catch (err: any) {
            toast.error(err.message ?? "Failed to update profile.");
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        setSavingPassword(true);
        try {
            await apiFetch("/auth/update-profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
            });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            toast.success("Password changed successfully!");
        } catch (err: any) {
            toast.error(err.message ?? "Failed to change password.");
        } finally {
            setSavingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await apiFetch("/auth/delete-account", { method: "DELETE" });
            localStorage.clear();
            document.cookie = "dollaby_token=; path=/; max-age=0";
            window.location.href = "/";
        } catch (err: any) {
            alert("Failed to delete account: " + err.message);
        }
    };

    const Section = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 border border-black/5 dark:border-white/5 shadow-sm"
        >
            <h2 className="text-lg font-bold flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <Icon className="w-5 h-5" />
                </div>
                {title}
            </h2>
            {children}
        </motion.div>
    );



    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
                <p className="text-foreground/60">Manage your account and preferences.</p>
            </div>

            {/* Profile Section */}
            <Section icon={User} title="Profile">
                <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="relative w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden">
                            {avatarUrl ? (
                                <img src={`${API_BASE}${avatarUrl}`} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-8 h-8 text-foreground/30" />
                            )}
                            {uploadingAvatar && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-accent" />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer inline-flex items-center gap-2">
                                <Camera className="w-4 h-4" /> Change Picture
                                <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatarUpload} />
                            </label>
                            <p className="text-xs text-foreground/50 mt-2">JPG or PNG. Max size 5MB.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5 block">Display Name</label>
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5 block">City / Location</label>
                            <input
                                value={userLocation}
                                onChange={(e) => setUserLocation(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                                placeholder="e.g. Cairo, Egypt"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5 block">Email Address</label>
                        <input
                            value={userEmail}
                            disabled
                            className="w-full px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-sm text-foreground/50 cursor-not-allowed"
                        />
                        <p className="text-xs text-foreground/40 mt-1 pl-1">Email cannot be changed.</p>
                    </div>
                    <button
                        type="submit"
                        disabled={savingProfile}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md disabled:opacity-60"
                    >
                        {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Name
                    </button>
                </form>
            </Section>

            {/* Password Section */}
            <Section icon={Lock} title="Change Password">
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5 block">Current Password</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5 block">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                                placeholder="Min. 6 chars"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5 block">Confirm</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                                placeholder="Repeat"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={savingPassword}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-md disabled:opacity-60"
                    >
                        {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Change Password
                    </button>
                </form>
            </Section>

            {/* Appearance Section */}
            <Section icon={Palette} title="Appearance">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-sm text-foreground/50 mt-0.5">Switch between light and dark themes.</p>
                    </div>
                    <button
                        onClick={handleToggleDark}
                        className={`w-14 h-7 rounded-full relative transition-colors ${darkMode ? "bg-accent" : "bg-black/20"}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform flex items-center justify-center ${darkMode ? "translate-x-8" : "translate-x-1"}`}>
                            {darkMode ? <Moon className="w-3 h-3 text-accent" /> : <Sun className="w-3 h-3 text-amber-500" />}
                        </div>
                    </button>
                </div>
            </Section>

            {/* Danger Zone */}
            <Section icon={ShieldAlert} title="Danger Zone">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                    <div>
                        <p className="font-medium text-red-600">Delete Account</p>
                        <p className="text-sm text-foreground/50 mt-0.5">Permanently delete your account and all wardrobe data.</p>
                    </div>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-red-600 transition-colors shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>

                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 space-y-3"
                    >
                        <p className="text-sm font-medium text-red-600">⚠️ This action is irreversible. All your clothing items, outfits, and account data will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl border border-black/10 dark:border-white/10 text-sm font-medium hover:bg-black/5 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDeleteAccount} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
                                Yes, Delete Everything
                            </button>
                        </div>
                    </motion.div>
                )}
            </Section>
        </div>
    );
}
