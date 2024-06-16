import { Replicache, WriteTransaction } from "replicache";
import {
  Message,
  MessageList,
  MessageRole,
  listSortedMessageList,
  listSortedMessages,
} from "./message";
import { z } from "zod";

export type ReplicacheInstance = Replicache<{
  addMessage(
    tx: WriteTransaction,
    message: {
      content: string;
      role: MessageRole;
      messageListId: string;
      promptTokens?: number;
      completionTokens?: number;
    }
  ): Promise<string>;
  addMessageList(
    tx: WriteTransaction,
    messageList: { name: string; id: string }
  ): Promise<string>;
  updateMessageListTitle(
    tx: WriteTransaction,
    args: { id: string; newTitle: string }
  ): void;
  deleteMessageList(
    tx: WriteTransaction,
    args: { messageListId: string }
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
      // logLevel: "debug",
      pullURL: "/resources/pull",
      pushURL: "/resources/push",
      mutators: {
        async addMessage(
          tx,
          { role, content, messageListId, promptTokens, completionTokens }
        ) {
          const messageList = await tx.get<MessageList>(
            `messageList/${messageListId}`
          );

          if (!messageList) {
            throw new Error("Message list not found");
          }

          const allMessage = await listSortedMessages(tx, messageListId);

          const lastSortKey = allMessage.at(-1)?.[1].sort ?? 0;
          const id = crypto.randomUUID() as string;

          await tx.set(`message/${messageListId}/${crypto.randomUUID()}`, {
            sort: lastSortKey + 1,
            content,
            role,
            createdAt: new Date().toISOString(),
            promptTokens: promptTokens,
            completionTokens: completionTokens,
          } satisfies Message);

          await tx.set(`messageList/${messageListId}`, {
            ...messageList,
            updatedAt: new Date().toISOString(),
          });

          return id;
        },
        async addMessageList(tx, { name, id }) {
          const messageList = await listSortedMessageList(tx);
          const nextSortKey = (messageList.at(0)?.[1]?.sort ?? 0) + 1;

          await tx.set(`messageList/${id}`, {
            name,
            sort: nextSortKey,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } satisfies MessageList);

          return id;
        },

        async updateMessageListTitle(tx, { id, newTitle }) {
          const messageList = await tx.get<MessageList>(`messageList/${id}`);
          if (!messageList) {
            throw new Error("Message list not found");
          }

          await tx.set(`messageList/${id}`, {
            ...messageList,
            updatedAt: new Date().toISOString(),
            name: newTitle,
          } satisfies MessageList);
        },

        async deleteMessageList(tx, { messageListId }) {
          // Delete all messages in the message list
          const messages = tx
            .scan<Message>({
              prefix: `message/${messageListId}/`,
            })
            .entries();

          for await (const message of messages) {
            await tx.del(message[0]);
          }

          // Delete the message list
          await tx.del(`messageList/${messageListId}`);
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

export const ReplicachePullRequestSchema = z.object({
  pullVersion: z.number(),
  clientGroupID: z.string(),
  cookie: z.number().nullable(),
  profileID: z.string(),
  schemaVersion: z.string(),
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
  args: z.object({
    content: z.string(),
    role: MessageRoleSchema,
    messageListId: z.string(),
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
  }),
});

export const AddMessageListMutation = z.object({
  name: z.literal("addMessageList"),
  args: z.object({ id: z.string(), name: z.string() }),
});

export const UpdateMessageListTitleMutation = z.object({
  name: z.literal("updateMessageListTitle"),
  args: z.object({ id: z.string(), newTitle: z.string() }),
});

export const DeleteMessageListMutation = z.object({
  name: z.literal("deleteMessageList"),
  args: z.object({ messageListId: z.string() }),
});

export const PossibleMutationsSchema = z.discriminatedUnion("name", [
  AddMessageMutation,
  AddMessageListMutation,
  UpdateMessageListTitleMutation,
  DeleteMessageListMutation,
]);

export function extractMessageListId(fullId: string) {
  return fullId.replace("messageList/", "");
}
