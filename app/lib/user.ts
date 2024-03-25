export function getUserId() {
  const userId = window.localStorage.getItem("userId");

  if (!userId) {
    const newUserId = crypto.randomUUID();
    window.localStorage.setItem("userId", newUserId);

    return newUserId;
  }

  return userId;
}
