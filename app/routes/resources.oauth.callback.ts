import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { OAuth2RequestError } from "arctic";
import { z } from "zod";
import {
  googleOAuth,
  lucia,
  oauthSessionStorage,
  sessionIdStorage,
} from "~/lib/auth.server";
import { createOrSetUser } from "~/lib/models";

const GoogleOAuthUserInfoSchema = z.object({
  sub: z.string(),
  name: z.string().optional(),
  email: z.string(),
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
    ).then((res) => res.json());

    console.log("response", response);
    const userInfo = GoogleOAuthUserInfoSchema.parse(response);

    const user = await createOrSetUser({
      googleId: userInfo.sub,
      name: userInfo.name,
      email: userInfo.email,
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
