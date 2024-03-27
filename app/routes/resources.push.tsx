import { ActionFunctionArgs } from "@remix-run/node";
import { TransactionRollbackError, eq } from "drizzle-orm";
import {
  getClient,
  getClientGroup,
  getSpace,
  handleMutation,
  setClientGroup,
  setReplicacheClient,
  setSpace,
} from "~/lib/models";
import { ReplicachePushRequestSchema } from "~/lib/replicache";
import { db } from "~/lib/utils/db.server";

export async function action({ request }: ActionFunctionArgs) {
  console.log({ version: process.version });

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
        console.log("Error processing", err);
        return new Response(null, { status: 500 });
      }

      if (err instanceof TransactionRollbackError) {
        continue;
      }
    }
  }

  return new Response(null, { status: 200 });
}
