import { Replicache, WriteTransaction } from "replicache";
import { Message } from "~/components/message";
import { listMessages } from "./message";

export function getUserId() {
  const userId = window.localStorage.getItem("userId");

  if (!userId) {
    const generatedId = crypto.randomUUID();
    window.localStorage.setItem("userId", generatedId);
    return generatedId;
  }

  return userId;
}

let replicacheInstance: Replicache<{
  addMessage(tx: WriteTransaction, msg: Omit<Message, "sort">): Promise<void>;
}> | null = null;

export function getUserReplicache({
  userId,
  replicacheLicenseKey,
}: {
  userId: string;
  replicacheLicenseKey: string;
}) {
  if (!replicacheInstance) {
    replicacheInstance = new Replicache({
      logLevel: "debug",
      pullURL: "/resources/pull",
      name: userId,
      licenseKey: replicacheLicenseKey,
      mutators: {
        async addMessage(tx, { content, role }) {
          const messages = await listMessages(tx);

          const maxSort = messages.at(-1)?.[1].sort ?? 0;
          await tx.set(`message/${crypto.randomUUID()}`, {
            content,
            role,
            sort: maxSort + 1,
          } satisfies Message);
        },
      },
    });
  }

  return replicacheInstance;
}

export function getInitiazedReplicache() {
  if (!replicacheInstance) {
    throw new Error("Replicache not initialized");
  }

  return replicacheInstance;
}
