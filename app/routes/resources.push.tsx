import { ActionFunctionArgs } from "@remix-run/node";
import { TransactionRollbackError, eq } from "drizzle-orm";
import {
  PossibleMutationsSchema,
  ReplicachePushRequestSchema,
} from "~/lib/replicache";
import { Transaction, db } from "~/lib/utils/db.server";
import {
  MessagesTable,
  REPLICACHE_SPACE_ID,
  ReplicacheClientGroupTable,
  ReplicacheClientTable,
  ReplicacheSpaceTable,
} from "~/lib/utils/schema.server";

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();

  const { mutations, clientGroupID } = ReplicachePushRequestSchema.parse(body);

  for (const mutation of mutations) {
    let isError = false;
    try {
      await db.transaction(async (tx) => {
        const clientGroup = await getClientGroup(tx, { clientGroupID });
        const client = await getClient(tx, {
          clientGroupID,
          clientID: mutation.clientID,
        });

        const nextMutationId = client.lastMutationId + 1;
        const space = await getSpace(tx);

        const nextVersion = space.version + 1;

        if (mutation.id < nextMutationId) {
          // Skip rollback if the mutation is already processed
          console.log("Mutation already processed");
          tx.rollback();
          return;
        }

        if (mutation.id > nextMutationId) {
          isError = true;
          console.log("MutationId is in future");
          tx.rollback();
          throw new Error("MutationId is in future");
        }

        console.log("Processing mutation");

        await handleMutation(tx, {
          args: mutation.args,
          name: mutation.name,
          version: nextVersion,
        });

        await setSpace(tx, nextVersion);
        await setClientGroup(tx, clientGroup.id);
        await setReplicacheClient(tx, {
          id: client.id,
          clientGroupId: clientGroup.id,
          lastMutationId: nextMutationId,
          lastModifiedVersion: nextVersion,
        });
      });
    } catch (err) {
      if (isError) {
        return new Response(null, { status: 500 });
      }

      if (err instanceof TransactionRollbackError) {
        console.log("Transaction rolled back");
        continue;
      }
    }
  }

  return new Response(null, { status: 200 });
}

async function setReplicacheClient(
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

async function setSpace(tx: Transaction, version: number) {
  await tx
    .update(ReplicacheSpaceTable)
    .set({ version })
    .where(eq(ReplicacheSpaceTable.id, REPLICACHE_SPACE_ID));
}

async function setClientGroup(tx: Transaction, id: string) {
  await tx
    .insert(ReplicacheClientGroupTable)
    .values({ id })
    .onConflictDoNothing();
}
async function handleMutation(
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

async function getSpace(tx: Transaction) {
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
async function getClient(
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
async function getClientGroup(
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
