import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";

export function useMessages(r: Replicache) {
  const messages = useSubscribe(r, async (tx) => {
    const messages = await tx.scan({ prefix: "message" }).entries().toArray();

    return messages;
  });

  return messages;
}
