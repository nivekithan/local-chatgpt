import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { validateRequest } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = new Headers();
  const { user } = await validateRequest(request, headers);

  if (user) {
    return redirect("/", { headers });
  }

  return null;
}

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center">
      <Card>
        <CardHeader>
          <CardTitle>Local ChatGPT</CardTitle>
          <CardDescription>Signin with google</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-[256px]">
            <Link to="/resources/signin">Sign In with Google</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
