import { json, type MetaFunction } from "@remix-run/node";
import { ClientLoaderFunctionArgs, useLoaderData } from "@remix-run/react";
import { Resource } from "sst";
import { getUserId } from "~/lib/user";
import { getReplicache } from "~/lib/replicache";
import { MessageList, MessageView } from "~/components/message";

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
  const { replicache, openaiKey } = useLoaderData<typeof clientLoader>();

  return (
    <div className="min-h-screen flex flex-col">
      <div>
        <MessageList replicache={replicache} />
      </div>
    </div>
  );
}
