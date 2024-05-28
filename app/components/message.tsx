import { Message, useSortedMessage } from "~/lib/message";
import { ReplicacheInstance } from "~/lib/replicache";
import { useActiveListId } from "~/lib/stores/activeMessageListId";
import { Markdown } from "./markdown";
import { Suspense, useEffect, useRef } from "react";
import { useStreamingMessage } from "~/lib/stores/streamingMessage";

export function MessageList({
  replicache,
}: {
  replicache: ReplicacheInstance;
}) {
  const messageListId = useActiveListId((state) => state.activeListId);
  const messages = useSortedMessage(replicache, messageListId);

  console.log({ messages });
  const streamingMessage = useStreamingMessage(messageListId);

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  function scrollToBottom() {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Suspense fallback={null}>
      <div className="grid place-items-center">
        <div className="flex flex-col gap-y-4">
          {messages.map(([id, message]) => {
            return <MessageView key={id} {...message} />;
          })}
          {streamingMessage ? (
            <AiMessageView message={streamingMessage} />
          ) : null}
          <div ref={messageEndRef}></div>
        </div>
      </div>
    </Suspense>
  );
}

export function MessageView({
  role,
  content,
  completionTokens,
  promptTokens,
}: Message) {
  if (role === "assistant") {
    return (
      <AiMessageView
        message={content}
        completionTokens={completionTokens}
        promptTokens={promptTokens}
      />
    );
  }

  return <UserMessageView message={content} />;
}

function AiMessageView({
  message,
  promptTokens,
  completionTokens,
}: {
  message: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
}) {
  return (
    <div className="flex flex-col gap-y-0.5">
      <h4 className="text-sm font-semibold text-green-300">ChatGPT</h4>
      <Markdown content={message} />
      <p className="text-xs text-muted-foreground flex gap-x-2">
        {promptTokens ? <span>in: {promptTokens}</span> : null}
        {completionTokens ? <span>out: {completionTokens}</span> : null}
      </p>
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
