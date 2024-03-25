import { ReadTransaction, Replicache } from "replicache";
import { useSubscribe } from "replicache-react";
import { Message } from "~/components/message";

export function useMessages(r: Replicache) {
  const messages = useSubscribe(r, async (tx) => {
    return listMessages(tx);
  });

  return messages;
}

export async function listMessages(tx: ReadTransaction) {
  const message = await tx
    .scan<Message>({ prefix: "message" })
    .entries()
    .toArray();

  message.sort((a, b) => a[1].sort - b[1].sort);

  return message;
}
