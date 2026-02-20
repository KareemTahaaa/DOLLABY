"use client";

import { motion } from "framer-motion";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";

type Message = {
    id: number;
    type: "ai" | "user";
    content: string;
};

const suggestionChips = [
    "Suggest an outfit for a winter dinner",
    "What should I wear to a formal event?",
    "Help me pack for a 3-day beach trip",
];

export default function AssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, type: "ai", content: "Hi Sarah! I'm your AI stylist. What occasion are we dressing for today?" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = (text: string) => {
        if (!text.trim()) return;

        const newUserMsg: Message = { id: Date.now(), type: "user", content: text };
        setMessages(prev => [...prev, newUserMsg]);
        setInput("");
        setIsTyping(true);

        // Mock AI response
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: "ai",
                content: "Based on your wardrobe, I recommend combining your Navy Tailored Suit with the White Silk Blouse. It creates a powerful, elegant silhouette perfect for formal events. Should I save this to your outfits?"
            }]);
        }, 2000);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                        AI Fashion Assistant <Sparkles className="w-5 h-5 text-accent" />
                    </h1>
                    <p className="text-foreground/60">Your personal stylist, available 24/7.</p>
                </div>
            </div>

            <div className="flex-1 glass rounded-3xl border border-black/5 dark:border-white/5 flex flex-col overflow-hidden relative shadow-lg">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none" />

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    {messages.map((msg) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id}
                            className={`flex gap-4 ${msg.type === "user" ? "flex-row-reverse" : ""}`}
                        >
                            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center shadow-sm ${msg.type === "ai" ? "bg-accent/10 border border-accent/20 text-accent" : "bg-primary text-primary-foreground"}`}>
                                {msg.type === "ai" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>
                            <div className={`max-w-[75%] md:max-w-[60%] p-4 rounded-2xl ${msg.type === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-tl-none text-foreground/80 leading-relaxed shadow-sm"}`}>
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-4"
                        >
                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shadow-sm">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div className="bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-12">
                                <div className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white/40 dark:bg-black/20 backdrop-blur-md border-t border-black/5 dark:border-white/5">
                    {/* Suggestion Chips */}
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                        {suggestionChips.map((chip, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(chip)}
                                className="whitespace-nowrap px-4 py-2 rounded-full bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 text-xs font-medium text-foreground/70 hover:text-accent hover:border-accent/30 transition-colors shadow-sm"
                            >
                                {chip}
                            </button>
                        ))}
                    </div>

                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                        className="flex items-center gap-3"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask your AI stylist..."
                            className="flex-1 bg-white/60 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-full py-4 px-6 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm placeholder:text-foreground/40"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="bg-primary text-primary-foreground w-14 h-14 rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
