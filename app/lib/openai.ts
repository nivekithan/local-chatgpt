import OpenAI from "openai";
import { Message } from "./message";

export async function getGpt4Result({
  messages,
  openaiKey,
}: {
  messages: Message[];
  openaiKey: string;
}) {
  const openai = new OpenAI({
    apiKey: openaiKey,
    dangerouslyAllowBrowser: true,
  });

  const result = await openai.chat.completions.create({
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    model: "gpt-4",
    stream: false,
  });

  const response = result.choices[0]?.message.content;

  if (!response) {
    throw new Error("No response from GPT-4");
  }

  return response;
}
