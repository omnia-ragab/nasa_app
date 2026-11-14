"use client";

import { Sparkles } from "lucide-react";
import { useGameStore } from "@/lib/game/store";

export function NovaButton({
  iconOnly = true,
  className = "",
}: {
  iconOnly?: boolean;
  className?: string;
}) {
  const askNova = useGameStore((s) => s.askNova);
  const open = useGameStore((s) => s.showNovaChat);

  return (
    <button
      type="button"
      aria-label="Ask Nova, your AI mission assistant"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => askNova()}
      className={
        iconOnly
          ? `relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-cyan-300/60 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/20 ${className}`
          : `relative inline-flex items-center gap-2 rounded-full border-2 border-cyan-300/60 bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-400/20 ${className}`
      }
    >
      <Sparkles className="h-4 w-4" aria-hidden />
      {!iconOnly && <span>Ask Nova</span>}
      <span
        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#081a2e]"
        aria-hidden
      />
    </button>
  );
}
