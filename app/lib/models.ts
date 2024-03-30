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
    const { content, role, messageListId } = mutation.args;
    await tx.insert(MessagesTable).values({
      content,
      role,
      lastModifiedVersion: version,
      messageListId: messageListId,
      id: crypto.randomUUID(),
      userId,
    });
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
      .set({ name: newTitle, lastModifiedVersion: version })
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

  if (spaces.length === 0) {
    const createdSpace = { id: REPLICACHE_SPACE_ID, version: 0 };

    await tx.insert(ReplicacheSpaceTable).values(createdSpace);

    return createdSpace;
  }

  return spaces[0];
}

export async function getClient(
  tx: Transaction,
  { clientGroupID, clientID }: { clientID: string; clientGroupID: string }
) {
  const client = await tx
    .select()
    .from(ReplicacheClientTable)
    .where(eq(ReplicacheClientTable.id, clientID));

  if (client.length === 0) {
    return {
      clientGroupId: clientGroupID,
      id: clientID,
      lastMutationId: 0,
      lastModifiedVersion: 0,
    };
  }

  const clientRow = client[0];

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
  const clientGroup = await tx
    .select()
    .from(ReplicacheClientGroupTable)
    .where(eq(ReplicacheClientGroupTable.id, clientGroupID));

  if (clientGroup.length === 0) {
    return { id: clientGroupID, userId: currentUserId };
  }

  return clientGroup[0];
}

export async function getUser({ googleId }: { googleId: string }) {
  const users = await db
    .select()
    .from(UserTable)
    .where(eq(UserTable.googleId, googleId));

  if (users.length === 0) {
    return null;
  }

  return users[0];
}

export async function createUser({
  name,
  googleId,
}: {
  googleId: string;
  name: string;
}) {
  const user = await db
    .insert(UserTable)
    .values({ username: name, id: crypto.randomUUID(), googleId: googleId })
    .onConflictDoNothing({ target: UserTable.googleId })
    .returning();

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getOrCreateUser({
  googleId,
  name,
}: {
  googleId: string;
  name: string;
}) {
  const createdUser = await createUser({ name, googleId });

  if (!createdUser) {
    const existingUser = await getUser({ googleId });

    if (!existingUser) {
      throw new Error("Failed to create or get user");
    }

    return existingUser;
  }

  return createdUser;
}
