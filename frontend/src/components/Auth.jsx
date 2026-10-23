import { useState } from "react";
import Konto from "./Konto";

export default function Auth({ market, onChat }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [hinweis, setHinweis] = useState("");
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setHinweis("");

    try {
      await market.authenticate(mode, form);

      setForm({
        username: "",
        email: "",
        password: "",
      });

      if (mode === "register") {
        setMode("login");
        setHinweis(
          "Dein Konto wurde erstellt. Bitte bestätige zuerst deine E-Mail-Adresse über den Link in deiner E-Mail. Danach kannst du dich hier anmelden.",
        );
        return;
      }

      window.location.hash = "marktplatz";
    } catch (e) {
      setError(
        e.status === 401
          ? "E-Mail-Adresse oder Passwort ist falsch."
          : e.status
            ? e.message
            : "Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
      );
    }
  }

  if (market.loading) return <p role="status">Dein Konto wird geladen …</p>;
  if (market.user) {
    return <Konto market={market} onChat={onChat} />;
  }
  return (
    <section className="account-panel">
      <span className="eyebrow">GEMEINSAM ERNTE RETTEN</span>
      <h2>
        {mode === "login"
          ? "Schön, dass du wieder da bist."
          : "Dein Platz in der Gartenküche."}
      </h2>
      <p>Mit deinem Konto kannst du Ernte anbieten und reservieren.</p>
      <div className="auth-tabs">
        <button
          className="secondary-button"
          aria-pressed={mode === "login"}
          onClick={() => {
            setMode("login");
            setError("");
          }}
          disabled={market.busy}
        >
          Anmelden
        </button>
        <button
          className="secondary-button"
          aria-pressed={mode === "register"}
          onClick={() => {
            setMode("register");
            setError("");
          }}
          disabled={market.busy}
        >
          Konto erstellen
        </button>
      </div>
      {hinweis && (
        <p className="form-hint" role="status">
          {hinweis}
        </p>
      )}
      <form className="auth-form" onSubmit={submit}>
        <label htmlFor="account-username">
          {mode === "login" ? "E-Mail-Adresse" : "Benutzername"}
          <input
            id="account-username"
            type="text"
            name="username"
            value={form.username}
            onChange={change}
            required
            autoComplete="username"
          />
        </label>
        {mode === "register" && (
          <label htmlFor="account-email">
            E-Mail-Adresse
            <input
              id="account-email"
              type="email"
              name="email"
              value={form.email}
              onChange={change}
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
        )}

        <label htmlFor="account-password">
          Passwort
          <input
            id="account-password"
            type="password"
            name="password"
            value={form.password}
            onChange={change}
            required
            minLength={mode === "register" ? 8 : 1}
            maxLength={128}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
          />
        </label>
        {mode === "register" && (
          <p className="form-hint">Mindestens 8 Zeichen.</p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="mein-button" type="submit" disabled={market.busy}>
          {market.busy
            ? "Einen Moment …"
            : mode === "login"
              ? "Anmelden"
              : "Konto erstellen"}
        </button>
      </form>
    </section>
  );
}
