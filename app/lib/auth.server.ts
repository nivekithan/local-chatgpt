import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { SessionTable, UserTable } from "./utils/schema.server";
import { db } from "./utils/db.server";
import { Google } from "arctic";
import { Resource } from "sst/resource";
import { createCookie, createCookieSessionStorage } from "@remix-run/node";

export const googleOAuth = new Google(
  Resource.OAuthGoogleClientId.value,
  Resource.OAuthGoogleClientSecret.value,
  Resource.OAuthRedirectUri.value
);

export const lucia = new Lucia(
  new DrizzlePostgreSQLAdapter(db, SessionTable, UserTable),
  {
    sessionCookie: {
      expires: false,
      attributes: {
        secure: true,
      },
    },

    getUserAttributes(attributes) {
      return {
        googleId: attributes.google_id,
        username: attributes.username,
      };
    },
  }
);

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  google_id: string;
  username: string;
}

export const oauthCookie = createCookie("oauth", {
  secure: true,
  path: "/",
  httpOnly: true,
  maxAge: 60 * 10,
});

export const oauthSessionStorage = createCookieSessionStorage<{
  state: string;
  codeVerifier: string;
}>({
  cookie: oauthCookie,
});

export const sessionIdStorage = createCookieSessionStorage<{
  sessionId: string;
}>({
  cookie: {
    secure: true,
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365 * 2,
    secrets: [Resource.SessionSecret.value],
  },
});

export async function validateRequest(request: Request, headers: Headers) {
  const sessionIdCookie = await sessionIdStorage.getSession(
    request.headers.get("Cookie")
  );

  const sessionId = sessionIdCookie.get("sessionId");

  if (!sessionId) {
    return { user: null, session: null };
  }

  const result = await lucia.validateSession(sessionId);

  if (result.session && result.session.fresh) {
    sessionIdCookie.set("sessionId", result.session.id);
  }

  if (!result.session) {
    sessionIdCookie.unset("sessionId");
  }

  headers.append(
    "Set-Cookie",
    await sessionIdStorage.commitSession(sessionIdCookie)
  );

  return result;
}
