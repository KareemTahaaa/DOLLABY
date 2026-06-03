"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Layers, Wand2, Calendar, Shirt, MessageSquare, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const features = [
  {
    title: "AI Clothing Detection",
    description: "Instantly categorize and tag your uploaded clothes with advanced CNN models.",
    icon: <Wand2 className="w-6 h-6 text-accent" />,
  },
  {
    title: "2D Clean Garment Processing",
    description: "Remove backgrounds automatically using U²-Net for pristine wardrobe visuals.",
    icon: <Shirt className="w-6 h-6 text-accent" />,
  },
  {
    title: "Smart Outfit Builder",
    description: "Drag-and-drop interface with AI-powered color harmony and style matching.",
    icon: <Layers className="w-6 h-6 text-accent" />,
  },
  {
    title: "Virtual Try-On",
    description: "See how items look on you using cutting-edge generative AI models.",
    icon: <Sparkles className="w-6 h-6 text-accent" />,
  },
  {
    title: "Smart Outfit Calendar",
    description: "Schedule your looks in advance with our elegant drag-and-drop calendar planner.",
    icon: <Calendar className="w-6 h-6 text-accent" />,
  },
  {
    title: "AI Fashion Assistant",
    description: "Chat with your personal stylist for outfit recommendations for any occasion.",
    icon: <MessageSquare className="w-6 h-6 text-accent" />,
  },
];

const testimonials = [
  { quote: "Dollaby completely transformed how I get ready. It feels like having a personal stylist in my pocket.", name: "Sarah J.", role: "Fashion Blogger" },
  { quote: "The virtual try-on is pure magic. I never buy anything now without checking it on Dollaby first.", name: "Michael T.", role: "Creative Director" },
  { quote: "Finally, a digital wardrobe that actually looks premium and works flawlessly.", name: "Elena R.", role: "Entrepreneur" },
];

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen animated-bg flex flex-col text-foreground overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass dark:glass-dark border-b border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tighter hover:opacity-80 transition-opacity">Dollaby</Link>

          <div className="hidden md:flex gap-6 items-center">
            <Link href="/login" className="text-sm font-medium hover:text-accent transition-colors">Log in</Link>
            <Link href="/signup" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl">
              Get Started
            </Link>
          </div>

          <button
            className="md:hidden p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-20 left-0 w-full glass dark:glass-dark border-b border-black/5 dark:border-white/5 flex flex-col p-6 shadow-xl"
            >
              <div className="flex flex-col gap-6">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium hover:text-accent transition-colors">Log in</Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="bg-primary text-primary-foreground px-5 py-4 rounded-xl text-center font-medium hover:bg-primary/90 transition-all shadow-lg">
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col pt-32 pb-20">
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass dark:glass-dark mb-8"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Meet the future of fashion tech</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl"
          >
            Your Smart AI-Powered <br className="hidden md:block" /> Digital Wardrobe
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-foreground/70 mb-10 max-w-2xl"
          >
            Organize. Style. Try-On. Elevate. Complete control of your personal style, powered by advanced artificial intelligence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4"
          >
           
          </motion.div>
        </section>

        {/* Dashboard Mockup Section */}
        <section className="max-w-6xl mx-auto px-6 w-full -mt-10 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="rounded-[2.5rem] p-4 glass dark:glass-dark shadow-2xl border border-white/20"
          >
            <div className="aspect-[16/9] w-full rounded-[2rem] bg-gradient-to-br from-foreground/5 to-foreground/10 flex items-center justify-center relative overflow-hidden">
              {/* Decorative Dashboard Elements Mockup */}
              <div className="absolute top-8 left-8 right-8 flex gap-6">
                <div className="w-64 h-full hidden md:flex flex-col gap-4">
                  <div className="h-10 w-full rounded-lg bg-foreground/5" />
                  <div className="h-10 w-full rounded-lg bg-foreground/5" />
                  <div className="h-10 w-full rounded-lg bg-foreground/5" />
                  <div className="h-32 w-full rounded-xl bg-accent/10 border border-accent/20 mt-auto" />
                </div>
                <div className="flex-1 flex flex-col gap-6">
                  <div className="flex gap-4">
                    <div className="h-32 flex-1 rounded-2xl bg-foreground/5" />
                    <div className="h-32 flex-1 rounded-2xl bg-foreground/5" />
                    <div className="h-32 flex-1 rounded-2xl bg-foreground/5" />
                  </div>
                  <div className="h-64 w-full rounded-2xl bg-foreground/5" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-50" />
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Intelligent by Design</h2>
            <p className="text-foreground/70 max-w-2xl mx-auto">Everything you need to elevate your style, seamlessly integrated into one premium platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group p-8 rounded-3xl glass dark:glass-dark hover:bg-white/60 transition-all cursor-default"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-foreground/70 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials */}

      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 dark:border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl font-bold">Dollaby</div>
          <div className="flex gap-8 text-foreground/60 text-sm">
          
          </div>
          <div className="text-sm text-foreground/40">
            © {new Date().getFullYear()} Dollaby developed by @Kareem Taha
          </div>
        </div>
      </footer>
    </div>
  );
}
