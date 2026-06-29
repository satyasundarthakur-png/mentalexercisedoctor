import { createServerFn } from "@tanstack/react-start";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqInput {
  messages: GroqMessage[];
  model: string;
  maxTokens: number;
  jsonMode?: boolean;
}

const REQUEST_TIMEOUT_MS = 30_000;

export const callGroqProxy = createServerFn({ method: "POST" })
  .inputValidator((input: GroqInput) => {
    if (!input || !Array.isArray(input.messages) || !input.model || !input.maxTokens) {
      throw new Error("Invalid Groq request payload");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured on the server.");
    }

    const body: Record<string, unknown> = {
      model: data.model,
      messages: data.messages,
      temperature: 0.72,
      max_tokens: data.maxTokens,
    };
    if (data.jsonMode) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "unknown error");
        throw new Error(`Groq API error ${response.status}: ${errText.slice(0, 200)}`);
      }

      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Groq returned empty content");
      return { content: content as string };
    } finally {
      clearTimeout(timeout);
    }
  });
