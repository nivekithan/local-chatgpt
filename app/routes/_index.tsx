import {
  LoaderFunctionArgs,
  json,
  redirect,
  type MetaFunction,
} from "@remix-run/node";
import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
  Form,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import { Resource } from "sst";
import { getInitilizedReplicache, getReplicache } from "~/lib/replicache";
import { MessageList } from "~/components/message";
import { z } from "zod";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { listSortedMessages, useSortedMessageList } from "~/lib/message";
import {
  getGpt4Result,
  getOpenAiKey,
  setOpenAiKey,
  summarizeQuery,
} from "~/lib/openai";
import { AutoSizeTextArea } from "~/components/ui/autoSizeTextArea";
import { Button } from "~/components/ui/button";
import { Replicache } from "replicache";
import { FORM_ACTIONS, NEW_CHAT_ID } from "~/lib/constants";
import { useActiveListId } from "~/lib/stores/activeMessageListId";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { validateRequest } from "~/lib/auth.server";
import { useCallback, useEffect, useRef, useState } from "react";
import { streamingMessageStore } from "~/lib/stores/streamingMessage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CompletionUsage } from "openai/resources/completions.mjs";

export const meta: MetaFunction = () => {
  return [
    { title: "Local Chatgpt" },
    { name: "description", content: "Run chatgpt locally" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = new Headers();

  const { user } = await validateRequest(request, headers);

  if (!user) {
    return redirect("/login", { headers });
  }
  const repLicensekey = Resource.ReplicacheLicenseKey;

  return json(
    {
      repLicensekey: repLicensekey.value,
      userId: user.id,
    },
    { headers }
  );
}

export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  const { repLicensekey, userId } = await serverLoader<typeof loader>();

  const replicache = getReplicache({ licenseKey: repLicensekey, userId });
  const openaiKey = getOpenAiKey();

  return { replicache, openaiKey };
}

clientLoader.hydrate = true;

const queryClient = new QueryClient();

export default function Index() {
  const { replicache, openaiKey } = useLoaderData<typeof clientLoader>();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex">
        <SideBar replicache={replicache} openaiKey={openaiKey} />
        <div className="min-h-screen flex flex-col flex-1 relative">
          <div className="flex-1 max-h-[calc(100vh-72px)] overflow-auto">
            <MessageList replicache={replicache} />
          </div>
          <div className="fixed bottom-0 w-[calc(100%-352px)] right-0 bg-background min-h-[72px] py-4 grid place-items-center">
            <div className="w-[75ch]">
              <SearchQuery />
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

const QuerySchema = z.object({
  action: z.literal(FORM_ACTIONS.SEARCH),
  openaiKey: z.string().min(1, "Set OpenAI Key"),
  query: z.string(),
  messageListId: z.string(),
});

const UpdateOpenAIKeySchema = z.object({
  action: z.literal(FORM_ACTIONS.UPDATE_OPENAI_KEY),
  openaiKey: z.string().min(1, "Set OpenAI Key"),
});

function useQueryForm() {
  return useForm({
    defaultValue: { action: "updateOpenAIKey" },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: QuerySchema });
    },
  });
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, {
    schema: z.discriminatedUnion("action", [
      UpdateOpenAIKeySchema,
      QuerySchema,
    ]),
  });

  if (submission.status !== "success") {
    return json({ submission: submission.reply() });
  }

  if (submission.value.action === "updateOpenAIKey") {
    setOpenAiKey(submission.value.openaiKey);
    return { submission: submission.reply() };
  } else if (submission.value.action === FORM_ACTIONS.SEARCH) {
    const { openaiKey, query, messageListId } = submission.value;
    await processSearchQuery({ openaiKey, messageListId, query });
    return { submission: submission.reply() };
  } else {
    throw new Error("Unknown action");
  }
}

export function SearchQuery() {
  const { openaiKey } = useLoaderData<typeof clientLoader>();
  const [form, formFields] = useQueryForm();

  const messageListId = useActiveListId((state) => state.activeListId);

  const formElementRef = useRef<HTMLFormElement | null>(null);
  const submitForm = useSubmit();

  const [textareaValue, setTextareaValue] = useState("");

  function handleOnChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTextareaValue(e.currentTarget.value);
  }

  useEffect(() => {
    console.log(`MessageListId gets updated: ${messageListId}`);
  }, [messageListId]);

  return (
    <Form
      className="flex gap-x-4 "
      method="post"
      id={form.id}
      onSubmit={form.onSubmit}
      ref={formElementRef}
    >
      <AutoSizeTextArea
        className="flex-1"
        value={textareaValue}
        onChange={handleOnChange}
        name={formFields.query.name}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            submitForm(formElementRef.current);
            setTextareaValue("");
            e.preventDefault();
          }
        }}
      />
      <input
        hidden
        name={formFields.openaiKey.name}
        value={openaiKey || ""}
        readOnly
      />
      <input
        hidden
        name={formFields.messageListId.name}
        value={messageListId}
        readOnly
      />
      <input
        hidden
        name={formFields.action.name}
        value={FORM_ACTIONS.SEARCH}
        readOnly
      />

      <Button type="submit" className="h-">
        Submit
      </Button>
    </Form>
  );
}

