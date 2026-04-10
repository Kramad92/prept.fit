// AI provider abstraction layer
// Supports: Gemini (paid, default), Groq (fallback), OpenRouter (free+paid), Claude (paid). Set AI_PROVIDER env var.

export interface AIMessage {
  role: "system" | "user";
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  /** Expected to return JSON — instructs the model to output valid JSON */
  json?: boolean;
  /** Max tokens to generate (default: 2048) */
  maxTokens?: number;
  /** Temperature (default: 0.3 for deterministic nutrition/workout data) */
  temperature?: number;
}

export interface AIUsage {
  tokensIn: number;
  tokensOut: number;
  provider: string;
  /** Tokens served from prompt cache (implicit or explicit). Gemini only for now. */
  cachedTokens?: number;
}

export interface AIResult {
  text: string;
  usage: AIUsage;
}

export interface AIProvider {
  complete(options: AICompletionOptions): Promise<AIResult>;
}

// --- Groq Provider (free, fast — uses Llama 3.3 70B) ---

function createGroqProvider(apiKey: string): AIProvider {
  return {
    async complete({ messages, json, maxTokens = 2048, temperature = 0.3 }) {
      const model = process.env.AI_GROQ_MODEL || "llama-3.3-70b-versatile";

      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      };

      if (json) {
        body.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API error (${res.status}): ${err}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response from Groq");
      return {
        text,
        usage: {
          tokensIn: data?.usage?.prompt_tokens || 0,
          tokensOut: data?.usage?.completion_tokens || 0,
          provider: "groq",
        },
      };
    },
  };
}

// --- Gemini Provider ---

