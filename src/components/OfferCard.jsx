export default function OfferCard({ offer, onReserve }) {
  const reserved = offer.status === "reserved";
  return (
    <article className="offer-card">
      <span className={`offer-status ${reserved ? "is-reserved" : ""}`}>
        {reserved ? "Reserviert" : "Verfügbar"}
      </span>
      <h3>{offer.title}</h3>
      <dl>
        <div><dt>Menge</dt><dd>{offer.quantity}</dd></div>
        <div><dt>Abholort</dt><dd>{offer.location}</dd></div>
        <div><dt>Kontakt</dt><dd>{offer.contact}</dd></div>
      </dl>
      {offer.description && <p className="offer-description">{offer.description}</p>}
      <button className="mein-button" type="button" disabled={reserved}
        aria-label={reserved ? `${offer.title} ist reserviert` : `${offer.title} reservieren`}
        onClick={() => onReserve(offer.id)}>
        {reserved ? "Bereits reserviert" : "Reservieren"}
      </button>
    </article>
  );
}
