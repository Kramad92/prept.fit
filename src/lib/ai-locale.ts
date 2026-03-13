// Centralized AI language instructions per locale
// Used by all AI prompt routes to ensure correct language output

export type AILocale = "bs" | "sr" | "hr" | "en";

const LANGUAGE_INSTRUCTIONS: Record<AILocale, string> = {
  bs: `IMPORTANT: ALL text output MUST be in Bosnian (bosanski jezik).
Use ijekavian pronunciation (mlijeko, dijete, lijep, bijel).
Use standard Bosnian vocabulary and spelling:
- sedmica (NOT nedelja, NOT tjedan), historija (NOT istorija, NOT povijest)
- hljeb, kahva, lahko, mlijeko, srijeda, nedjelja
- vježba, mjerenje, bilješke, obavještenja, prehrambeni
- Use "je/ije" forms: mjerenje, osjećaj, vrijeme, smještaj, potrebno je
- Do NOT use Serbian ekavian forms (merenje, beleške, vreme, sreda)
- Do NOT use Croatian-only vocabulary (tjedan, povijest, spremiti, kruh, kava)`,

  sr: `IMPORTANT: ALL text output MUST be in Serbian (srpski jezik) using Latin script.
Use ekavian pronunciation (mleko, dete, lep, beo).
Use standard Serbian vocabulary and spelling:
- nedelja (NOT sedmica, NOT tjedan), istorija (NOT historija, NOT povijest)
- hleb, kafa, lako, mleko, sreda, nedelja
- vežba, merenje, beleške, obaveštenja, prehrambeni
- Use "e" forms: merenje, osećaj, vreme, smeštaj, potrebno je
- Do NOT use Bosnian/Croatian ijekavian forms (mjerenje, bilješke, vrijeme, srijeda)
- Do NOT use Croatian-only vocabulary (tjedan, povijest, spremiti, kruh)`,

  hr: `IMPORTANT: ALL text output MUST be in Croatian (hrvatski jezik).
Use ijekavian pronunciation (mlijeko, dijete, lijep, bijel).
Use standard Croatian vocabulary and spelling:
- tjedan (NOT sedmica, NOT nedelja), povijest (NOT historija, NOT istorija)
- kruh, kava, lako, mlijeko, srijeda, nedjelja
- vježba, mjerenje, bilješke, obavijesti, prehrambeni
- Use "je/ije" forms: mjerenje, osjećaj, vrijeme, smještaj, potrebno je
- Prefer Croatian standard terms: spremiti (save), računalo (computer), zrakoplov (airplane)
- Do NOT use Serbian ekavian forms (merenje, beleške, vreme, sreda)
- Do NOT use Bosnian-specific vocabulary (lahko, kahva, hljeb, sedmica)`,

  en: `ALL text output must be in English.`,
};

export function getAILanguageInstruction(locale: string): string {
  return LANGUAGE_INSTRUCTIONS[locale as AILocale] || LANGUAGE_INSTRUCTIONS.en;
}

/** Exercise-name format instruction per locale (for workout generation) */
export function getAIExerciseNameInstruction(locale: string): string {
  switch (locale) {
    case "sr":
      return 'Exercise names MUST be in Serbian (ekavian) with the English name in parentheses. Format: "Serbian Name (English Name)". Example: "Potisak sa klupe (Bench Press)", "Čučanj (Squat)", "Mrtvo dizanje (Deadlift)". Workout name, description, and notes must also be in Serbian.';
    case "hr":
      return 'Exercise names MUST be in Croatian with the English name in parentheses. Format: "Croatian Name (English Name)". Example: "Potisak s klupe (Bench Press)", "Čučanj (Squat)", "Mrtvo dizanje (Deadlift)". Workout name, description, and notes must also be in Croatian.';
    case "en":
      return "ALL text output must be in English.";
    case "bs":
      return 'Exercise names MUST be in Bosnian with the English name in parentheses. Format: "Bosnian Name (English Name)". Example: "Potisak s klupe (Bench Press)", "Čučanj (Squat)", "Mrtvo dizanje (Deadlift)". Workout name, description, and notes must also be in Bosnian.';
    default:
      return "ALL text output must be in English.";
  }
}
