import { useState, useEffect } from "react";
import { api } from "../services/api";

function Favouriten() {
  const [favouriten, setFavouriten] = useState([]);
  const [ladevorgang, setLadevorgang] = useState(true);
  const [fehler, setFehler] = useState("");
  const [wirdEntfernt, setWirdEntfernt] = useState(null);

  useEffect(() => {
    let aktiv = true;

    const laden = async () => {
      try {
        const daten = await api("/favoriten");

        if (aktiv) {
          setFavouriten(daten);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Favoriten:", error);

        if (aktiv) {
          setFehler(
            "Deine Favoriten konnten nicht geladen werden. Bitte prüfe, ob du angemeldet bist."
          );
        }
      } finally {
        if (aktiv) {
          setLadevorgang(false);
        }
      }
    };

    laden();

    return () => {
      aktiv = false;
    };
  }, []);

  const entfernen = async (recipeId) => {
    setWirdEntfernt(recipeId);
    setFehler("");

    try {
      await api(`/favoriten/${recipeId}`, {
        method: "DELETE",
      });

      setFavouriten((vorherige) =>
        vorherige.filter((f) => f.recipe_id !== recipeId)
      );
    } catch (error) {
      console.error("Fehler beim Entfernen des Favoriten:", error);
      setFehler("Der Favorit konnte nicht entfernt werden.");
    } finally {
      setWirdEntfernt(null);
    }
  };

  return (
    <section id="favouriten">
      <h2>❤️ Meine Favoriten</h2>

      {fehler && <p role="alert">{fehler}</p>}

      <div id="favouriten-container">
        {ladevorgang ? (
          <p>Favoriten werden geladen... ⏳</p>
        ) : favouriten.length === 0 ? (
          !fehler && <p>Noch keine Favoriten gespeichert. 🤍</p>
        ) : (
          favouriten.map(({ recipe_id, title, image }) => (
            <div className="rezept-karte" key={recipe_id}>
              {image && <img src={image} alt={title} />}
              <h3>{title}</h3>

              <button
                className="loeschen-button"
                onClick={() => entfernen(recipe_id)}
                disabled={wirdEntfernt !== null}
              >
                {wirdEntfernt === recipe_id
                  ? "Wird entfernt..."
                  : "🗑️ Entfernen"}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default Favouriten;