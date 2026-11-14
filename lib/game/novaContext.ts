import {
  DAILY_BASE_DRAIN,
  EARTH_LINK,
  isDustyDay,
  isMoonNight,
  OUTPOST_SYSTEMS,
  PLANET_DAILY_MODS,
  POWER_GENERATION,
  RESOURCE_META,
  RESOURCE_ORDER,
} from "./constants";
import type { GameSnapshot, ResourceKey } from "./types";

/**
 * The compact, kid-safe description of the current game that NOVA receives.
 * Keeping it small matters: it is sent on every question and it must never
 * contain anything personal beyond the captain's chosen name.
 */
export interface NovaGameContext {
  captain: string;
  base: string;
  planet: "Moon" | "Mars" | null;
  difficulty: string;
  day: number;
  missionLength: number;
  screen: string;
  meters: Record<ResourceKey, number>;
  weakest: { key: ResourceKey; label: string; value: number } | null;
  systems: { name: string; on: boolean; powerCost: number }[];
  event: {
    title: string;
    kind: string;
    story: string;
    realFact?: string;
    choices: {
      label: string;
      upside: string;
      downside: string;
      effects: Partial<Record<ResourceKey, number>>;
    }[];
  } | null;
  lastResult: {
    title: string;
    choice: string;
    lesson: string;
    takeaway: string;
    before: Record<ResourceKey, number>;
    after: Record<ResourceKey, number>;
  } | null;
  recentDecisions: { day: number; event: string; choice: string; tags: string[] }[];
  spaceWeather: {
    source: string;
    mode: "live" | "archived";
    date: string;
    events: { kind: string; severity: string; time: string }[];
  } | null;
  /** The simple arithmetic of the game, so NOVA never invents numbers. */
  economy: {
    dailyDrain: Partial<Record<ResourceKey, number>>;
    solarGeneration: number;
    planetModifier: Partial<Record<ResourceKey, number>>;
    todayNotes: string[];
  };
  /** Real light-time delay to Earth, so NOVA can explain why advice is late. */
  comms: {
    oneWay: string;
    roundTrip: string;
    slow: boolean;
    note: string;
  };
}

const label = (key: ResourceKey) => RESOURCE_META[key].label;

export function weakestMeter(meters: Record<ResourceKey, number>) {
  return RESOURCE_ORDER.reduce<{ key: ResourceKey; label: string; value: number }>(
    (lowest, key) =>
      meters[key] < lowest.value
        ? { key, label: label(key), value: meters[key] }
        : lowest,
    { key: "lifeSupport", label: label("lifeSupport"), value: meters.lifeSupport },
  );
}

