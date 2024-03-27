import { Transaction } from "./utils/db.server";
import {
  MessagesTable,
  REPLICACHE_SPACE_ID,
  ReplicacheClientGroupTable,
  ReplicacheClientTable,
  ReplicacheSpaceTable,
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

export async function setClientGroup(tx: Transaction, id: string) {
  await tx
    .insert(ReplicacheClientGroupTable)
    .values({ id })
    .onConflictDoNothing();
}
export async function handleMutation(
  tx: Transaction,
  {
    name,
    args,
    version,
  }: { name: string; args: Record<string, unknown>; version: number }
) {
  const mutation = PossibleMutationsSchema.parse({ name, args });

  if (mutation.name === "addMessage") {
    const { content, role } = mutation.args;
    await tx
      .insert(MessagesTable)
      .values({ content, role, lastModifiedVersion: version });
  }
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
  { clientGroupID }: { clientGroupID: string }
) {
  const clientGroup = await tx
    .select()
    .from(ReplicacheClientGroupTable)
    .where(eq(ReplicacheClientGroupTable.id, clientGroupID));

  if (clientGroup.length === 0) {
    return { id: clientGroupID };
  }

  return clientGroup[0];
}
