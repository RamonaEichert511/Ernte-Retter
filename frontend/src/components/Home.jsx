import Hero from "./Hero";
import Icon from "./Icon";
import Botanical from "./Botanical";
import OfferCard from "./OfferCard";
export default function Home({ onSearch, market }) {
  return (
    <div className="home">
      <Hero onSearch={onSearch} />
      <section className="home-actions" aria-labelledby="action-heading">
        <h2 id="action-heading">Was möchtest du heute machen?</h2>
        <div className="action-grid">
          {[
            [
              "rezepte",
              "pot",
              "Ab in den Topf",
              "Saisonale Rezepte zum Kochen, Einmachen und Genießen.",
            ],
            [
              "wecker",
              "jar",
              "Vorräte im Blick",
              "Deine Vorratskammer mit Reifezeiten und Erinnerungen.",
            ],
            [
              "marktplatz",
              "leaf",
              "Ernte teilen",
              "Überschüsse aus dem Garten in deiner Umgebung anbieten.",
            ],
          ].map(([id, icon, title, text]) => (
            <a href={`#${id}`} className="action-card" key={id}>
              <span className="action-art">
                <Botanical />
                <Icon name={icon} />
              </span>
              <div>
                <h3>
                  {title}
                  <Icon name="arrow" />
                </h3>
                <p>{text}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
      <div className="home-lower">
        <section className="harvest-preview" aria-labelledby="harvest-heading">
          <div className="section-heading">
            <div>
              <h2 id="harvest-heading">Frisch aus den Gärten</h2>
              <p>Ernte teilen – von Gartenmenschen für Gartenmenschen.</p>
            </div>
            <a href="#marktplatz" className="text-link">
              Alle Inserate ansehen <Icon name="arrow" />
            </a>
          </div>
          {market.offers.length ? (
            <div className="offer-grid">
              {market.offers.slice(0, 2).map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  user={market.user}
                  busy={market.busy}
                  onReserve={market.reserve}
                  onCancel={market.cancel}
                  onDelete={market.remove}
                />
              ))}
            </div>
          ) : (
            <div className="empty-harvest">
              <Icon name="people" />
              <h3>Deine Ernte kann Freude machen.</h3>
              <p>
                Ein Korb zu viel? Teile dein Obst und Gemüse und lege das erste
                Inserat an.
              </p>
              <a className="mein-button" href="#marktplatz">
                Ernte anbieten <Icon name="arrow" />
              </a>
            </div>
          )}
        </section>
        <a href="#info" className="knowledge-card">
          <span className="eyebrow">
            <Icon name="book" /> EINMACH-FIBEL
          </span>
          <h2>Das kleine Wissen fürs große Einmachen</h2>
          <p>
            Tipps und kleine Helfer rund um deine Vorräte aus der Gartenküche.
          </p>
          <span className="text-link">
            Tipps entdecken <Icon name="arrow" />
          </span>
          <Botanical />
          <Icon name="jar" className="knowledge-jar" />
        </a>
      </div>
    </div>
  );
}
