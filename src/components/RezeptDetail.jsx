import { useState, useEffect } from "react";

function RezeptDetail({ id, apiKey, onZurueck }) {
  const [rezept, setRezept] = useState(null);
  const [ladevorgang, setLadevorgang] = useState(true);
  const [fehler, setFehler] = useState(null);
  const [istFavorit, setIstFavorit] = useState(false);

  useEffect(() => {
    const ladeDetails = async () => {
      setLadevorgang(true);
      setFehler(null);

      try {
        const response = await fetch(
          `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}`
        );

        if (!response.ok) {
          throw new Error("Fehler beim Laden der Details");
        }

        const data = await response.json();
        setRezept(data);

        const favoriten = JSON.parse(localStorage.getItem("favoriten") || "[]");
        setIstFavorit(favoriten.some((f) => f.id === id));
      } catch (error) {
        console.error(error);
        setFehler("Ups, da ging etwas schief! 😢");
      } finally {
        setLadevorgang(false);
      }
    };

    ladeDetails();
  }, [id, apiKey]);

  const toggleFavorit = () => {
    const favoriten = JSON.parse(localStorage.getItem("favoriten") || "[]");
    const index = favoriten.findIndex((f) => f.id === id);

    if (index === -1) {
      favoriten.push({ id, title: rezept.title, image: rezept.image });
      setIstFavorit(true);
    } else {
      favoriten.splice(index, 1);
      setIstFavorit(false);
    }

    localStorage.setItem("favoriten", JSON.stringify(favoriten));
  };

  if (ladevorgang) return <p>Rezept wird geladen... ⏳</p>;
  if (fehler) return <p>{fehler}</p>;
  if (!rezept) return null;

  const { title, image, extendedIngredients, instructions } = rezept;

  return (
    <div className="rezept-detail">
      <button className="mein-button" onClick={onZurueck}>
        ← Zurück
      </button>

      <img src={image} alt={title} />
      <h2>{title}</h2>

      <button className="mein-button" onClick={toggleFavorit}>
        {istFavorit ? "❤️ Gespeichert" : "🤍 Als Favorit speichern"}
      </button>

      <h3>Zutaten:</h3>
      <ul>
        {!extendedIngredients || extendedIngredients.length === 0 ? (
          <li>Keine Zutaten verfügbar.</li>
        ) : (
          extendedIngredients.map((zutat, index) => (
            <li key={index}>
              {zutat.amount} {zutat.unit} {zutat.name}
            </li>
          ))
        )}
      </ul>

      <h3>Zubereitung:</h3>
      <p dangerouslySetInnerHTML={{ __html: instructions || "Keine Anleitung verfügbar." }} />
    </div>
  );
}

export default RezeptDetail;