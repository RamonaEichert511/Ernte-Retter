import { useState } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import CreateOfferForm from "./CreateOfferForm";
import OfferList from "./OfferList";
import "./Marktplatz.css";

export default function Marktplatz() {
  // Erste Frontend-Version: Speicherung nur in diesem Browser.
  // Diese beiden Aktionen später mit POST/PATCH an FastAPI verbinden.
  const [offers, setOffers] = useLocalStorage("ernte-retter-offers", []);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");

  function createOffer(values) {
    setOffers((current) => [{ ...values, id: crypto.randomUUID(), status: "available" }, ...current]);
    setMessage(`Dein Inserat „${values.title}“ wurde erstellt.`);
  }
  function reserveOffer(id) {
    setOffers((current) => current.map((offer) =>
      offer.id === id ? { ...offer, status: "reserved" } : offer
    ));
    setMessage("Das Inserat ist jetzt reserviert. Bitte vereinbare die Abholung über den angegebenen Kontakt.");
  }
  const visibleOffers = offers.filter((offer) => filter === "all" || offer.status === filter);

  return (
    <section id="marktplatz" aria-labelledby="market-heading">
      <h2 id="market-heading">🥕 Ernte teilen</h2>
      <p>Zu viel geerntet? Biete Obst und Gemüse zur Abholung an.</p>
      <p className="market-note">Lokale Übungsversion: Inserate und Reservierungen werden nur in diesem Browser gespeichert und sind noch nicht für andere sichtbar.</p>
      <CreateOfferForm onCreate={createOffer} />
      <div className="market-filter">
        <label htmlFor="offer-filter">Inserate anzeigen</label>
        <select id="offer-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">Alle Inserate</option>
          <option value="available">Verfügbar</option>
          <option value="reserved">Reserviert</option>
        </select>
      </div>
      <div role="status" className="market-message">{message}</div>
      <OfferList offers={visibleOffers} onReserve={reserveOffer} />
    </section>
  );
}
