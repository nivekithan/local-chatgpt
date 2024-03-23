import {
  LoaderFunctionArgs,
  json,
  type MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getEnv } from "~/server/util/env";

export const meta: MetaFunction = () => {
  return [
    { title: "Local chatGPT client" },
    {
      name: "description",
      content: "Access gpt-4 using api key",
    },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const env = getEnv(context);

  return json({ env });
}

export default function Index() {
  const env = useLoaderData<typeof loader>().env;
  return <h1 className="font-semibold">{JSON.stringify(env)}</h1>;
}
