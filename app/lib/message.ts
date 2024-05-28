import { ReadTransaction, Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { NEW_CHAT_ID } from "./constants";

export type MessageRole = "user" | "assistant";

export type Message = {
  content: string;
  role: MessageRole;
  sort: number;
  createdAt: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
};

export type MessageList = {
  name: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
};

export async function listSortedMessages(
  tx: ReadTransaction,
  messageListId: string
) {
  const messages = await tx
    .scan<Message>({ prefix: `message/${messageListId}` })
    .entries()
    .toArray();

  messages.sort((a, b) => a[1].sort - b[1].sort);

  return messages;
}

export function useSortedMessage(r: Replicache, messageListId: string) {
  const messages = useSubscribe(
    r,
    (tx) => listSortedMessages(tx, messageListId),
    { dependencies: [messageListId] }
  );

  return messages || [];
}

export async function listSortedMessageList(tx: ReadTransaction) {
  const messageList = await tx
    .scan<MessageList>({ prefix: "messageList/" })
    .entries()
    .toArray();

  messageList.sort((a, b) => b[1].sort - a[1].sort);

  return messageList;
}

export function useSortedMessageList(r: Replicache) {
  const messageList = useSubscribe(r, listSortedMessageList) || [];
  const newChatList: (typeof messageList)[number] = [
    NEW_CHAT_ID,
    {
      name: "Start new chat",
      sort: -1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return [newChatList, ...messageList];
}
