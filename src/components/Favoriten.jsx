import { useState, useEffect } from "react";

function Favoriten() {
  const [favoriten, setFavoriten] = useState([]);

  useEffect(() => {
    const gespeichert = JSON.parse(localStorage.getItem("favoriten") || "[]");
    setFavoriten(gespeichert);
  }, []);

  const entfernen = (id) => {
    const aktualisiert = favoriten.filter((f) => f.id !== id);
    setFavoriten(aktualisiert);
    localStorage.setItem("favoriten", JSON.stringify(aktualisiert));
  };

  return (
    <section id="favoriten">
      <h2>❤️ Meine Favoriten</h2>
      <div id="favoriten-container">
        {favoriten.length === 0 ? (
          <p>Noch keine Favoriten gespeichert. 🤍</p>
        ) : (
          favoriten.map(({ id, title, image }) => (
            <div className="rezept-karte" key={id}>
              <img src={image} alt={title} />
              <h3>{title}</h3>
              <button className="loeschen-button" onClick={() => entfernen(id)}>
                🗑️ Entfernen
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default Favoriten;