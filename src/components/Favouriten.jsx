import { useState, useEffect } from "react";

function Favouriten() {
  const [favouriten, setFavouriten] = useState([]);

  useEffect(() => {
    const gespeichert = JSON.parse(localStorage.getItem("favouriten") || "[]");
    setFavouriten(gespeichert);
  }, []);

  const entfernen = (id) => {
    const aktualisiert = favouriten.filter((f) => f.id !== id);
    setFavouriten(aktualisiert);
    localStorage.setItem("favouriten", JSON.stringify(aktualisiert));
  };

  return (
    <section id="favouriten">
      <h2>❤️ Meine Favouriten</h2>
      <div id="favouriten-container">
        {favouriten.length === 0 ? (
          <p>Noch keine Favouriten gespeichert. 🤍</p>
        ) : (
          favouriten.map(({ id, title, image }) => (
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

export default Favouriten;