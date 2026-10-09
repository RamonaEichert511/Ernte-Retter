import { useState } from "react";
import RezeptKarte from "./RezeptKarte";
import RezeptDetail from "./RezeptDetail";

const apiKey = "145c901052864c1eb80be4a64878e929";

function Rezepte() {
  const [suchbegriff, setSuchbegriff] = useState("");
  const [rezepte, setRezepte] = useState([]);
  const [ladevorgang, setLadevorgang] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [offset, setOffset] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [aktuelleSuche, setAktuelleSuche] = useState("");
  const [aktuelleSucheEnglisch, setAktuelleSucheEnglisch] = useState("");
  const [ausgewähltesRezept, setAusgewähltesRezept] = useState(null);

  const uebersetzen = async (text) => {
    const url = `https://api.mymemory.translated.net/get?q=${text}&langpair=de|en`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Fehler bei der Übersetzung");
    }
    const data = await response.json();
    return data.responseData.translatedText;
  };

  const searchRecipes = async (query, neuerOffset = 0) => {
    if (!query) {
      alert("Bitte geben Sie eine Ernte ein.");
      return;
    }

    setLadevorgang(true);
    setFehler(null);

    try {
      let englisch;

      if (query !== aktuelleSuche && neuerOffset === 0) {
        englisch = await uebersetzen(query);
        setAktuelleSuche(query);
        setAktuelleSucheEnglisch(englisch);
      } else {
        englisch = aktuelleSucheEnglisch;
      }

      const response = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?query=${englisch}&includeIngredients=${englisch}&number=10&offset=${neuerOffset}&apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error("Fehler beim Laden der Rezepte");
      }

      const data = await response.json();
      const gefilterteRezepte = data.results.filter((recipe) => recipe.image);

      if (neuerOffset === 0) {
        setRezepte(gefilterteRezepte);
      } else {
        setRezepte((vorherige) => [...vorherige, ...gefilterteRezepte]);
      }

      setTotalResults(data.totalResults);
      setOffset(neuerOffset);
    } catch (error) {
      console.error(error);
      setFehler("Ups, da ging etwas beim Rezept laden schief! 😢");
    } finally {
      setLadevorgang(false);
    }
  };

  const handleSuche = () => {
    searchRecipes(suchbegriff, 0);
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      searchRecipes(suchbegriff, 0);
    }
  };

  const mehrLaden = () => {
    searchRecipes(aktuelleSuche, offset + 10);
  };

  const vorherigeLaden = () => {
    searchRecipes(aktuelleSuche, offset - 10);
  };

  return (
    <section id="rezepte">
      <h2>🥘 Ab in den Topf</h2>
      <p>Was hast du denn heute schönes geerntet? Was möchtest du heute verarbeiten?</p>

      <div className="such-bereich">
        <label htmlFor="rezept">Ernte:</label>
        <div className="such-zeile">
          <input
            type="text"
            id="rezept"
            placeholder="Ernte eingeben..."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
            onKeyPress={handleEnter}
            required
          />
          <button className="mein-button" onClick={handleSuche}>
            Suchen
          </button>
        </div>
      </div>

      <div id="rezept-container">
        {ladevorgang && <p>Rezepte werden geladen... ⏳</p>}

        {fehler && <p>{fehler}</p>}

        {!ladevorgang && !fehler && rezepte.length === 0 && (
          <p>Keine Rezepte gefunden. 😕</p>
        )}

        {!ausgewähltesRezept &&
          rezepte.map((recipe) => (
            <RezeptKarte
              key={recipe.id}
              recipe={recipe}
              onKlick={() => setAusgewähltesRezept(recipe.id)}
            />
          ))}

        {ausgewähltesRezept && (
          <RezeptDetail
            id={ausgewähltesRezept}
            apiKey={apiKey}
            onZurueck={() => setAusgewähltesRezept(null)}
          />
        )}
      </div>

      {!ausgewähltesRezept && rezepte.length > 0 && (
        <div className="pagination-buttons">
          {offset > 0 && (
            <button className="mein-button" onClick={vorherigeLaden}>
              ⬅️ Vorherige
            </button>
          )}
          {offset + 10 < totalResults && (
            <button className="mein-button" onClick={mehrLaden}>
              Mehr laden 🌿
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default Rezepte;