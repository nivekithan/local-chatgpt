import { ReadTransaction, Replicache } from "replicache";
import { useSubscribe } from "replicache-react";

export type MessageRole = "user" | "assistant";

export type Message = {
  content: string;
  role: MessageRole;
  sort: number;
};

export async function listSortedMessages(tx: ReadTransaction) {
  const messages = await tx
    .scan<Message>({ prefix: "message/" })
    .entries()
    .toArray();

  messages.sort((a, b) => a[1].sort - b[1].sort);

  return messages;
}

export function useSortedMessage(r: Replicache) {
  const messages = useSubscribe(r, listSortedMessages);

  return messages || [];
}