function SideBar({
  replicache,
}: {
  replicache: Replicache;
  openaiKey: string | null;
}) {
  return <VirtualizedMessageList replicache={replicache} />;
}

function VirtualizedMessageList({ replicache }: { replicache: Replicache }) {
  const activeListId = useActiveListId((state) => state.activeListId);
  const messageList = useSortedMessageList(replicache);

  // The scrollable element for the virtualized list
  const scrollableElementRef = useRef<HTMLDivElement>(null);

  const getKeyFromIndex = useCallback(
    (index: number) => {
      const item = messageList[index];

      if (!item) {
        throw new Error(
          "Tanstack virutal returned `index` that is out of bounds"
        );
      }

      return item[0];
    },
    [messageList]
  );

  const rowVirtualizer = useVirtualizer({
    count: messageList.length,
    getScrollElement: () => scrollableElementRef.current,
    estimateSize: () => 40,
    gap: 16,
    getItemKey: getKeyFromIndex,
  });

  return (
    <div
      className="w-[352px] h-screen border-r-2 overflow-auto p-4"
      ref={scrollableElementRef}
    >
      {/* <div className="flex justify-between items-center mb-2"> */}
      {/*   <h3 className="font-semibold text-sm">Local ChatGPT</h3> */}
      {/*   <UpdateOpenAiKeyDialog openaiKey={openaiKey} /> */}
      {/* </div> */}
      <ol
        className="flex flex-col gap-y-4"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = messageList[virtualItem.index];

          if (!item) {
            throw new Error(
              "Tanstack virutal returned `item` that is out of bounds"
            );
          }

          const [id, messageListTopic] = item;
          const idWithoutPrefix = id.replace("messageList/", "");
          const isActive = activeListId === idWithoutPrefix;

          return (
            <li
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <Button
                variant={isActive ? "secondary" : "outline"}
                type="button"
                className="w-full justify-start truncate overflow-hidden whitespace-nowrap block text-start"
                onClick={() => {
                  useActiveListId.getState().setActiveListId(idWithoutPrefix);
                }}
              >
                {messageListTopic.name}
              </Button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UpdateOpenAiKeyDialog({ openaiKey }: { openaiKey: string | null }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [form, formFields] = useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: UpdateOpenAIKeySchema,
      });
    },
  });

  const navigation = useNavigation();

  useEffect(() => {
    if (navigation.state === "loading") {
      setIsDialogOpen(false);
    }
  }, [navigation.state]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="alwaysActivelink">Set OpenAI Key</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {openaiKey ? "Update OpenAI Key" : "Set OpenAI Key"}
          </DialogTitle>
          <DialogDescription>
            Set OpenAI Key to use the OpenAI API. You can find your API key at
            https://platform.openai.com/account/api-keys.
          </DialogDescription>
        </DialogHeader>
        <Form
          id={form.id}
          onSubmit={form.onSubmit}
          className="w-full flex flex-col gap-y-4"
          method="post"
        >
          <Input
            name={formFields.openaiKey.name}
            defaultValue={openaiKey || ""}
            className="w-full"
          />
          <input
            hidden
            name={formFields.action.name}
            defaultValue={FORM_ACTIONS.UPDATE_OPENAI_KEY}
            readOnly
          />
          <Button type="submit" className="w-full">
            {openaiKey ? "Update OpenAI Key" : "Set OpenAI Key"}
          </Button>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

async function processSearchQuery({
  openaiKey,
  messageListId,
  query,
}: {
  messageListId: string;
  query: string;
  openaiKey: string;
}) {
  const replicache = getInitilizedReplicache();

  const currentMessageListId =
    messageListId === NEW_CHAT_ID
      ? await replicache.mutate.addMessageList({
          name: query,
          id: `${crypto.randomUUID()}`,
        })
      : messageListId;

  if (messageListId === NEW_CHAT_ID) {
    // Start summraizing the conversation
    summarizeQuery({ query: query, openAiKey: openaiKey }).then((title) => {
      return replicache.mutate.updateMessageListTitle({
        id: currentMessageListId,
        newTitle: title,
      });
    });
  }

  useActiveListId.getState().setActiveListId(currentMessageListId);

  console.log({ activeListId: useActiveListId.getState().activeListId });

  await replicache.mutate.addMessage({
    content: query,
    role: "user",
    messageListId: currentMessageListId,
  });

  const messagesWithId = await replicache.query((tx) =>
    listSortedMessages(tx, currentMessageListId)
  );

  const messages = messagesWithId.map(([, message]) => message);

  const response = await getGpt4Result({ messages: messages, openaiKey });

  let combinedMessage = "";
  let usage: CompletionUsage | null = null;

  for await (const chunk of response) {
    const streamingMessage = chunk.choices[0]?.delta.content;
    const chatUsage = chunk.usage;

    if (chatUsage) {
      usage = chatUsage;
    }
    if (!streamingMessage) {
      continue;
    }

    streamingMessageStore
      .getState()
      .setStreamingMessage(currentMessageListId, combinedMessage);
    combinedMessage += streamingMessage;
  }

  if (!usage) {
    console.error("Usage data is not being returned from OpenAI");
  }

  await replicache.mutate.addMessage({
    content: combinedMessage,
    role: "assistant",
    messageListId: currentMessageListId,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
  });

  streamingMessageStore.getState().deleteStreamingMessage(currentMessageListId);
}
