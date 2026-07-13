export type Page = "upload" | "library" | "replay" | "debug";

export type AppRoute = {
  page: Page;
  replayId?: string;
};

export function routeFromHash(hash: string): AppRoute {
  const [page, encodedReplayId] = hash.replace(/^#\/?/, "").split("/");

  if (page === "library") return { page: "library" };
  if (page === "debug") return { page: "debug" };
  if (page === "replay") return { page: "replay", replayId: safelyDecode(encodedReplayId) };
  return { page: "upload" };
}

export function routeHash(route: AppRoute): string {
  if (route.page === "replay" && route.replayId) return `#/replay/${encodeURIComponent(route.replayId)}`;
  return `#/${route.page}`;
}

function safelyDecode(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
