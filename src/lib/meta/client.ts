import OpenAI from "openai";

export const META_BASE_URL = "https://api.meta.ai/v1";

let client: OpenAI | undefined;

export function metaClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("MODEL_API_KEY is not set");
  client = new OpenAI({ baseURL: META_BASE_URL, apiKey });
  return client;
}