export function buildNovaContext(game: GameSnapshot): NovaGameContext {
  const planet =
    game.planet === "mars" ? ("Mars" as const) : game.planet === "moon" ? ("Moon" as const) : null;

  const todayNotes: string[] = [];
  if (game.planet === "mars" && isDustyDay("mars", game.day)) {
    todayNotes.push("Dust storm day: the solar panels make less power today.");
  }
  if (game.planet === "moon" && isMoonNight("moon", game.day)) {
    todayNotes.push("Lunar night: the solar panels make almost no power today.");
  }

  const event = game.activeEvent
    ? {
        title: game.activeEvent.title,
        kind: game.activeEvent.kind,
        story: game.activeEvent.story,
        realFact: game.activeEvent.realFact,
        choices: game.activeEvent.choices.map((choice) => ({
          label: choice.label,
          upside: choice.upside,
          downside: choice.downside,
          effects: choice.effects,
        })),
      }
    : null;

  const last = game.lastResult;

  return {
    captain: game.playerName.trim() || "Captain",
    base: game.baseName,
    planet,
    difficulty: game.difficulty,
    day: game.day,
    missionLength: game.missionLength,
    screen: game.screen,
    meters: {
      lifeSupport: Math.round(game.resources.lifeSupport),
      power: Math.round(game.resources.power),
      protection: Math.round(game.resources.protection),
    },
    weakest: weakestMeter(game.resources),
    systems: OUTPOST_SYSTEMS.map((system) => ({
      name: system.name,
      on: game.systems[system.id],
      powerCost: system.powerCost,
    })),
    event,
    lastResult: last
      ? {
          title: last.eventTitle,
          choice: last.choiceLabel,
          lesson: last.lesson,
          takeaway: last.takeaway,
          before: last.before,
          after: last.after,
        }
      : null,
    recentDecisions: game.decisions.slice(-3).map((record) => ({
      day: record.day,
      event: record.eventTitle,
      choice: record.choiceLabel,
      tags: record.tags,
    })),
    spaceWeather: game.spaceWeather
      ? {
          source: game.spaceWeather.source.name,
          mode: game.spaceWeather.source.mode,
          date: game.spaceWeather.source.date,
          events: game.spaceWeather.events.slice(0, 4).map((item) => ({
            kind: item.kind,
            severity: item.severity,
            time: item.time,
          })),
        }
      : null,
    economy: {
      dailyDrain: DAILY_BASE_DRAIN,
      solarGeneration: POWER_GENERATION,
      planetModifier: game.planet ? PLANET_DAILY_MODS[game.planet] : {},
      todayNotes,
    },
    comms: {
      oneWay: EARTH_LINK[game.planet ?? "moon"].oneWay,
      roundTrip: EARTH_LINK[game.planet ?? "moon"].roundTrip,
      slow: EARTH_LINK[game.planet ?? "moon"].slow,
      note: EARTH_LINK[game.planet ?? "moon"].note,
    },
  };
}

const metersLine = (meters: Record<ResourceKey, number>) =>
  RESOURCE_ORDER.map((key) => `${label(key)} ${Math.round(meters[key])}%`).join(" · ");

/**
 * A tiny offline brain. If the Groq call fails (no internet, missing key,
 * rate limit) the chat still answers with real game numbers and real glossary
 * content instead of showing a dead robot.
 */
