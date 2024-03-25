import { Message } from "~/components/message";

export async function action() {
  console.log("Running replicache pull");
  return Response.json({
    lastMutationIDChanges: {},
    cookie: 42,
    patch: [
      { op: "clear" },
      {
        op: "put",
        key: "message/1",
        value: {
          role: "user",
          content: "Hello there",
          sort: 1,
        } satisfies Message,
      },
      {
        op: "put",
        key: "message/2",
        value: {
          role: "ai",
          content: "Hey there, how may I assist you.",
          sort: 2,
        } satisfies Message,
      },
    ],
  });
}
