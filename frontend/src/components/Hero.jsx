import { useState } from "react";
import Icon from "./Icon";
import Botanical from "./Botanical";
export default function Hero({ onSearch }) {
  const [query, setQuery] = useState("");
  return (
    <header className="hero">
      <div className="hero-copy">
        <Botanical className="hero-plant" />
        <div className="hero-text">
          <span className="eyebrow">VOM BEET BIS INS GLAS</span>
          <h1>Deine Ernte ist zu gut zum Wegwerfen.</h1>
          <p>Verarbeiten, haltbar machen und teilen.</p>
          <form
            className="hero-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) onSearch(query.trim());
            }}
          >
            <Icon name="search" />
            <label className="sr-only" htmlFor="harvest-search">
              Was hast du geerntet?
            </label>
            <input
              id="harvest-search"
              placeholder="Was hast du geerntet?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
            <button className="mein-button" type="submit">
              Rezepte finden <Icon name="arrow" />
            </button>
          </form>
        </div>
      </div>
      <img
        className="hero-photo"
        src="/images/garten-vorraete.png"
        alt="Selbst eingemachte Vorräte mit frischen Tomaten und Kräutern aus dem Garten"
        fetchPriority="high"
      />
    </header>
  );
}
