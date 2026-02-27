"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apiChat } from "@/lib/api";

type Message = {
    id: number;
    type: "ai" | "user";
    content: string;
};

const suggestionChips = [
    "Suggest an outfit for a winter dinner",
    "What should I wear to a formal event?",
    "Help me pack for a 3-day beach trip",
    "What colors work well with navy?",
    "Outfit ideas for a casual Friday",
];

export default function AssistantPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedName = localStorage.getItem("dollaby_userName") || "User";
        setMessages([
            {
                id: 1,
                type: "ai",
                content: `Hi ${storedName}! ✨ I'm Dollaby, your personal AI stylist. I have access to your wardrobe and can give you personalized advice. What occasion are we dressing for today?`
            }
        ]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim() || isTyping) return;

        const userMsg: Message = { id: Date.now(), type: "user", content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);
        setError("");

        // Build history from current messages (excluding the first AI greeting)
        const history = messages.slice(1).map(m => ({ role: m.type === "ai" ? "assistant" : "user", content: m.content }));

        // Add a placeholder AI message that we'll stream into
        const aiMsgId = Date.now() + 1;
        setMessages(prev => [...prev, { id: aiMsgId, type: "ai", content: "" }]);

        try {
            const reader = await apiChat(text, history);
            if (!reader) throw new Error("No response from assistant");

            const decoder = new TextDecoder();
            let done = false;
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value);
                    setMessages(prev =>
                        prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + chunk } : m)
                    );
                }
            }
        } catch (err: any) {
            setError("Could not reach the AI assistant. Make sure the backend is running.");
            setMessages(prev => prev.filter(m => m.id !== aiMsgId));
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                        AI Fashion Assistant <Sparkles className="w-5 h-5 text-accent" />
                    </h1>
                    <p className="text-foreground/60">Your personal stylist — powered by real AI, knows your wardrobe.</p>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
            )}

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
                            <div className={`max-w-[75%] md:max-w-[60%] p-4 rounded-2xl whitespace-pre-wrap ${msg.type === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-tl-none text-foreground/85 leading-relaxed shadow-sm"}`}>
                                {msg.content || (msg.type === "ai" && isTyping ? (
                                    <div className="flex items-center gap-1.5 py-1">
                                        <div className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                ) : "")}
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && messages[messages.length - 1]?.content === "" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shadow-sm">
                                <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white/40 dark:bg-black/20 backdrop-blur-md border-t border-black/5 dark:border-white/5">
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
                            placeholder="Ask your AI stylist anything..."
                            className="flex-1 bg-white/60 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-full py-4 px-6 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all shadow-sm placeholder:text-foreground/40"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isTyping}
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
