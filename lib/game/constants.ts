import type {
  Difficulty,
  OutpostSystem,
  Planet,
  ResourceKey,
  Resources,
  SystemPlan,
} from "./types";

/** A short, complete mission: ten days, one decision per day. */
export const MISSION_LENGTH = 10;

export const DEFAULT_BASE_NAME = "Nova Base";

/** Starting meters by difficulty. Normal matches the design document. */
export const DIFFICULTY_START: Record<Difficulty, Resources> = {
  easy: { lifeSupport: 85, power: 80, protection: 92 },
  normal: { lifeSupport: 80, power: 65, protection: 90 },
  expert: { lifeSupport: 72, power: 55, protection: 82 },
};

/**
 * What one day costs before any choice or system is counted.
 * Power is handled separately because the solar array refills it.
 */
export const DAILY_BASE_DRAIN: Partial<Resources> = {
  lifeSupport: -10,
  protection: -5,
};

/** Solar array output on a clear day, in power points. */
export const POWER_GENERATION = 6;

/** Mars dust days and the long lunar night change the daily math. */
export const isDustyDay = (planet: Planet, day: number) =>
  planet === "mars" && day % 4 === 0;

export const MOON_NIGHT_START_DAY = 6;
export const isMoonNight = (planet: Planet, day: number) =>
  planet === "moon" && day >= MOON_NIGHT_START_DAY;

export const PLANET_DAILY_MODS: Record<Planet, Partial<Resources>> = {
  moon: { lifeSupport: -1 },
  mars: { power: -1 },
};

/**
 * Real one-way light-time from each world. These are the numbers NASA uses
 * when it plans a conversation with a crew: radio travels at the speed of
 * light, so distance becomes delay.
 */
export const EARTH_LINK: Record<
  Planet,
  {
    label: string;
    oneWay: string;
    roundTrip: string;
    slow: boolean;
    note: string;
  }
> = {
  moon: {
    label: "1.3 s",
    oneWay: "1.3 seconds",
    roundTrip: "2.6 seconds",
    slow: false,
    note: "Earth is close enough to answer almost in real time. Mission control can still talk the crew through a repair.",
  },
  mars: {
    label: "3–22 min",
    oneWay: "3 to 22 minutes",
    roundTrip: "6 to 44 minutes",
    slow: true,
    note: "Every reply arrives after the problem has already moved on. Mars crews must decide first and hear back later.",
  },
};

/**
 * One comms day per mission, so the light-time delay is actually played
 * with (not just mentioned). Mars gets the long delay, the Moon the short one.
 */
export const commsDay = (planet: Planet) => (planet === "mars" ? 3 : 7);
export const commsEventId = (planet: Planet) =>
  planet === "mars" ? "comms-delay" : "moon-teleop";

export const RESOURCE_META: Record<
  ResourceKey,
  { label: string; short: string; color: string; help: string }
> = {
  lifeSupport: {
    label: "Life Support",
    short: "Air, water and food for the crew",
    color: "#36D6F5",
    help: "Air, water and food for the crew. If this reaches 0, the crew cannot live at the base.",
  },
  power: {
    label: "Power",
    short: "Electricity in the batteries",
    color: "#F5C542",
    help: "Electricity stored in the batteries. Every machine you keep running uses some.",
  },
  protection: {
    label: "Protection",
    short: "Walls and shields against radiation",
    color: "#A78BFA",
    help: "How well the walls and shelter block space radiation. Low protection is dangerous during a solar storm.",
  },
};

export const RESOURCE_ORDER: ResourceKey[] = [
  "lifeSupport",
  "power",
  "protection",
];

/** The four machines the captain can switch on or off in stage 4. */
export const OUTPOST_SYSTEMS: OutpostSystem[] = [
  {
    id: "oxygen",
    name: "Oxygen System",
    summary: "Moves air through the base. The crew must breathe.",
    powerCost: 4,
    essential: true,
    effects: { lifeSupport: 6 },
    offEffects: { lifeSupport: -10 },
    icon: "wind",
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    summary: "Grows food and helps clean the air.",
    powerCost: 2,
    essential: false,
    effects: { lifeSupport: 2 },
    offEffects: { lifeSupport: -2 },
    icon: "leaf",
  },
  {
    id: "lab",
    name: "Research Lab",
    summary: "Tests new materials that make the walls safer.",
    powerCost: 3,
    essential: false,
    effects: { protection: 4 },
    offEffects: { protection: -1 },
    icon: "flask",
  },
  {
    id: "lights",
    name: "Extra Lights",
    summary: "Keeps the crew's day bright and cheerful.",
    powerCost: 1,
    essential: false,
    effects: { lifeSupport: 1 },
    offEffects: { lifeSupport: -1 },
    icon: "bulb",
  },
];

export const SYSTEM_BY_ID = Object.fromEntries(
  OUTPOST_SYSTEMS.map((system) => [system.id, system]),
) as Record<OutpostSystem["id"], OutpostSystem>;

export const DEFAULT_SYSTEMS: SystemPlan = {
  oxygen: true,
  greenhouse: true,
  lab: true,
  lights: true,
};

export const NOVA_TIPS = [
  "Every choice spends something. Ask: what am I trading?",
  "Check your weakest meter before you pick a plan.",
  "Keeping everything running feels safe, but the batteries notice.",
  "Protection does not refill by itself. The lab or a good choice can help.",
  "A calm day is a gift. Use it to repair and recharge.",
  "There is no perfect choice. There is a thoughtful one.",
];
