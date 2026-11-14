"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, BookOpen, Sparkles, Square, Trash2, WifiOff, X } from "lucide-react";
import {
  buildNovaContext,
  novaFallbackAnswer,
  NOVA_DATA_SOURCES,
  suggestionsFor,
} from "@/lib/game/novaContext";
import { playSound, startTyping, stopTyping } from "@/lib/game/sound";
import { useGameStore } from "@/lib/game/store";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function greetingFor(): string {
  const game = useGameStore.getState();
  const name = game.playerName.trim() || "Captain";

  if (!game.planet || game.screen === "briefing" || game.screen === "setup") {
    return `Hi ${name}! I'm Nova, your AI mission companion.\n\nI can explain the science behind the mission and help you weigh a choice. Every choice costs something, so ask me what you are trading.\n\nYou can ask me in English or Arabic.`;
  }

  const before = buildNovaContext(game);
  const weakest = before.weakest;
  const note = weakest
    ? `Your weakest meter is ${weakest.label} at ${weakest.value}%.`
    : "Your meters look healthy.";

  return `Hi ${name}! I'm Nova, your AI mission companion.\n\nDay ${game.day} of ${game.missionLength} at ${game.baseName}. ${note}\n\nAsk me about a meter, a machine, or the decision on your screen. English or Arabic is fine.`;
}

