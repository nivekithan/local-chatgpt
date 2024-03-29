import { LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { OAuth2RequestError } from "arctic";
import { z } from "zod";
import {
  googleOAuth,
  lucia,
  oauthSessionStorage,
  sessionIdStorage,
} from "~/lib/auth.server";
import { getOrCreateUser } from "~/lib/models";

const GoogleOAuthUserInfoSchema = z.object({
  sub: z.string(),
  name: z.string(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const session = await oauthSessionStorage.getSession(
    request.headers.get("cookie")
  );

  const storedState = session.get("state") || null;
  const codeVerifier = session.get("codeVerifier") || null;

  if (
    !code ||
    !state ||
    !storedState ||
    state !== storedState ||
    !codeVerifier
  ) {
    console.log("Invalid state or code");
    return new Response(null, { status: 400 });
  }

  try {
    const tokens = await googleOAuth.validateAuthorizationCode(
      code,
      codeVerifier
    );

    const response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );
    const userInfo = GoogleOAuthUserInfoSchema.parse(await response.json());

    const user = await getOrCreateUser({
      googleId: userInfo.sub,
      name: userInfo.name,
    });

    const session = await lucia.createSession(user.id, {});

    const sessionCookie = await sessionIdStorage.getSession(
      request.headers.get("cookie")
    );

    sessionCookie.set("sessionId", session.id);

    return redirect("/", {
      headers: {
        "Set-Cookie": await sessionIdStorage.commitSession(sessionCookie),
      },
    });
  } catch (err) {
    console.error(err);
    if (err instanceof OAuth2RequestError) {
      console.log("OAuth2RequestError", err);
      return new Response(null, {
        status: 400,
      });
    }
    return new Response(null, {
      status: 500,
    });
  }
}
