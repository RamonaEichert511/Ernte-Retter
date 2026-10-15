const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "ernte-retter-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();

  const protectedRequest =
    path === "/me" ||
    path === "/aufgaben" ||
    path.startsWith("/aufgaben/") ||
    (path === "/offers" &&
      options.method?.toUpperCase() === "POST") ||
    /^\/offers\/[^/]+(?:\/reserve)?$/.test(path);

  if (token && protectedRequest) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body instanceof URLSearchParams) {
    headers.set(
      "Content-Type",
      "application/x-www-form-urlencoded",
    );
  } else if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("ernte-retter:unauthorized"));
    window.location.hash = "konto";
  }

  if (!response.ok) {
    let data;

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    const error = new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Bitte prüfe deine Angaben und versuche es erneut.",
    );

    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}
