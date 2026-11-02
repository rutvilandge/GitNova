const apiOrigin = import.meta.env.VITE_API_URL ?? "";

export function apiUrl(path: string): string {
  return `${apiOrigin}${path}`;
}

export async function csrfHeaders(): Promise<Record<string, string>> {
  const response = await fetch(apiUrl("/api/v1/auth/csrf"), {
    credentials: "include",
  });
  if (!response.ok)
    throw new Error("Could not start a secure session. Refresh and try again.");
  const token = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")
    .slice(1)
    .join("=");
  return token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {};
}

export async function responseError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = (await response.clone().json()) as {
      error?: string;
      detail?: string;
      message?: string;
    };
    return data.error || data.detail || data.message || fallback;
  } catch {
    const text = await response.text();
    return text || fallback;
  }
}
