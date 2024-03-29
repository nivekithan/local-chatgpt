import { Message, useSortedMessage } from "~/lib/message";
import { ReplicacheInstance } from "~/lib/replicache";
import { useActiveListId } from "~/lib/stores/activeMessageListId";
import { Markdown } from "./markdown";
import { Suspense } from "react";

export function MessageList({
  replicache,
}: {
  replicache: ReplicacheInstance;
}) {
  const messageListId = useActiveListId((state) => state.activeListId);
  const messages = useSortedMessage(replicache, messageListId);

  return (
    <Suspense fallback={null}>
      <div className="flex flex-col gap-y-4">
        {messages.map(([id, message]) => {
          return <MessageView key={id} {...message} />;
        })}
      </div>
    </Suspense>
  );
}

export function MessageView({ role, content }: Message) {
  if (role === "assistant") {
    return <AiMessageView message={content} />;
  }

  return <UserMessageView message={content} />;
}

function AiMessageView({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-y-0.5">
      <h4 className="text-sm font-semibold text-green-300">ChatGPT</h4>
      <Markdown content={message} />
    </div>
  );
}

function UserMessageView({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-y-0.5">
      <h4 className="text-sm font-semibold">User</h4>
      <Markdown content={message} />
    </div>
  );
}
