import { json, type MetaFunction } from "@remix-run/node";
import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
  Form,
  useLoaderData,
} from "@remix-run/react";
import { Resource } from "sst";
import { getUserId } from "~/lib/user";
import { getInitilizedReplicache, getReplicache } from "~/lib/replicache";
import { MessageList, MessageView } from "~/components/message";
import { z } from "zod";
import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { listSortedMessages, useSortedMessage } from "~/lib/message";
import { getGpt4Result } from "~/lib/openai";
import { AutoSizeTextArea } from "~/components/ui/autoSizeTextArea";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => {
  return [
    { title: "Local Chatgpt" },
    { name: "description", content: "Run chatgpt locally" },
  ];
};

export async function loader() {
  const repLicensekey = Resource.ReplicacheLicenseKey;
  const openaiKey = Resource.LocalChatGptKey;

  return json({
    repLicensekey: repLicensekey.value,
    openaiKey: openaiKey.value,
  });
}

export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  const { openaiKey, repLicensekey } = await serverLoader<typeof loader>();
  const userId = getUserId();
  const replicache = getReplicache({ licenseKey: repLicensekey, userId });

  return { replicache, openaiKey };
}

clientLoader.hydrate = true;

export default function Index() {
  const { replicache } = useLoaderData<typeof clientLoader>();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <MessageList replicache={replicache} />
      </div>
      <SearchQuery />
    </div>
  );
}

const QuerySchema = z.object({
  openaiKey: z.string(),
  query: z.string(),
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
  const { openaiKey, query } = submission.value;

  await replicache.mutate.addMessage({ content: query, role: "user" });

  const messagesWithId = await replicache.query(listSortedMessages);

  const messages = messagesWithId.map(([, message]) => message);

  const response = await getGpt4Result({ messages: messages, openaiKey });

  await replicache.mutate.addMessage({ content: response, role: "assistant" });

  return { submission: submission.reply() };
}

export function SearchQuery() {
  const { openaiKey } = useLoaderData<typeof clientLoader>();
  const [form, formFields] = useQueryForm();

  return (
    <Form
      className="flex gap-x-4 p-4 items-center"
      method="post"
      id={form.id}
      onSubmit={form.onSubmit}
    >
      <AutoSizeTextArea className="flex-1" name={formFields.query.name} />
      <input
        hidden
        name={formFields.openaiKey.name}
        defaultValue={openaiKey}
        readOnly
      />
      <Button type="submit">Submit</Button>
    </Form>
  );
}
