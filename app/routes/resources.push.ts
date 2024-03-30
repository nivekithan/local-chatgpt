import { ActionFunctionArgs } from "@remix-run/node";
import { TransactionRollbackError } from "drizzle-orm";
import { validateRequest } from "~/lib/auth.server";
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
  const headers = new Headers();
  const { user } = await validateRequest(request, headers);

  if (!user) {
    return new Response(null, { status: 401, headers });
  }

  const body = await request.json();

  const { mutations, clientGroupID } = ReplicachePushRequestSchema.parse(body);

  for (const mutation of mutations) {
    let isError = false;
    try {
      await db.transaction(async (tx) => {
        const clientGroup = await getClientGroup(tx, {
          clientGroupID,
          currentUserId: user.id,
        });

        if (clientGroup.userId !== user.id) {
          return new Response(null, { status: 404, headers });
        }

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

        try {
          await handleMutation(tx, {
            args: mutation.args,
            name: mutation.name,
            version: nextVersion,
            userId: user.id,
          });
        } catch (err) {
          isError = true;
          throw err;
        }

        await setSpace(tx, nextVersion);
        await setClientGroup(tx, { id: clientGroup.id, userId: user.id });
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
        return new Response(null, { status: 500, headers });
      }

      if (err instanceof TransactionRollbackError) {
        continue;
      }
    }
  }

  return new Response(null, { status: 200, headers });
}
