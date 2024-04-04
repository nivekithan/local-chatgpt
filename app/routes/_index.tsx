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
  useSubmit,
} from "@remix-run/react";
import { Resource } from "sst";
import { getInitilizedReplicache, getReplicache } from "~/lib/replicache";
import { MessageList } from "~/components/message";
import { z } from "zod";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { listSortedMessages, useSortedMessageList } from "~/lib/message";
import { getGpt4Result, summarizeQuery } from "~/lib/openai";
import { AutoSizeTextArea } from "~/components/ui/autoSizeTextArea";
import { Button } from "~/components/ui/button";
import { Replicache } from "replicache";
import { NEW_CHAT_ID } from "~/lib/constants";
import { useActiveListId } from "~/lib/stores/activeMessageListId";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { validateRequest } from "~/lib/auth.server";
import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";

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
  const openaiKey = Resource.LocalChatGptKey;

  return json(
    {
      repLicensekey: repLicensekey.value,
      openaiKey: openaiKey.value,
      userId: user.id,
    },
    { headers }
  );
}

export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  const { openaiKey, repLicensekey, userId } = await serverLoader<
    typeof loader
  >();

  const replicache = getReplicache({ licenseKey: repLicensekey, userId });

  return { replicache, openaiKey };
}

clientLoader.hydrate = true;

const queryClient = new QueryClient();

export default function Index() {
  const { replicache } = useLoaderData<typeof clientLoader>();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex">
        <div className="w-[352px] h-screen border-r-2 overflow-auto">
          <SideBar replicache={replicache} />
        </div>
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
  openaiKey: z.string(),
  query: z.string(),
  messageListId: z.string(),
});

function useQueryForm() {
  return useForm({
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: QuerySchema });
    },
  });
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: QuerySchema });

  if (submission.status !== "success") {
    return json({ submission: submission.reply() });
  }

  const replicache = getInitilizedReplicache();
  const { openaiKey, query, messageListId } = submission.value;

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

  await replicache.mutate.addMessage({
    content: response,
    role: "assistant",
    messageListId: currentMessageListId,
  });

  return { submission: submission.reply() };
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
        defaultValue={openaiKey}
        readOnly
      />
      <input
        hidden
        name={formFields.messageListId.name}
        defaultValue={messageListId}
        readOnly
      />
      <Button type="submit" className="h-">
        Submit
      </Button>
    </Form>
  );
}

function SideBar({ replicache }: { replicache: Replicache }) {
  const activeListId = useActiveListId((state) => state.activeListId);
  const messageList = useSortedMessageList(replicache);

  return (
    <div className="p-4">
      <h3 className="font-semibold text-sm mb-4">Local ChatGPT</h3>
      <ol className="flex flex-col gap-y-4">
        {messageList.map(([id, messageList]) => {
          const idWithoutPrefix = id.replace("messageList/", "");
          const isActive = activeListId === idWithoutPrefix;

          return (
            <li key={id} className="">
              <Button
                variant={isActive ? "secondary" : "outline"}
                type="button"
                className="w-full justify-start truncate overflow-hidden whitespace-nowrap block text-start"
                onClick={() => {
                  useActiveListId.getState().setActiveListId(idWithoutPrefix);
                }}
              >
                {messageList.name}
              </Button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
