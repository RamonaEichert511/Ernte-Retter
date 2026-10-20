import { useState } from "react";

export default function KontodatenForm({ market }) {
  const [name, setName] = useState(market.user.name ?? "");
  const [password, setPassword] = useState("");
  const [bestaetigung, setBestaetigung] = useState("");
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");

  function rueckmeldungLoeschen() {
    setFehler("");
    setErfolg("");
  }

  async function speichern(event) {
    event.preventDefault();

    if (market.busy) return;

    rueckmeldungLoeschen();

    const neuerName = name.trim();

    if (!neuerName) {
      setFehler("Bitte gib einen Namen ein.");
      return;
    }

    if (
      password !== "" &&
      (password.length < 8 || password.length > 128)
    ) {
      setFehler(
        "Dein neues Passwort muss zwischen 8 und 128 Zeichen lang sein.",
      );
      return;
    }

    if (password !== bestaetigung) {
      setFehler("Die beiden Passwörter stimmen nicht überein.");
      return;
    }

    const aenderungen = {};

    if (neuerName !== (market.user.name ?? "")) {
      aenderungen.name = neuerName;
    }

    if (password !== "") {
      aenderungen.password = password;
    }

    if (Object.keys(aenderungen).length === 0) {
      setFehler("Du hast noch nichts geändert.");
      return;
    }

    try {
      await market.updateAccount(aenderungen);

      setName(neuerName);
      setPassword("");
      setBestaetigung("");
      setErfolg("Profil erfolgreich aktualisiert.");
    } catch (error) {
      setFehler(
        error.message || "Dein Profil konnte nicht gespeichert werden.",
      );
    }
  }

  return (
    <form
      className="konto-profilformular"
      onSubmit={speichern}
      aria-labelledby="kontodaten-titel"
    >
      <h3 id="kontodaten-titel">Name und Passwort ändern</h3>

      <fieldset
        disabled={market.busy}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <label htmlFor="konto-name">
          Name
          <input
            id="konto-name"
            name="name"
            type="text"
            autoComplete="nickname"
            required
            maxLength={100}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              rueckmeldungLoeschen();
            }}
          />
        </label>

        <p className="form-hint" id="konto-passwort-hinweis">
          Lass die Passwortfelder leer, wenn du nur deinen Namen
          ändern möchtest.
        </p>

        <label htmlFor="konto-neues-passwort">
          Neues Passwort
          <input
            id="konto-neues-passwort"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            aria-describedby="konto-passwort-hinweis"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              rueckmeldungLoeschen();
            }}
          />
        </label>

        <label htmlFor="konto-passwort-bestaetigung">
          Neues Passwort wiederholen
          <input
            id="konto-passwort-bestaetigung"
            name="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            required={password !== ""}
            maxLength={128}
            value={bestaetigung}
            onChange={(event) => {
              setBestaetigung(event.target.value);
              rueckmeldungLoeschen();
            }}
          />
        </label>

        <div className="konto-profil-aktionen">
          <button type="submit" className="mein-button">
            {market.busy ? "Wird gespeichert …" : "Änderungen speichern"}
          </button>
        </div>
      </fieldset>

      {fehler && (
        <p className="form-error" role="alert">
          {fehler}
        </p>
      )}

      {erfolg && <p role="status">{erfolg}</p>}
    </form>
  );
}