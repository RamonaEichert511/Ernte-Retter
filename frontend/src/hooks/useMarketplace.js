import { useState, useEffect } from "react";
import { api } from "../services/api";

export default function useMarketplace() {
  const [user, setUser] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refreshOffers() {
    const next = await api("/offers");
    setOffers(next);
  }
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let signedIn = null;
        try {
          signedIn = await api("/auth/me");
        } catch (e) {
          if (e.status !== 401) throw e;
        }
        const available = await api("/offers");
        if (active) {
          setUser(signedIn);
          setOffers(available);
        }
      } catch {
        if (active)
          setError(
            "Der Marktplatz ist gerade nicht erreichbar. Läuft das Backend?",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function authenticate(mode, values) {
    setBusy(true);
    setError("");
    try {
      const signedIn = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      setUser(signedIn);
      await refreshOffers();
      return signedIn;
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setOffers([]);
      await refreshOffers();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function perform(path, options) {
    setBusy(true);
    setError("");
    try {
      await api(path, options);
      await refreshOffers();
      return true;
    } catch (e) {
      setError(e.message);
      if (e.status === 401) setUser(null);
      try {
        await refreshOffers();
      } catch {
        /* Keep the last known list until retry. */
      }
      return false;
    } finally {
      setBusy(false);
    }
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
    cancel: (id) =>
      perform(`/offers/${id}/cancel-reservation`, { method: "PUT" }),
    remove: (id) => perform(`/offers/${id}`, { method: "DELETE" }),
  };
}
