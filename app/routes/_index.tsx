import {
  LoaderFunctionArgs,
  json,
  type MetaFunction,
} from "@remix-run/cloudflare";
import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
  useActionData,
  useLoaderData,
} from "@remix-run/react";
import { z } from "zod";
import { QueryForm } from "~/components/search";
import { getEnv } from "~/server/util/env.server";
import { parseWithZod } from "@conform-to/zod";
import { useForm } from "@conform-to/react";
import {
  convertToAssistantMessage,
  convertToUserMessage,
  getGpt4Result,
} from "~/lib/openai";
import {
  getInitiazedReplicache,
  getUserId,
  getUserReplicache,
} from "~/lib/user";
import { MessageList } from "~/components/message";
import { listMessages } from "~/lib/message";

export const meta: MetaFunction = () => {
  return [
    { title: "Local chatGPT client" },
    {
      name: "description",
      content: "Access gpt-4 using your own api key",
    },
  ];
};

const QuerySchema = z.object({ query: z.string().min(0), apiKey: z.string() });

export async function loader({ context }: LoaderFunctionArgs) {
  const env = getEnv(context);

  return json({
    apiKey: env.OPENAI_API_KEY,
    replicacheLicenseKey: env.REPLICACHE_LICENSE_KEY,
  });
}

export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  const loaderData = await serverLoader<typeof loader>();

  const userId = getUserId();
  const replicache = getUserReplicache({
    userId,
    replicacheLicenseKey: loaderData.replicacheLicenseKey,
  });

  return Object.assign(loaderData, { userId, replicache });
}

clientLoader.hydrate = true;

function useSearchForm() {
  const actionData = useActionData<typeof clientAction>();
  return useForm({
    lastResult: actionData?.lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: QuerySchema });
    },
  });
}

export default function Index() {
  const { apiKey, replicache } = useLoaderData<typeof clientLoader>();
  const [form, { apiKey: apiKeyField, query }] = useSearchForm();

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1">
        <MessageList replicache={replicache} />
      </div>
      <QueryForm
        textAreaName={query.name}
        apiKeyName={apiKeyField.name}
        apiKeyValue={apiKey}
        formId={form.id}
        formOnSubmit={form.onSubmit}
      />
    </main>
  );
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const replicache = getInitiazedReplicache();
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: QuerySchema });

  if (submission.status !== "success") {
    return json({ response: null, lastResult: submission.reply() });
  }

  const { query, apiKey } = submission.value;

  await replicache.mutate.addMessage({ role: "user", content: query });

  const chatHistory = await replicache.query(listMessages);

  const inProperFormat = chatHistory.map(([, msg]) => {
    if (msg.role === "user") {
      return convertToUserMessage(msg.content);
    } else {
      return convertToAssistantMessage(msg.content);
    }
  });

  const response = await getGpt4Result({
    apiKey,
    query: inProperFormat,
  });

  await replicache.mutate.addMessage({ role: "ai", content: response });

  return json({ response, lastResult: submission.reply() });
}
