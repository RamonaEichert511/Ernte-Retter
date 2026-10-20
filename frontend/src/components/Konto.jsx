import { useState } from "react";
import OfferList from "./OfferList";
import "./Konto.css";
import KontodatenForm from "./KontodatenForm";

export default function Konto({ market, onChat }) {
  const user = market.user;
  const [profilBearbeiten, setProfilBearbeiten] = useState(false);
  const [profilFehler, setProfilFehler] = useState("");
  const [profilMeldung, setProfilMeldung] = useState("");

  const [profilForm, setProfilForm] = useState({
    wohnort: user.wohnort ?? "",
    plz: user.plz ?? "",
    ueber_mich: user.ueber_mich ?? "",
  });

  function profilOeffnen() {
    setProfilFehler("");
    setProfilMeldung("");

    setProfilForm({
      wohnort: user.wohnort ?? "",
      plz: user.plz ?? "",
      ueber_mich: user.ueber_mich ?? "",
    });

    setProfilBearbeiten(true);
  }

  function profilAendern(event) {
    const { name, value } = event.target;

    setProfilForm((bisher) => ({
      ...bisher,
      [name]: value,
    }));
  }
  async function profilSpeichern(event) {
    event.preventDefault();

    if (market.busy) return;

    setProfilFehler("");
    setProfilMeldung("");

    try {
      await market.updateProfile(profilForm);

      setProfilBearbeiten(false);
      setProfilMeldung("Dein Profil wurde gespeichert.");
    } catch (error) {
      setProfilFehler(
        error.status === 401
          ? "Bitte melde dich erneut an."
          : error.message || "Dein Profil konnte nicht gespeichert werden.",
      );
    }
  }  
  const eigeneInserate = market.offers.filter(
    (offer) => offer.owner_id === user.id,
  );

  const meineReservierungen = market.offers.filter(
    (offer) =>
      offer.reserved_by === user.id &&
      offer.status === "reserved",
  );

  const initialen = (user.name || "")
    .trim()
    .split(/\s+/)
    .map((teil) => Array.from(teil)[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const actions = {
    user,
    busy: market.busy,
    onReserve: market.reserve,
    onWithdraw: market.withdraw,
    onDelete: market.remove,
    onChat,
  };

  return (
    <section className="konto">
      <header className="konto-profil">
        <div className="konto-avatar" aria-hidden="true">
          {initialen}
        </div>

        <div className="konto-begruessung">
          <span className="eyebrow">MEIN KONTO</span>
          <h2>Hallo, {user.name}!</h2>
          <p>Dein Platz zum Teilen und Ernte retten.</p>
        </div>

        <div className="konto-profil-aktionen">
          <button
            type="button"
            className="secondary-button"
            onClick={profilOeffnen}
            disabled={market.busy || profilBearbeiten}
            aria-expanded={profilBearbeiten}
            aria-controls="konto-profilformular"
          >
            Profil bearbeiten
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={market.logout}
            disabled={market.busy}
          >
            Abmelden
          </button>
        </div>
      </header>
      {profilMeldung && (
        <p className="form-hint" role="status">
          {profilMeldung}
        </p>
      )}
    {profilBearbeiten && (
      <>
        <KontodatenForm market={market} />
        
        <form
          id="konto-profilformular"
          className="konto-profilformular"          
          aria-labelledby="konto-profilformular-titel"
          onSubmit={profilSpeichern}
        >
          <div>
            <h3 id="konto-profilformular-titel">
              Dein öffentliches Profil
            </h3>

            <p className="form-hint" id="konto-profil-hinweis">
              Diese Angaben sind freiwillig und werden in deinem
              öffentlichen Profil angezeigt. Bitte trage keine
              genaue Adresse ein.
            </p>
          </div>

          <div className="konto-ort-felder">
            <label htmlFor="konto-plz">
              Postleitzahl
              <input
                id="konto-plz"
                name="plz"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="[0-9]{5}"
                maxLength={5}
                placeholder="z. B. 23845"
                value={profilForm.plz}
                onChange={profilAendern}
                aria-describedby="konto-profil-hinweis"
                disabled={market.busy}
              />
            </label>

            <label htmlFor="konto-wohnort">
              Wohnort
              <input
                id="konto-wohnort"
                name="wohnort"
                type="text"
                autoComplete="address-level2"
                maxLength={100}
                placeholder="z. B. Itzstedt"
                value={profilForm.wohnort}
                onChange={profilAendern}
                aria-describedby="konto-profil-hinweis"
                disabled={market.busy}
              />
            </label>
          </div>

          <label htmlFor="konto-ueber-mich">
            Über mich
            <textarea
              id="konto-ueber-mich"
              name="ueber_mich"
              rows={5}
              maxLength={1000}
              placeholder="Was wächst bei dir? Was teilst oder tauschst du gerne?"
              value={profilForm.ueber_mich}
              onChange={profilAendern}
              aria-describedby="konto-profil-hinweis konto-textlaenge"
              disabled={market.busy}
            />
          </label>

          <span id="konto-textlaenge" className="konto-textlaenge">
            {profilForm.ueber_mich.length} / 1.000 Zeichen
          </span>

          {profilFehler && (
            <p className="form-error" role="alert">
              {profilFehler}
            </p>
          )}

          <div className="konto-profil-aktionen">
            <button
              type="submit"
              className="mein-button"
              disabled={market.busy}
            >
              {market.busy ? "Wird gespeichert …" : "Speichern"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setProfilBearbeiten(false)}
              disabled={market.busy}
            >
              Abbrechen
            </button>
          </div>
        </form>
      </>
    )}

      <div className="konto-zahlen">
        <a
          href="#konto"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById("konto-inserate")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
        >
          <strong>{eigeneInserate.length}</strong>
          <span>Eigene Inserate</span>
        </a>

        <a
          href="#konto"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById("konto-reservierungen")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
        >
          <strong>{meineReservierungen.length}</strong>
          <span>Meine Reservierungen</span>
        </a>
      </div>

      {market.error && (
        <p className="form-error" role="alert">
          {market.error}
        </p>
      )}

      <section
        id="konto-inserate"
        className="konto-bereich"
        aria-labelledby="konto-inserate-titel"
      >
        <div className="konto-bereich-kopf">
          <h3 id="konto-inserate-titel">Meine Inserate</h3>
          <a className="secondary-button" href="#marktplatz">
            Ernte anbieten
          </a>
        </div>

        {eigeneInserate.length > 0 ? (
          <OfferList offers={eigeneInserate} {...actions} />
        ) : (
          <p className="konto-leer">
            Noch keine Ernte angeboten? Dein erster Überschuss
            findet bestimmt ein neues Zuhause.
          </p>
        )}
      </section>

      <section
        id="konto-reservierungen"
        className="konto-bereich"
        aria-labelledby="konto-reservierungen-titel"
      >
        <h3 id="konto-reservierungen-titel">
          Meine Reservierungen
        </h3>

        {meineReservierungen.length > 0 ? (
          <OfferList offers={meineReservierungen} {...actions} />
        ) : (
          <p className="konto-leer">
            Du hast aktuell keine Ernte reserviert.
          </p>
        )}
      </section>
    </section>
  );
}