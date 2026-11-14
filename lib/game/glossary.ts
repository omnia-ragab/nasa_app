import nasaData from "@/data/nasa_archived_data.json";

const NASA_GLOSSARY: Record<string, string> = Object.fromEntries(
  nasaData.glossarySeed.map((item) => [item.term.toLowerCase(), item.definition]),
);

/**
 * Light-time delay is the reason a Mars crew cannot ask Earth for help in the
 * middle of an emergency, and it is the constraint behind the comms events.
 */
export const GLOSSARY: Record<string, string> = {
  ...NASA_GLOSSARY,
  "light-time delay":
    "The time a radio signal needs to travel through space. It is about 1.3 seconds to the Moon and 3 to 22 minutes to Mars, one way.",
  "communication delay":
    "Because radio travels at the speed of light and space is huge, a question to Earth and its answer take time. A Mars crew waits minutes; a Moon crew waits seconds.",
};

export function getGlossaryDefinition(term: string): string | undefined {
  return GLOSSARY[term.toLowerCase()];
}
