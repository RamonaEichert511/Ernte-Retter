function RezeptDetail({ onZurueck }) {
  return (
    <div className="rezept-detail">
      <button className="mein-button" onClick={onZurueck}>
        ← Zurück
      </button>

      <h2>Rezeptdetails</h2>
      <p>
        Hier findest du demnächst die Rezepte aus unserer eigenen Datenbank.
      </p>
    </div>
  );
}

export default RezeptDetail;