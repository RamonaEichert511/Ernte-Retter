import { useState } from "react";

function Rezepte() {
  const [suchbegriff, setSuchbegriff] = useState("");
  const [hinweis, setHinweis] = useState("");

  const handleSuche = (event) => {
    event.preventDefault();

    if (!suchbegriff.trim()) {
      setHinweis("Bitte gib eine Ernte ein.");
      return;
    }

    // Hier später die Suche über die eigene Backend-API einfügen.
    setHinweis(
      "Unsere Rezeptsuche wird gerade vorbereitet. Bald findest du hier Rezepte aus unserer eigenen Sammlung."
    );
  };

  return (
    <section id="rezepte">
      <h2>🥘 Ab in den Topf</h2>
      <p>
        Was hast du denn heute Schönes geerntet?
        Was möchtest du heute verarbeiten?
      </p>

      <form className="such-bereich" onSubmit={handleSuche}>
        <label htmlFor="rezept">Ernte:</label>

        <div className="such-zeile">
          <input
            type="text"
            id="rezept"
            placeholder="Ernte eingeben..."
            value={suchbegriff}
            onChange={(event) => setSuchbegriff(event.target.value)}
            required
          />

          <button className="mein-button" type="submit">
            Suchen
          </button>
        </div>
      </form>

      <div id="rezept-container" aria-live="polite">
        <p>
          {hinweis ||
            "Hier entsteht unsere Rezeptsuche für die eigene Rezeptsammlung. 🌿"}
        </p>
      </div>
    </section>
  );
}

export default Rezepte;