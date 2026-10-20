import { useState, useEffect, useCallback } from "react";
import {
  api,
  getToken,
  saveToken,
  clearToken,
} from "../services/api";

export default function useMarketplace() {
  const [user, setUser] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  
  function normalizeOffers(list) {
    return list.map((offer) => ({
      ...offer,
      status:
        offer.status === "reserviert"
          ? "reserved"
          : offer.status === "verfügbar"
            ? "available"
            : offer.status,
    }));
  }

async function refreshOffers() {
  const next = await api("/offers");
  setOffers(normalizeOffers(next));
}
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const next = await api("/offers", {
        cache: "no-store",
      });

      setOffers(normalizeOffers(next));
      return true;
    } catch {
      setError(
        "Die Inserate konnten nicht aktualisiert werden. Bitte versuche es erneut.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
useEffect(() => {
  let active = true;

  function handleUnauthorized() {
    if (active) {
      setUser(null);
      setError("Bitte melde dich an.");
    }
  }

  window.addEventListener(
    "ernte-retter:unauthorized",
    handleUnauthorized,
  );

  async function load() {
    try {
      const available = await api("/offers");

      if (active) {
        setOffers(normalizeOffers(available));
      }
    } catch {
      if (active) {
        setError(
          "Der Marktplatz ist gerade nicht erreichbar. Läuft das Backend?",
        );
      }
    }

    if (active && getToken()) {
      try {
        const me = await api("/me");

        if (active) {
          setUser(me);
        }
      } catch (e) {
        if (active && e.status !== 401) {
          setError("Dein Konto konnte nicht geladen werden.");
        }
      }
    }

    if (active) {
      setLoading(false);
    }
  }

  load();

  return () => {
    active = false;
    window.removeEventListener(
      "ernte-retter:unauthorized",
      handleUnauthorized,
    );
  };
}, []);
useEffect(() => {
  if (!user?.id) return;

  const activityKey = "ernte-retter-last-activity";
  const idleLimit = 60 * 60 * 1000;
  const events = ["pointerdown", "keydown", "scroll", "touchstart"];

  let ended = false;
  let lastSaved = 0;

  // Bei bereits bestehender Anmeldung einmalig initialisieren.
  if (!localStorage.getItem(activityKey)) {
    localStorage.setItem(activityKey, String(Date.now()));
  }

  function endSession() {
    if (ended) return;
    ended = true;

    clearToken();
    localStorage.removeItem(activityKey);
    setUser(null);
    setError(
      "Du wurdest nach 60 Minuten Inaktivität abgemeldet. Bitte melde dich erneut an.",
    );
    window.location.hash = "konto";
  }

  function checkSession() {
    if (ended) return false;

    // Berücksichtigt auch eine Abmeldung in einem anderen Tab.
    if (!getToken()) {
      endSession();
      return false;
    }

    const lastActivity = Number(localStorage.getItem(activityKey));

    if (
      !Number.isFinite(lastActivity) ||
      lastActivity <= 0 ||
      Date.now() - lastActivity >= idleLimit
    ) {
      endSession();
      return false;
    }

    return true;
  }

  function recordActivity(event) {
    // Nur echte Bedienung zählt als Aktivität.
    if (!event.isTrusted || !checkSession()) return;

    const now = Date.now();

    // Scrollen und Tippen erzeugen viele Ereignisse:
    // höchstens einmal pro Sekunde speichern.
    if (now - lastSaved < 1000) return;

    lastSaved = now;
    localStorage.setItem(activityKey, String(now));
  }

  function handleVisibility() {
    if (document.visibilityState === "visible") {
      checkSession();
    }
  }

  events.forEach((event) => {
    window.addEventListener(event, recordActivity, {
      passive: true,
      capture: true,
    });
  });

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", checkSession);
  window.addEventListener("storage", checkSession);

  checkSession();

  const interval = window.setInterval(checkSession, 1000);

  return () => {
    window.clearInterval(interval);

    events.forEach((event) => {
      window.removeEventListener(event, recordActivity, true);
    });

    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("focus", checkSession);
    window.removeEventListener("storage", checkSession);
  };
}, [user?.id]);

async function authenticate(mode, values) {
  setBusy(true);
  setError("");

  const credentials = {
    username: values.username.trim(),
    email: (values.email || "").trim(),
    password: values.password,
  };

  try {
    if (mode === "register") {
      const emailValue = credentials.email || credentials.username;
      await api("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: credentials.name || credentials.username || emailValue.split("@")[0],
          email: emailValue,
          password: credentials.password,
        }),
      });
    }
const params = new URLSearchParams();

params.append("username", credentials.email || credentials.username);
params.append("password", credentials.password);

const result = await api("/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: params,
});

    if (!result.access_token) {
      throw new Error("Die Anmeldung hat keinen Token zurückgegeben.");
    }

    saveToken(result.access_token);
    localStorage.setItem(
      "ernte-retter-last-activity",
      String(Date.now()),
    );

    const me = await api("/me");
    setUser(me);

    return me;
  } finally {
    setBusy(false);
  }
}
async function updateAccount(values) {
  if (!getToken()) {
    throw new Error("Bitte melde dich erneut an.");
  }

  setBusy(true);

  try {
    await api("/me", {
      method: "PUT",
      body: JSON.stringify(values),
    });

    // Den Namen sofort im gemeinsamen User-State aktualisieren.
    // Das Passwort wird dort nicht gespeichert.
    if (values.name !== undefined) {
      setUser((bisher) =>
        bisher
          ? { ...bisher, name: values.name }
          : bisher,
      );

      // Auch den Namen bei bereits geladenen eigenen Inseraten ändern.
      setOffers((bisher) =>
        bisher.map((offer) =>
          offer.owner_id === user.id
            ? { ...offer, owner_name: values.name }
            : offer,
        ),
      );
    }
  } finally {
    setBusy(false);
  }
}

function logout() {
  clearToken();
  localStorage.removeItem("ernte-retter-last-activity");
  setUser(null);
  setError("");
  window.location.hash = "konto";
}

 async function perform(path, options) {
  const protectedAction = ["POST", "PUT", "DELETE"].includes(
    options.method?.toUpperCase(),
  );

  if (protectedAction && !getToken()) {
    setUser(null);
    window.location.hash = "konto";
    return false;
  }

  setBusy(true);
  setError("");

  try {
    await api(path, options);
  } catch (e) {
    setError(
      e.status === 401
        ? "Bitte melde dich erneut an."
        : e.message,
    );
    return false;
  } finally {
    setBusy(false);
  }

  try {
    await refreshOffers();
  } catch {
    setError(
      "Die Aktion war erfolgreich, aber die Inserate konnten nicht aktualisiert werden.",
    );
  }

  return true;
}

  return {
    user,
    offers,
    loading,
    busy,
    error,
    authenticate,
    logout,
    refresh,
    updateAccount,
    create: (values) =>
      perform("/offers", { method: "POST", body: JSON.stringify(values) }),
    reserve: (id) => perform(`/offers/${id}/reserve`, { method: "PUT" }),
    withdraw: (id) => perform(`/offers/${id}/reserve`, { method: "DELETE" }),
    remove: (id) => perform(`/offers/${id}`, { method: "DELETE" }),
  };
}
