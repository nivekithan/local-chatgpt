import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { generateCodeVerifier, generateState } from "arctic";
import { googleOAuth, oauthSessionStorage } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = await googleOAuth.createAuthorizationURL(state, codeVerifier, {
    scopes: ["openid"],
  });

  const session = await oauthSessionStorage.getSession(
    request.headers.get("cookie")
  );

  session.set("state", state);
  session.set("codeVerifier", codeVerifier);

  return redirect(url.toString(), {
    headers: { "Set-Cookie": await oauthSessionStorage.commitSession(session) },
  });
}
