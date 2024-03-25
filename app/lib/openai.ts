import { OpenAI } from "openai";

export type OpenAiChatMessage = OpenAI.ChatCompletionMessageParam;
export type OpenAiChatHistory = OpenAiChatMessage[];

export async function getGpt4Result({
  apiKey,
  query,
}: {
  query: OpenAiChatHistory;
  apiKey: string;
}) {
  const openai = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });
  const openaiResult = await openai.chat.completions.create({
    model: "gpt-4",
    messages: query,
    stream: false,
  });

  const result = openaiResult.choices[0].message;

  if (!result.content) {
    throw new Error("Openai did not return a response");
  }

  return result.content;
}

export function convertToUserMessage(message: string): OpenAiChatMessage {
  return { role: "user", content: message };
}

export function convertToAssistantMessage(message: string): OpenAiChatMessage {
  return { role: "assistant", content: message };
}
