import { Replicache, WriteTransaction } from "replicache";
import { Message, MessageRole, listSortedMessages } from "./message";

export type ReplicacheInstance = Replicache<{
  addMessage(
    tx: WriteTransaction,
    message: { content: string; role: MessageRole }
  ): void;
}>;

let replicacheInstance: ReplicacheInstance | null = null;

export function getReplicache({
  userId,
  licenseKey,
}: {
  licenseKey: string;
  userId: string;
}) {
  if (!replicacheInstance) {
    replicacheInstance = new Replicache({
      licenseKey: licenseKey,
      name: userId,
      logLevel: "debug",
      pullURL: "/resources/pull",
      mutators: {
        async addMessage(tx, { role, content }) {
          const allMessage = await listSortedMessages(tx);

          const lastSortKey = allMessage.at(-1)?.[1].sort ?? 0;

          await tx.set(`message/${crypto.randomUUID()}`, {
            sort: lastSortKey + 1,
            content,
            role,
          } satisfies Message);
        },
      },
    });

    return replicacheInstance;
  }

  return replicacheInstance;
}