function createGeminiProvider(apiKey: string): AIProvider {
  const BASE = "https://generativelanguage.googleapis.com/v1beta";

  return {
    async complete({ messages, json, maxTokens = 2048, temperature = 0.3 }) {
      const systemMsg = messages.find((m) => m.role === "system");
      const userMsgs = messages.filter((m) => m.role === "user");

      const body: Record<string, unknown> = {
        contents: userMsgs.map((m) => ({
          role: "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      };

      if (systemMsg) {
        body.systemInstruction = {
          parts: [{ text: systemMsg.content }],
        };
      }

      const model = process.env.AI_GEMINI_MODEL || "gemini-2.5-flash-lite";
      const res = await fetch(
        `${BASE}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey,
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${err}`);
      }

      const data = await res.json();
      // Gemini may return multiple parts (thought + text). Find the text part without thoughtSignature.
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p: Record<string, unknown>) => p.text && !p.thoughtSignature)
        || parts.find((p: Record<string, unknown>) => p.text);
      const text = textPart?.text;
      if (!text) throw new Error("Empty response from Gemini");
      const cachedTokens = data?.usageMetadata?.cachedContentTokenCount || 0;
      const promptTokens = data?.usageMetadata?.promptTokenCount || 0;
      if (cachedTokens > 0) {
        const pct = Math.round((cachedTokens / promptTokens) * 100);
        console.log(`Gemini cache hit: ${cachedTokens}/${promptTokens} tokens cached (${pct}%)`);
      }
      return {
        text,
        usage: {
          tokensIn: promptTokens,
          tokensOut: data?.usageMetadata?.candidatesTokenCount || 0,
          provider: "gemini",
          cachedTokens,
        },
      };
    },
  };
}

// --- OpenRouter Provider (OpenAI-compatible, many models) ---

function createOpenRouterProvider(apiKey: string): AIProvider {
  return {
    async complete({ messages, json, maxTokens = 2048, temperature = 0.3 }) {
      const model = process.env.AI_OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        temperature,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      };

      if (json) {
        body.response_format = { type: "json_object" };
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter API error (${res.status}): ${err}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response from OpenRouter");
      return {
        text,
        usage: {
          tokensIn: data?.usage?.prompt_tokens || 0,
          tokensOut: data?.usage?.completion_tokens || 0,
          provider: "openrouter",
        },
      };
    },
  };
}

// --- Claude Provider ---

function createClaudeProvider(apiKey: string): AIProvider {
  return {
    async complete({ messages, json, maxTokens = 2048, temperature = 0.3 }) {
      const systemMsg = messages.find((m) => m.role === "system");
      const userMsgs = messages.filter((m) => m.role === "user");

      const systemContent = json && systemMsg
        ? systemMsg.content + "\n\nYou MUST respond with valid JSON only, no other text."
        : systemMsg?.content;

      const body: Record<string, unknown> = {
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        temperature,
        messages: userMsgs.map((m) => ({ role: "user", content: m.content })),
      };

      if (systemContent) {
        body.system = systemContent;
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude API error (${res.status}): ${err}`);
      }

      const data = await res.json();
      const text = data?.content?.[0]?.text;
      if (!text) throw new Error("Empty response from Claude");
      return {
        text,
        usage: {
          tokensIn: data?.usage?.input_tokens || 0,
          tokensOut: data?.usage?.output_tokens || 0,
          provider: "claude",
        },
      };
    },
  };
}

// --- Provider factory ---

function createProvider(name: string, apiKey: string): AIProvider | null {
  if (!apiKey) return null;
  switch (name) {
    case "gemini": return createGeminiProvider(apiKey);
    case "claude": return createClaudeProvider(apiKey);
    case "groq": return createGroqProvider(apiKey);
    case "openrouter": return createOpenRouterProvider(apiKey);
    default: return null;
  }
}

/** Extract retry-after delay (in ms) from a 429 error message */
function extractRetryAfterMs(msg: string): number | null {
  // "Please try again in 4.465s" (Groq)
  const secMatch = msg.match(/(?:retry|try again) in ([\d.]+)s/i);
  if (secMatch) return Math.ceil(parseFloat(secMatch[1]) * 1000);
  // "Please retry in 30.377443282s" (Gemini)
  const retryMatch = msg.match(/retry in ([\d.]+)s/i);
  if (retryMatch) return Math.ceil(parseFloat(retryMatch[1]) * 1000);
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface NamedProvider {
  name: string;
  provider: AIProvider;
}

/** Build a provider with automatic fallback and sticky rotation.
 *  Remembers which provider last succeeded and starts there on the next call.
 *  On 429 (rate-limit), immediately advances to the next provider instead of
 *  retrying the exhausted one. Only retries with backoff as a last resort
 *  when all providers are rate-limited. */
function createFallbackProvider(named: NamedProvider[]): AIProvider {
  let startIndex = 0;

  return {
    async complete(options) {
      let lastError: Error | null = null;
      let shortest429Wait: number | null = null;
      const tried: string[] = [];

      // Try each provider once, starting from the last one that worked
      for (let attempt = 0; attempt < named.length; attempt++) {
        const idx = (startIndex + attempt) % named.length;
        const { name, provider } = named[idx];
        tried.push(name);
        try {
          const result = await provider.complete(options);
          startIndex = idx; // sticky — start here next time
          if (tried.length > 1) {
            console.log(`AI fallback chain: ${tried.join(" → ")} (${name} succeeded)`);
          }
          return result;
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          console.warn(`AI provider [${name}] failed: ${lastError.message}`);

          if (lastError.message.includes("429")) {
            // Advance past this provider for future calls
            startIndex = (idx + 1) % named.length;
            const waitMs = extractRetryAfterMs(lastError.message);
            if (waitMs && (shortest429Wait === null || waitMs < shortest429Wait)) {
              shortest429Wait = waitMs;
            }
          }
        }
      }

      // All providers failed — if any were 429, wait for the shortest and retry once
      if (shortest429Wait !== null) {
        const waitMs = Math.min(shortest429Wait + 1000, 15000);
        const retryName = named[startIndex].name;
        console.log(`All providers exhausted (${tried.join(", ")}) — waiting ${waitMs}ms, retrying ${retryName}…`);
        await delay(waitMs);
        try {
          return await named[startIndex].provider.complete(options);
        } catch (retryErr) {
          lastError = retryErr instanceof Error ? retryErr : new Error(String(retryErr));
        }
      }

      throw lastError || new Error("All AI providers failed");
    },
  };
}

let _provider: AIProvider | null = null;

export function getAI(): AIProvider {
  if (_provider) return _provider;

  const primaryName = (process.env.AI_PROVIDER || "groq").trim();
  const primaryKey = (process.env.AI_API_KEY || "").trim();
  const fallbackName = (process.env.AI_FALLBACK_PROVIDER || "").trim();
  const fallbackKey = (process.env.AI_FALLBACK_API_KEY || "").trim();
  const fallback2Name = (process.env.AI_FALLBACK2_PROVIDER || "").trim();
  const fallback2Key = (process.env.AI_FALLBACK2_API_KEY || "").trim();

  const named: NamedProvider[] = [];

  const primary = createProvider(primaryName, primaryKey);
  if (primary) named.push({ name: primaryName, provider: primary });

  if (fallbackName && fallbackKey) {
    const fallback = createProvider(fallbackName, fallbackKey);
    if (fallback) named.push({ name: fallbackName, provider: fallback });
  }

  if (fallback2Name && fallback2Key) {
    const fallback2 = createProvider(fallback2Name, fallback2Key);
    if (fallback2) named.push({ name: fallback2Name, provider: fallback2 });
  }

  console.log(`AI providers initialized: ${named.length} (primary=${primaryName}, fb1=${fallbackName || "none"}, fb2=${fallback2Name || "none"})`);

  if (named.length === 0) {
    throw new Error("AI_API_KEY environment variable is not set");
  }

  _provider = named.length === 1 ? named[0].provider : createFallbackProvider(named);
  return _provider;
}

// --- Helper for structured JSON responses ---

export interface AIJSONResult<T> {
  data: T;
  usage: AIUsage;
}

export async function aiJSON<T>(options: Omit<AICompletionOptions, "json">): Promise<AIJSONResult<T>> {
  const ai = getAI();
  const { text: raw, usage } = await ai.complete({ ...options, json: true });

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  try {
    return { data: JSON.parse(cleaned) as T, usage };
  } catch {
    throw new Error(`Failed to parse AI JSON response: ${cleaned.slice(0, 200)}`);
  }
}
