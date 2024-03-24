import { Replicache } from "replicache";

export function getUserId() {
  const userId = window.localStorage.getItem("userId");

  if (!userId) {
    const generatedId = crypto.randomUUID();
    window.localStorage.setItem("userId", generatedId);
    return generatedId;
  }

  return userId;
}

export function getUserReplicache({
  userId,
  replicacheLicenseKey,
}: {
  userId: string;
  replicacheLicenseKey: string;
}) {
  const replicache = new Replicache({
    logLevel: "debug",
    pullURL: "/resources/pull",
    name: userId,
    licenseKey: replicacheLicenseKey,
  });

  return replicache;
}
