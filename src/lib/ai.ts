// AI provider abstraction layer
// Supports: Groq (free), Gemini (free), Claude (paid). Set AI_PROVIDER env var.

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

export interface AIProvider {
  complete(options: AICompletionOptions): Promise<string>;
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
      return text;
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

      const model = process.env.AI_GEMINI_MODEL || "gemini-2.0-flash";
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
      return text;
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
      return text;
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
    default: return null;
  }
}

/** Build a provider with automatic fallback. Primary tries first, falls back to others on error. */
function createFallbackProvider(providers: AIProvider[]): AIProvider {
  return {
    async complete(options) {
      let lastError: Error | null = null;
      for (const provider of providers) {
        try {
          return await provider.complete(options);
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          console.warn(`AI provider failed, trying next: ${lastError.message}`);
        }
      }
      throw lastError || new Error("All AI providers failed");
    },
  };
}

let _provider: AIProvider | null = null;

export function getAI(): AIProvider {
  if (_provider) return _provider;

  const primaryName = process.env.AI_PROVIDER || "groq";
  const primaryKey = process.env.AI_API_KEY || "";
  const fallbackName = process.env.AI_FALLBACK_PROVIDER || "";
  const fallbackKey = process.env.AI_FALLBACK_API_KEY || "";

  const providers: AIProvider[] = [];

  const primary = createProvider(primaryName, primaryKey);
  if (primary) providers.push(primary);

  if (fallbackName && fallbackKey) {
    const fallback = createProvider(fallbackName, fallbackKey);
    if (fallback) providers.push(fallback);
  }

  if (providers.length === 0) {
    throw new Error("AI_API_KEY environment variable is not set");
  }

  _provider = providers.length === 1 ? providers[0] : createFallbackProvider(providers);
  return _provider;
}

// --- Helper for structured JSON responses ---

export async function aiJSON<T>(options: Omit<AICompletionOptions, "json">): Promise<T> {
  const ai = getAI();
  const raw = await ai.complete({ ...options, json: true });

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse AI JSON response: ${cleaned.slice(0, 200)}`);
  }
}
