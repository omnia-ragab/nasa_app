"use client";

import { Radio, Timer } from "lucide-react";
import { EARTH_LINK } from "@/lib/game/constants";
import { useGameStore } from "@/lib/game/store";

/**
 * Earth is never in the room. This card keeps the real light-time delay on
 * screen and shows what it does to a conversation: a Mars crew reads advice
 * about a problem that is already over, while a Moon crew can still be talked
 * through a repair almost live.
 */
export function EarthMail() {
  const planet = useGameStore((s) => s.planet) ?? "moon";
  const decisions = useGameStore((s) => s.decisions);
  const link = EARTH_LINK[planet];
  const last = decisions[decisions.length - 1];

  return (
    <section className="rounded-[26px] border border-cyan-300/25 bg-[#0B1B33]/90 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-cyan-300" aria-hidden />
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Earth mail
          </p>
        </div>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">
          {link.label} each way
        </span>
      </div>

      <p className="mt-2 text-xs font-semibold leading-relaxed text-white/75">{link.note}</p>

      {last && (
        <p className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-2.5 text-[11px] font-semibold leading-relaxed text-white/60">
          {link.slow
            ? `Earth is only now reading about “${last.eventTitle}”. You already chose “${last.choiceLabel}” before the reply could arrive.`
            : `Earth watched “${last.eventTitle}” almost live — only ${link.roundTrip} after it happened.`}
        </p>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-white/40">
        <Timer className="h-3 w-3" aria-hidden />
        Real light-time: {link.oneWay} from {planet === "mars" ? "Mars" : "the Moon"}.
      </p>
    </section>
  );
}
