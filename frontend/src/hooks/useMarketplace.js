import { useState, useEffect } from "react";
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

async function authenticate(mode, values) {
  setBusy(true);
  setError("");

  const credentials = {
    name: values.name.trim(),
    email: (values.email || "").trim(),
    password: values.password,
  };

  try {
    if (mode === "register") {
      const emailValue = credentials.email || credentials.name;
      await api("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: credentials.name || credentials.name || emailValue.split("@")[0],
          email: emailValue,
          password: credentials.password,
        }),
      });
    }
const params = new URLSearchParams();

params.append("name", credentials.email || credentials.name);
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

    const me = await api("/me");
    setUser(me);

    return me;
  } finally {
    setBusy(false);
  }
}

function logout() {
  clearToken();
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
    refresh: () => perform("/offers", { method: "GET" }),
    create: (values) =>
      perform("/offers", { method: "POST", body: JSON.stringify(values) }),
    reserve: (id) => perform(`/offers/${id}/reserve`, { method: "PUT" }),
    withdraw: (id) => perform(`/offers/${id}/reserve`, { method: "DELETE" }),
    remove: (id) => perform(`/offers/${id}`, { method: "DELETE" }),
  };
}
