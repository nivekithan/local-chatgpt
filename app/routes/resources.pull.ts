import { json } from "@remix-run/node";
import { Message } from "~/lib/message";

export async function action() {
  return json({
    lastMutationIDChanges: {},
    cookie: 42,
    patch: [
      { op: "clear" },
      {
        op: "put",
        key: "message/1",
        value: {
          role: "user",
          content: "hey there",
          sort: 1,
        } satisfies Message,
      },
      {
        op: "put",
        key: "message/5ahljadc408",
        value: {
          role: "assistant",
          content: "hey there, How can I help you",
          sort: 3,
        },
      },
    ],
  });
}
