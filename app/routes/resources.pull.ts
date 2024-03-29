import { ActionFunctionArgs, json } from "@remix-run/node";
import { and, eq, gt } from "drizzle-orm";
import { JSONValue } from "replicache";
import { Message, MessageList } from "~/lib/message";
import { getClientGroup, getSpace } from "~/lib/models";
import { ReplicachePullRequestSchema } from "~/lib/replicache";
import { Transaction, db } from "~/lib/utils/db.server";
import {
  MessageListTable,
  MessagesTable,
  ReplicacheClientTable,
} from "~/lib/utils/schema.server";

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();

  const { cookie, profileID, clientGroupID } =
    ReplicachePullRequestSchema.parse(body);

  const response = await db.transaction(async (tx) => {
    let prevVersion = cookie || 0;

    const [, space] = await Promise.all([
      getClientGroup(tx, { clientGroupID }),
      getSpace(tx),
    ]);

    const [newMessages, clients, newMessageLists] = await Promise.all([
      getNewMessages(tx, { prevVersion }),
      getAllClients(tx, { prevVersion, clientGroupID }),
      getNewMessageList(tx, { prevVersion }),
    ]);

    const patches: Array<{ op: "put"; key: string; value: JSONValue }> = [];

    return {
      cookie: space.version,
      lastMutationIDChanges: clients.reduce((acc, client) => {
        acc[client.id] = client.lastMutationId;
        return acc;
      }, {} as Record<string, number>),
      patch: patches
        .concat(
          newMessageLists.map((messageList) => {
            return {
              op: "put",
              key: `messageList/${messageList.id}`,
              value: {
                name: messageList.name,
                sort: messageList.sort,
              } satisfies MessageList,
            };
          })
        )
        .concat(
          newMessages.map((message) => {
            return {
              op: "put",
              key: `message/${message.messageListId}/${message.id}`,
              value: {
                role: message.role,
                sort: message.sort,
                content: message.content,
              } satisfies Message,
            };
          })
        ),
    };
  });

  return json(response);
}

async function getAllClients(
  tx: Transaction,
  { prevVersion, clientGroupID }: { clientGroupID: string; prevVersion: number }
) {
  const clients = await tx
    .select()
    .from(ReplicacheClientTable)
    .where(
      and(
        gt(ReplicacheClientTable.lastModifiedVersion, prevVersion),
        eq(ReplicacheClientTable.clientGroupId, clientGroupID)
      )
    );

  return clients;
}
async function getNewMessageList(
  tx: Transaction,
  { prevVersion }: { prevVersion: number }
) {
  const messageLists = await tx
    .select()
    .from(MessageListTable)
    .where(gt(MessageListTable.lastModifiedVersion, prevVersion));

  return messageLists;
}
async function getNewMessages(
  tx: Transaction,
  { prevVersion }: { prevVersion: number }
) {
  const messages = await tx
    .select()
    .from(MessagesTable)
    .where(gt(MessagesTable.lastModifiedVersion, prevVersion));

  return messages;
}
