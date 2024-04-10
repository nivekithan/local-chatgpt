import OpenAI from "openai";
import { Message } from "./message";

export async function getGpt3Result({
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
    messages: messages.map((message) => {
      return {
        role: message.role,
        content: message.content,
      };
    }),
    model: "gpt-3.5-turbo",
  });

  return result.choices[0]?.message.content;
}
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
    stream: true,
  });

  return result;

  // const response = result.choices[0]?.message.content;
  //
  // if (!response) {
  //   throw new Error("No response from GPT-4");
  // }
  //
  // return response;
  //
}

export async function summarizeQuery({
  query,
  openAiKey,
}: {
  query: string;
  openAiKey: string;
}) {
  const openai = new OpenAI({
    apiKey: openAiKey,
    dangerouslyAllowBrowser: true,
  });

  const result = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are ai agent. Great at summarizing the user questions to a title. Your job is read the user question and return the title which summarizes the question. Return only the title. Without any markers as Title: or anything. Just the title.",
      },
      { role: "user", content: query },
    ],
    model: "gpt-3.5-turbo",
  });

  const response = result.choices[0]?.message.content || query;

  return response;
}
