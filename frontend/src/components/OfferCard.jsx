export default function OfferCard({
  offer,
  user,
  busy,
  onReserve,
  onCancel,
  onDelete,
}) {
  const reserved = offer.status === "reserved";
  const own = user?.id === offer.owner_id;
  const myReservation = reserved && user?.id === offer.reserved_by;
  return (
    <article className="offer-card">
      <span className={`offer-status ${reserved ? "is-reserved" : ""}`}>
        {reserved ? "Reserviert" : "Verfügbar"}
      </span>
      {own && <span className="owner-badge">Dein Inserat</span>}
      <h3>{offer.title}</h3>
      <dl>
        <div>
          <dt>Menge</dt>
          <dd>{offer.quantity}</dd>
        </div>
        <div>
          <dt>Abholort</dt>
          <dd>{offer.location}</dd>
        </div>
        {offer.contact && (
          <div>
            <dt>Kontakt</dt>
            <dd>{offer.contact}</dd>
          </div>
        )}
      </dl>
      {offer.description && (
        <p className="offer-description">{offer.description}</p>
      )}
      <div className="offer-actions">
        {own ? (
          <button
            className="loeschen-button"
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  reserved
                    ? "Für diese Ernte gibt es bereits eine Reservierung. Trotzdem löschen?"
                    : "Möchtest du dein Inserat wirklich löschen?",
                )
              )
                onDelete(offer.id);
            }}
          >
            Inserat löschen
          </button>
        ) : myReservation ? (
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => onCancel(offer.id)}
          >
            Reservierung zurückziehen
          </button>
        ) : !reserved ? (
          user ? (
            <button
              className="mein-button"
              type="button"
              disabled={busy}
              onClick={() => onReserve(offer.id)}
            >
              Reservieren
            </button>
          ) : (
            <a className="mein-button" href="#konto">
              Zum Reservieren anmelden
            </a>
          )
        ) : (
          <span className="form-hint">Bereits reserviert</span>
        )}
      </div>
    </article>
  );
}
