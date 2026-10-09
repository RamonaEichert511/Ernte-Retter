import { useState } from "react";
import CreateOfferForm from "./CreateOfferForm";
import OfferList from "./OfferList";
import "./Marktplatz.css";
export default function Marktplatz({ market }) {
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  async function action(operation, text) {
    setMessage("");
    const success = await operation();
    if (success) setMessage(text);
    return success;
  }
  const visibleOffers = market.offers.filter(
    (offer) =>
      filter === "all" ||
      (filter === "mine"
        ? offer.owner_id === market.user?.id
        : filter === "my-reservations"
          ? offer.reserved_by === market.user?.id
          : offer.status === filter),
  );
  return (
    <section id="marktplatz" aria-labelledby="market-heading">
      <h2 id="market-heading">Ernte teilen</h2>
      <p>Zu viel geerntet? Biete Obst und Gemüse zur Abholung an.</p>
      {market.loading ? (
        <p role="status">Die Inserate werden geladen …</p>
      ) : market.user ? (
        <>
          <div className="market-account">
            <span>
              Angemeldet als <strong>{market.user.name}</strong>
            </span>
            <a href="#konto">Mein Konto</a>
          </div>
          <CreateOfferForm
            disabled={market.busy}
            onCreate={(values) =>
              action(
                () => market.create(values),
                "Dein Inserat wurde erstellt.",
              )
            }
          />
        </>
      ) : (
        <div className="market-note">
          <p>
            Schau dich gern um. Zum Anbieten oder Reservieren melde dich bitte
            an.
          </p>
          <a className="mein-button" href="#konto">
            Anmelden oder Konto erstellen
          </a>
        </div>
      )}
      <div className="market-filter">
        <label htmlFor="offer-filter">Inserate anzeigen</label>
        <select
          id="offer-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Alle Inserate</option>
          <option value="available">Verfügbar</option>
          <option value="reserved">Reserviert</option>
          {market.user && (
            <>
              <option value="mine">Meine Inserate</option>
              <option value="my-reservations">Meine Reservierungen</option>
            </>
          )}
        </select>
        <button
          className="secondary-button"
          disabled={market.busy || market.loading}
          onClick={() =>
            action(market.refresh, "Die Inserate sind aktualisiert.")
          }
        >
          Aktualisieren
        </button>
      </div>
      <p className="market-message" role="status">
        {message}
      </p>
      {!market.loading && (
        <OfferList
          offers={visibleOffers}
          user={market.user}
          busy={market.busy}
          onReserve={(id) =>
            action(
              () => market.reserve(id),
              "Die Ernte ist für dich reserviert. Über den Kontakt kannst du die Abholung vereinbaren.",
            )
          }
          onCancel={(id) =>
            action(
              () => market.cancel(id),
              "Deine Reservierung wurde zurückgezogen. Die Ernte ist wieder verfügbar.",
            )
          }
          onDelete={(id) =>
            action(() => market.remove(id), "Dein Inserat wurde gelöscht.")
          }
        />
      )}
    </section>
  );
}