export function NovaChat() {
  const open = useGameStore((s) => s.showNovaChat);
  const toggleNovaChat = useGameStore((s) => s.toggleNovaChat);
  const novaPrompt = useGameStore((s) => s.novaPrompt);
  const clearNovaPrompt = useGameStore((s) => s.clearNovaPrompt);
  const toggleScienceLibrary = useGameStore((s) => s.toggleScienceLibrary);
  const reduced = useGameStore((s) => s.accessibility.reducedMotion);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const screen = useGameStore((s) => s.screen);

  const messagesRef = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendRef = useRef<(text?: string) => void>(() => undefined);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* Keep the newest message visible while the answer streams in. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* Escape closes the panel and the page stops scrolling behind it. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") toggleNovaChat(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, toggleNovaChat]);

  /* First open: Nova says hello using the real state of the mission. */
  useEffect(() => {
    if (!open || greeted) return;
    setGreeted(true);
    setMessages([{ id: "greeting", role: "assistant", content: greetingFor() }]);
    playSound("notify");
    window.setTimeout(() => inputRef.current?.focus(), 260);
  }, [open, greeted]);

  const patchAssistant = useCallback((id: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, content } : message)),
    );
  }, []);

  const send = useCallback(
    async (raw?: string) => {
      const text = (raw ?? input).trim();
      if (!text || busy) return;

      const game = useGameStore.getState();
      const context = buildNovaContext(game);
      const history = messagesRef.current
        .filter((message) => message.content.trim().length > 0 && message.id !== "greeting")
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content }));

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", content: text },
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setBusy(true);
      setOffline(false);
      playSound("click");
      startTyping();

      const controller = new AbortController();
      abortRef.current = controller;
      let answer = "";

      try {
        const response = await fetch("/api/nova", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text, context, history }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) throw new Error("Nova is offline");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let lastPaint = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          const now = Date.now();
          if (now - lastPaint > 60) {
            patchAssistant(assistantId, answer);
            lastPaint = now;
          }
        }

        if (!answer.trim()) throw new Error("Nova is offline");
        patchAssistant(assistantId, answer.trim());
        playSound("notify");
      } catch {
        if (controller.signal.aborted) {
          patchAssistant(assistantId, answer.trim() || "Stopped. Ask me again whenever you like.");
        } else {
          setOffline(true);
          patchAssistant(assistantId, novaFallbackAnswer(text, context));
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
        stopTyping();
        window.setTimeout(() => inputRef.current?.focus(), 60);
      }
    },
    [busy, input, patchAssistant],
  );

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  /* Another screen asked Nova a question (for example a decision hint). */
  useEffect(() => {
    if (!open || !novaPrompt) return;
    const prompt = novaPrompt;
    clearNovaPrompt();
    void sendRef.current(prompt);
  }, [open, novaPrompt, clearNovaPrompt]);

  const stop = () => abortRef.current?.abort();

  const reset = () => {
    abortRef.current?.abort();
    stopTyping();
    setBusy(false);
    setOffline(false);
    setMessages([{ id: "greeting", role: "assistant", content: greetingFor() }]);
  };

  const suggestions = suggestionsFor(screen);
  const showSuggestions = !busy && messages.length <= 2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[68] flex items-end justify-end bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-4"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          onClick={() => toggleNovaChat(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Nova AI mission assistant"
            className="flex h-[88vh] w-full flex-col overflow-hidden rounded-t-[26px] border border-cyan-300/25 bg-[#081a2e] shadow-[0_20px_60px_rgba(0,0,0,0.6)] sm:h-[min(700px,92vh)] sm:w-[430px] sm:rounded-[26px]"
            initial={reduced ? false : { y: 40, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduced ? undefined : { y: 30, opacity: 0, scale: 0.99 }}
            transition={{ duration: reduced ? 0 : 0.22 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center gap-2.5 border-b border-white/10 bg-[#0B1B33] px-3 py-2.5">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/40 bg-cyan-400/10">
                <Image
                  src={busy ? "/images/nova-thinking.png" : "/images/nova-happy.png"}
                  alt=""
                  width={408}
                  height={612}
                  className="h-12 w-auto object-contain"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B1B33]" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-black leading-tight">
                  NOVA
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-cyan-200">
                    AI
                  </span>
                </p>
                <p className="truncate text-[10px] font-semibold text-white/45">
                  {busy ? "Thinking about your mission…" : "Mission companion · grounded in NASA data"}
                </p>
              </div>

              <button
                type="button"
                aria-label="Start a new conversation"
                onClick={reset}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Close Nova chat"
                onClick={() => toggleNovaChat(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
              aria-live="polite"
            >
              {messages.map((message) =>
                message.role === "assistant" ? (
                  <div key={message.id} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/30 bg-cyan-400/10">
                      <Image
                        src="/images/nova-happy.png"
                        alt=""
                        width={408}
                        height={612}
                        className="h-8 w-auto object-contain"
                      />
                    </span>
                    <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-white/10 bg-[#0B1B33] px-3 py-2 text-[13px] leading-relaxed text-white/90">
                      {message.content ? (
                        <p className="whitespace-pre-wrap">
                          {message.content.replace(/\*\*/g, "").replace(/[ \t]+$/gm, "")}
                        </p>
                      ) : (
                        <span className="flex items-center gap-1 py-1" aria-label="Nova is typing">
                          {[0, 1, 2].map((dot) => (
                            <motion.span
                              key={dot}
                              className="h-1.5 w-1.5 rounded-full bg-cyan-300"
                              animate={reduced ? undefined : { opacity: [0.25, 1, 0.25] }}
                              transition={{ duration: 1, repeat: Infinity, delay: dot * 0.18 }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-400 px-3 py-2 text-[13px] font-semibold leading-relaxed text-[#071426]"
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ),
              )}

              {offline && (
                <p className="flex items-center gap-1.5 rounded-xl border border-amber-300/20 bg-amber-400/5 px-2.5 py-1.5 text-[10px] font-semibold text-amber-100/80">
                  <WifiOff className="h-3 w-3 shrink-0" aria-hidden />
                  Local answer — Nova&apos;s cloud brain could not be reached, so this came from the
                  game&apos;s own data.
                </p>
              )}
            </div>

            {showSuggestions && (
              <div className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-2.5 py-2">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="shrink-0 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <form
              className="border-t border-white/10 bg-[#0B1B33] px-2.5 pb-2 pt-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  maxLength={600}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Ask Nova about space or your base…"
                  aria-label="Your question for Nova"
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/15 bg-[#071426] px-3 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:border-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                />

                {busy ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop Nova's answer"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10"
                  >
                    <Square className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    aria-label="Send question to Nova"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-[#071426] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-cyan-400/25 disabled:text-[#071426]/50"
                  >
                    <ArrowUp className="h-5 w-5" aria-hidden />
                  </button>
                )}
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-white/35">
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                  {NOVA_DATA_SOURCES}
                </span>
                <button
                  type="button"
                  onClick={() => toggleScienceLibrary(true)}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-cyan-300/80 underline-offset-2 hover:text-cyan-200 hover:underline"
                >
                  <BookOpen className="h-2.5 w-2.5" aria-hidden />
                  Science Library
                </button>
              </div>
              <p className="px-1 pt-0.5 text-[9px] leading-snug text-white/25">
                AI can make mistakes. Nova keeps answers short, but always check the Science Library.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
