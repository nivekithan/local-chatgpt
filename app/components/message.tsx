import { Replicache } from "replicache";
import { useMessages } from "~/lib/message";

export type MessageRole = "user" | "ai";
export type Message = {
  role: MessageRole;
  content: string;
  sort: number;
};

export function Message({ role, content }: Message) {
  if (role === "ai") {
    return <AiMessage content={content} />;
  } else if (role === "user") {
    return <UserMessage content={content} />;
  }
}

function AiMessage({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-y-0.5">
      <h4 className="text-green-300 font-semibold text-sm">ChatGPT</h4>
      <p>{content}</p>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-y-0.5">
      <h4 className="font-semibold text-sm">User</h4>
      <p>{content}</p>
    </div>
  );
}

export function MessageList({ replicache }: { replicache: Replicache }) {
  const messages = useMessages(replicache);

  if (!messages) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-4">
      {messages.map(([id, message], i) => {
        console.log({ i, id });
        return <Message key={id} {...message} />;
      })}
    </div>
  );
}
