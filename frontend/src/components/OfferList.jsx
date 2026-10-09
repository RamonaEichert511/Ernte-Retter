import OfferCard from "./OfferCard";
export default function OfferList({ offers, ...actions }) {
  if (!offers.length)
    return (
      <p className="market-empty">
        Hier gibt es noch keine passenden Inserate. Biete deine erste Ernte an!
      </p>
    );
  return (
    <div className="offer-grid">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} {...actions} />
      ))}
    </div>
  );
}
