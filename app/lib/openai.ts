import { OpenAI } from "openai";

export type ChatMessage = OpenAI.ChatCompletionMessageParam;
export type ChatHistory = ChatMessage[];

export async function getGpt4Result({
  apiKey,
  query,
}: {
  query: ChatHistory;
  apiKey: string;
}) {
  const openai = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });
  const openaiResult = await openai.chat.completions.create({
    model: "gpt-4",
    messages: query,
    stream: false,
  });

  const result = openaiResult.choices[0].message;

  return result.content;
}

export function convertToUserMessage(message: string): ChatMessage {
  return { role: "user", content: message };
}
