import { Message, useSortedMessage } from "~/lib/message";
import { ReplicacheInstance } from "~/lib/replicache";
import { useActiveListId } from "~/lib/stores/activeMessageListId";
import { FasterMarkdown } from "./markdown";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useStreamingMessage } from "~/lib/stores/streamingMessage";
import { useScrollDirection } from "react-use-scroll-direction";
import { throttle } from "dettle";

export function MessageList({
  replicache,
}: {
  replicache: ReplicacheInstance;
}) {
  const messageListId = useActiveListId((state) => state.activeListId);
  const messages = useSortedMessage(replicache, messageListId);

  const streamingMessage = useStreamingMessage(messageListId);
  const [messageEndEle, setMessageEndEle] = useState<HTMLDivElement | null>(
    null
  );

  const { scrollDirection, scrollTargetRef } = useScrollDirection();
  const [canScroll, setCanScroll] = useState(true);

  const scrollToBottom = useMemo(() => {
    return throttle(() => {
      if (messageEndEle && canScroll) {
        messageEndEle.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 500);
  }, [canScroll, messageEndEle]);

  useEffect(() => {
    if (streamingMessage) {
      scrollToBottom();
    }
  }, [messages, streamingMessage, scrollToBottom]);

  useEffect(() => {
    console.log("Running useEFfect");
    const interactionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        if (!scrollDirection) {
          return;
        }

        if (scrollDirection === "UP") {
          setCanScroll(false);
          return;
        }

        if (scrollDirection === "DOWN" && entry.isIntersecting) {
          setCanScroll(true);
          return;
        }
      },
      {
        root: null,
        threshold: 1,
      }
    );

    if (messageEndEle) {
      interactionObserver.observe(messageEndEle);
    }

    return () => {
      interactionObserver.disconnect();
    };
  }, [canScroll, messageEndEle, scrollDirection]);

  return (
    <div
      className="flex-1 max-h-[calc(100vh-132px)] overflow-auto"
      ref={(e) => {
        if (e) {
          scrollTargetRef(e);
        }
      }}
    >
      <Suspense fallback={null}>
        <div className="grid place-items-center mb-2">
          <div className="flex flex-col gap-y-4">
            {messages.map(([id, message]) => {
              return <MessageView key={id} {...message} />;
            })}
            {streamingMessage ? (
              <AiMessageView message={streamingMessage} />
            ) : null}
            <div ref={setMessageEndEle} className="h-[1px]"></div>
          </div>
        </div>
      </Suspense>
    </div>
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
      <FasterMarkdown content={message} />
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
      <FasterMarkdown content={message} />
    </div>
  );
}