export function novaFallbackAnswer(question: string, context: NovaGameContext): string {
  const q = question.toLowerCase();
  const has = (...words: string[]) => words.some((word) => q.includes(word));

  if (has("مرحبا", "أهلا", "اهلا", "hello", "hi ", "hey")) {
    return `Hi ${context.captain}! I am Nova. We are on day ${context.day} of ${context.missionLength} at ${context.base}. ${metersLine(context.meters)}. Ask me about a meter, a machine, or the choice in front of you.`;
  }

  if (has("radiation", "shield", "إشعاع", "اشعاع", "درع")) {
    return [
      "Protection is your shield against space radiation.",
      "Cosmic rays and solar storms can hurt a crew, so thick walls, water tanks and underground shelters block them.",
      `Right now Protection is ${context.meters.protection}%. If it is your lowest meter, choose a fix that adds protection today.`,
    ].join(" ");
  }

  if (has("power", "battery", "solar", "طاقة", "بطارية", "كهرباء")) {
    return [
      "Power is the electricity in your batteries. The solar panels add about",
      `${context.economy.solarGeneration} points on a clear day, and every machine you keep on spends some.`,
      `You have ${context.meters.power}% now. Switching off the lab or the extra lights saves power for life support.`,
    ].join(" ");
  }

  if (has("oxygen", "air", "water", "food", "life support", "أكسجين", "اكسجين", "هواء", "ماء", "طعام")) {
    return [
      "Life Support is air, water and food for the crew. It drops every day even if you do nothing.",
      `You have ${context.meters.lifeSupport}% now. The oxygen system protects it best, but it costs 4 power.`,
      "That is the trade-off: healthy air tonight, or battery for tomorrow.",
    ].join(" ");
  }

  if (has("choice", "choose", "safer", "decide", "أختار", "اختار", "قرار", "أفضل", "افضل")) {
    const event = context.event;
    if (!event) {
      return `There is no decision open right now. Check your weakest meter: ${context.weakest?.label ?? "Life Support"} at ${context.weakest?.value ?? context.meters.lifeSupport}%. Fix that one first.`;
    }
    return [
      `For "${event.title}" there is no free choice.`,
      "Read every downside first, then pick the one that protects your lowest meter:",
      `${context.weakest?.label ?? "Life Support"} at ${context.weakest?.value ?? 0}%.`,
      "If two choices look equal, take the one that also saves power.",
    ].join(" ");
  }

  if (has("mars", "مريخ")) {
    return "Mars has a thin atmosphere and no global magnetic field, so radiation is high and dust storms block the Sun for days. That is why power and protection are tight there.";
  }

  if (
    has(
      "delay",
      "signal",
      "communication",
      "comms",
      "earth reply",
      "تأخير",
      "تاخير",
      "اتصال",
      "إشارة",
      "اشارة",
    )
  ) {
    return [
      "Radio travels at the speed of light, but space is huge, so distance becomes delay.",
      context.comms.slow
        ? `From Mars the signal takes ${context.comms.oneWay} each way, so a reply takes ${context.comms.roundTrip}. Earth always answers after your problem has moved on.`
        : `From the Moon the signal takes only ${context.comms.oneWay} each way, so Earth can almost talk with you live.`,
      "That is why the crew has to decide first and hear back later.",
    ].join(" ");
  }

  if (has("moon", "قمر")) {
    return "The Moon has no air and no magnetic field. Days are boiling and nights are freezing, and one lunar night can last about 14 Earth days, so stored power matters a lot.";
  }

  if (has("machine", "system", "greenhouse", "lab", "lights", "جهاز", "أجهزة", "اجهزة", "صوبة")) {
    const on = context.systems.filter((system) => system.on).map((system) => system.name);
    return [
      `Machines running now: ${on.length ? on.join(", ") : "none"}.`,
      "Each one has a power cost: Oxygen 4, Lab 3, Greenhouse 2, Lights 1.",
      `With ${context.meters.power}% power, switch off the ones you do not need today.`,
    ].join(" ");
  }

  if (context.spaceWeather && has("sun", "solar", "storm", "flare", "شمس", "عاصفة")) {
    const count = context.spaceWeather.events.length;
    return [
      `NASA ${context.spaceWeather.source} data is ${context.spaceWeather.mode}, from ${context.spaceWeather.date}.`,
      count
        ? `It lists ${count} solar event${count === 1 ? "" : "s"} for this mission.`
        : "It lists no big solar events for these days.",
      "Big events raise radiation risk, so Protection becomes the meter to watch.",
    ].join(" ");
  }

  return [
    `I could not reach my space brain just now, but here is what I can see:`,
    `${metersLine(context.meters)}.`,
    `Your weakest meter is ${context.weakest?.label ?? "Life Support"} at ${context.weakest?.value ?? 0}%.`,
    "Every choice costs something, so protect that meter first. Try asking me again in a moment.",
  ].join(" ");
}

export const NOVA_SUGGESTIONS: Record<string, string[]> = {
  briefing: ["What is this mission about?", "What do the three meters mean?"],
  setup: ["What do I build first?", "Why does the Habitat come first?"],
  day: ["What should I check before I start?", "What does a solar storm do?"],
  event: ["Explain this event simply", "Which meter is at risk?"],
  decision: ["Which choice is safer?", "What is the trade-off here?"],
  execute: ["What do the machines cost?", "How can I save power?"],
  results: ["Why did my meters change?", "What should I do tomorrow?"],
  rescue: ["How do I recover from this?", "What went wrong?"],
  debrief: ["What did I learn?", "How could I do better?"],
};

export const DEFAULT_SUGGESTIONS = [
  "Why is radiation dangerous?",
  "How do I save power?",
  "What is a sol?",
];

export function suggestionsFor(screen: string): string[] {
  return NOVA_SUGGESTIONS[screen] ?? DEFAULT_SUGGESTIONS;
}

/** Exposed for the chat header so the UI can show which NASA sets are used. */
export const NOVA_DATA_SOURCES = "NASA DONKI · OSDR · RadLab";
