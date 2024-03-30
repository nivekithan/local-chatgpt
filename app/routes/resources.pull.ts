import { ActionFunctionArgs, json } from "@remix-run/node";
import { and, eq, gt } from "drizzle-orm";
import { JSONValue } from "replicache";
import { validateRequest } from "~/lib/auth.server";
import { Message, MessageList } from "~/lib/message";
import { getClientGroup, getSpace } from "~/lib/models";
import { ReplicachePullRequestSchema } from "~/lib/replicache";
import { Transaction, db } from "~/lib/utils/db.server";
import {
  MessageListTable,
  MessagesTable,
  ReplicacheClientTable,
  UserTable,
} from "~/lib/utils/schema.server";

export async function action({ request }: ActionFunctionArgs) {
  const headers = new Headers();
  const { user } = await validateRequest(request, headers);

  if (!user) {
    return new Response(null, { status: 401, headers });
  }

  const body = await request.json();

  const { cookie, clientGroupID } = ReplicachePullRequestSchema.parse(body);

  const response = await db.transaction(async (tx) => {
    let prevVersion = cookie || 0;

    const [, space] = await Promise.all([
      getClientGroup(tx, { clientGroupID, currentUserId: user.id }),
      getSpace(tx),
    ]);

    const [newMessages, clients, newMessageLists] = await Promise.all([
      getNewMessages(tx, { prevVersion, userId: user.id }),
      getAllClients(tx, { prevVersion, clientGroupID }),
      getNewMessageList(tx, { prevVersion, userId: user.id }),
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
  { prevVersion, userId }: { prevVersion: number; userId: string }
) {
  const messageLists = await tx
    .select()
    .from(MessageListTable)
    .where(
      and(
        gt(MessageListTable.lastModifiedVersion, prevVersion),
        eq(MessageListTable.userId, userId)
      )
    );

  return messageLists;
}
async function getNewMessages(
  tx: Transaction,
  { prevVersion, userId }: { prevVersion: number; userId: string }
) {
  const messages = await tx
    .select()
    .from(MessagesTable)
    .where(
      and(
        gt(MessagesTable.lastModifiedVersion, prevVersion),
        eq(MessagesTable.userId, userId)
      )
    );

  return messages;
}
