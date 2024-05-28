import { Transaction, db } from "./utils/db.server";
import {
  MessageListTable,
  MessagesTable,
  REPLICACHE_SPACE_ID,
  ReplicacheClientGroupTable,
  ReplicacheClientTable,
  ReplicacheSpaceTable,
  UserTable,
} from "~/lib/utils/schema.server";
import { PossibleMutationsSchema } from "~/lib/replicache";
import { eq } from "drizzle-orm";

export async function setReplicacheClient(
  tx: Transaction,
  {
    id,
    lastMutationId,
    clientGroupId,
    lastModifiedVersion,
  }: {
    id: string;
    clientGroupId: string;
    lastMutationId: number;
    lastModifiedVersion: number;
  }
) {
  await tx
    .insert(ReplicacheClientTable)
    .values({ id, lastMutationId, clientGroupId, lastModifiedVersion })
    .onConflictDoUpdate({
      target: ReplicacheClientTable.id,
      set: {
        lastMutationId: lastMutationId,
        lastModifiedVersion: lastModifiedVersion,
      },
    });
}

export async function setSpace(tx: Transaction, version: number) {
  await tx
    .update(ReplicacheSpaceTable)
    .set({ version })
    .where(eq(ReplicacheSpaceTable.id, REPLICACHE_SPACE_ID));
}

export async function setClientGroup(
  tx: Transaction,
  { userId, id }: { id: string; userId: string }
) {
  await tx
    .insert(ReplicacheClientGroupTable)
    .values({ id, userId })
    .onConflictDoNothing();
}
export async function handleMutation(
  tx: Transaction,
  {
    name,
    args,
    version,
    userId,
  }: {
    name: string;
    args: Record<string, unknown>;
    version: number;
    userId: string;
  }
) {
  const mutation = PossibleMutationsSchema.parse({ name, args });

  if (mutation.name === "addMessage") {
    const { content, role, messageListId, completionTokens, promptTokens } =
      mutation.args;
    await tx.insert(MessagesTable).values({
      content,
      role,
      lastModifiedVersion: version,
      messageListId: messageListId,
      id: crypto.randomUUID(),
      completionTokens: completionTokens,
      promptTokens: promptTokens,
      userId,
    });

    await tx
      .update(MessageListTable)
      .set({ updatedAt: new Date() })
      .where(eq(MessageListTable.id, messageListId));
    return;
  } else if (mutation.name === "addMessageList") {
    const { id, name } = mutation.args;
    await tx
      .insert(MessageListTable)
      .values({ name: name, id: id, lastModifiedVersion: version, userId });
    return;
  } else if (mutation.name === "updateMessageListTitle") {
    const { id, newTitle } = mutation.args;
    await tx
      .update(MessageListTable)
      .set({
        name: newTitle,
        lastModifiedVersion: version,
        updatedAt: new Date(),
      })
      .where(eq(MessageListTable.id, id));
    return;
  }

  throw new Error(`Unknown mutation`);
}

export async function getSpace(tx: Transaction) {
  const spaces = await tx
    .select()
    .from(ReplicacheSpaceTable)
    .where(eq(ReplicacheSpaceTable.id, REPLICACHE_SPACE_ID));

  const space = spaces[0];

  if (!space) {
    const createdSpace = { id: REPLICACHE_SPACE_ID, version: 0 };

    await tx.insert(ReplicacheSpaceTable).values(createdSpace);

    return createdSpace;
  }

  return space;
}

export async function getClient(
  tx: Transaction,
  { clientGroupID, clientID }: { clientID: string; clientGroupID: string }
) {
  const client = await tx
    .select()
    .from(ReplicacheClientTable)
    .where(eq(ReplicacheClientTable.id, clientID));

  const clientRow = client[0];

  if (!clientRow) {
    return {
      clientGroupId: clientGroupID,
      id: clientID,
      lastMutationId: 0,
      lastModifiedVersion: 0,
    };
  }

  if (clientRow.clientGroupId !== clientGroupID) {
    throw new Error("Client group does not own requesting client");
  }

  return clientRow;
}
export async function getClientGroup(
  tx: Transaction,
  {
    clientGroupID,
    currentUserId,
  }: { clientGroupID: string; currentUserId: string }
) {
  const clientGroups = await tx
    .select()
    .from(ReplicacheClientGroupTable)
    .where(eq(ReplicacheClientGroupTable.id, clientGroupID));

  const clientGroup = clientGroups[0];

  if (!clientGroup) {
    return { id: clientGroupID, userId: currentUserId };
  }

  return clientGroup;
}

export async function createOrSetUser({
  name,
  googleId,
  email,
}: {
  googleId: string;
  name?: string;
  email: string;
}) {
  const userList = await db
    .insert(UserTable)
    .values({ username: name, id: crypto.randomUUID(), googleId: googleId })
    .onConflictDoUpdate({ target: UserTable.googleId, set: { email: email } })
    .returning();

  const user = userList[0];

  if (user === undefined) {
    throw new Error("Failed to create or get user");
  }

  return user;
}
