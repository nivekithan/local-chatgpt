import { Replicache, WriteTransaction } from "replicache";
import { Message, MessageRole, listSortedMessages } from "./message";
import { z } from "zod";

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
      // pullURL: "/resources/pull",
      pushURL: "/resources/push",
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

export function getInitilizedReplicache() {
  if (!replicacheInstance) {
    throw new Error("Replicache is not initialized");
  }

  return replicacheInstance;
}

export const ReplicacheMutationSchema = z.object({
  clientID: z.string(),
  id: z.number(),
  name: z.string(),
  args: z.record(z.unknown()),
  timestamp: z.number(),
});

export const ReplicachePushRequestSchema = z.object({
  pushVersion: z.number(),
  clientGroupID: z.string(),
  mutations: z.array(ReplicacheMutationSchema),
  profileID: z.string(),
  schemaVersion: z.string(),
});

const MessageRoleSchema = z.union([z.literal("user"), z.literal("assistant")]);

export const AddMessageMutation = z.object({
  name: z.literal("addMessage"),
  args: z.object({ content: z.string(), role: MessageRoleSchema }),
});

const PlaceholderMuation = z.object({
  name: z.literal("placeholder"),
  args: z.object({ content: z.string(), role: MessageRoleSchema }),
});

export const PossibleMutationsSchema = z.discriminatedUnion("name", [
  AddMessageMutation,
  PlaceholderMuation,
]);
