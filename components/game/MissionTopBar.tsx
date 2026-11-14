"use client";

import Image from "next/image";
import { Radio } from "lucide-react";
import { EARTH_LINK } from "@/lib/game/constants";
import { dayLabel } from "@/lib/game/engine";
import { useGameStore } from "@/lib/game/store";
import { ComicBookButton } from "./ComicBookButton";
import { MeterBar } from "./MeterBar";
import { NovaButton } from "./NovaButton";

export function MissionTopBar({ showMeters = true }: { showMeters?: boolean }) {
  const baseName = useGameStore((s) => s.baseName);
  const planet = useGameStore((s) => s.planet);
  const day = useGameStore((s) => s.day);
  const missionLength = useGameStore((s) => s.missionLength);
  const link = EARTH_LINK[planet ?? "moon"];

  return (
    <header className="rounded-[24px] border border-white/10 bg-[#081a2e]/95 px-3 py-3 shadow-[0_10px_35px_rgba(1,7,18,0.55)] backdrop-blur-sm sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image src="/images/logo.png" alt="Solbound" width={677} height={369} className="h-9 w-auto sm:h-10" />
          <div className="hidden h-8 w-px bg-white/10 sm:block" />
          <div className="hidden sm:block">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
              {planet === "mars" ? "Mars Outpost" : "Lunar Outpost"}
            </p>
            <p className="text-sm font-black leading-tight">{baseName}</p>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-400/5 px-2.5 py-1.5"
          title={`Earth signal delay: ${link.oneWay} each way, ${link.roundTrip} round trip`}
        >
          <Radio className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
          <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/50">
            Earth
          </span>
          <span className="text-[11px] font-black text-cyan-200" aria-label="Earth signal delay">
            {link.label}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0B1B33]/70 px-3 py-1.5">
          <span className="text-[9px] font-black uppercase tracking-[0.16em] text-white/50">
            {dayLabel(planet, day)}
          </span>
          <span className="text-[11px] font-black text-cyan-200">
            {day}
            <span className="px-0.5 text-white/30">/</span>
            {missionLength}
          </span>
          <div className="ml-1 flex items-center gap-1" aria-hidden>
            {Array.from({ length: missionLength }).map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index < day ? "bg-cyan-300" : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NovaButton />
          <ComicBookButton iconOnly />
        </div>
      </div>

      {showMeters && (
        <div className="mt-3">
          <MeterBar compact />
        </div>
      )}
    </header>
  );
}
