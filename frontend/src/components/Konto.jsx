import OfferList from "./OfferList";
import "./Konto.css";

export default function Konto({ market, onChat }) {
  const user = market.user;

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

        <button
          type="button"
          className="secondary-button"
          onClick={market.logout}
          disabled={market.busy}
        >
          Abmelden
        </button>
      </header>

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