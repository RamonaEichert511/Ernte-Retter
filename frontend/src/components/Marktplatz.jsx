import { useState, useEffect, useRef } from "react";
import CreateOfferForm from "./CreateOfferForm";
import OfferList from "./OfferList";
import "./Marktplatz.css";
export default function Marktplatz({ market, onChat }) {
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const dialogRef = useRef(null);

const [linkedOfferId, setLinkedOfferId] = useState(() =>
  new URLSearchParams(window.location.search).get("offer"),
);

const linkedOffer = linkedOfferId
  ? market.offers.find(
      (offer) => String(offer.id) === linkedOfferId,
    )
  : null;

useEffect(() => {
  // URL-Parameter frisch auslesen (fängt auch direkte Einstiege ab)
  const params = new URLSearchParams(window.location.search);
  const offerId = params.get("offer");

  // Erst feuern, wenn der Ladezustand fertig ist und Angebote da sind
  if (!market.loading && offerId && market.offers?.length > 0) {
    const found = market.offers.find((o) => String(o.id) === String(offerId));
    
    // Nur öffnen, wenn das Modal nicht schon offen ist
    if (found && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }
}, [market.loading, market.offers]);


function closeLinkedOffer() {
  dialogRef.current?.close();
  setLinkedOfferId(null);

  const url = new URL(window.location.href);
  url.searchParams.delete("offer");

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}
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
          onChat={onChat}
          onReserve={(id) =>
            action(
              () => market.reserve(id),
              "Die Ernte ist für dich reserviert. Über den Kontakt kannst du die Abholung vereinbaren.",
            )
          }
          onWithdraw={(id) =>
            action(() => market.withdraw(id), "Deine Reservierung wurde aufgehoben.")
          }
          onDelete={(id) =>
            action(() => market.remove(id), "Dein Inserat wurde gelöscht.")
          }
        />
      )}
    </section>
  );
}
