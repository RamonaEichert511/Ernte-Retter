function WeckerListe({ vorratsListe, sortierung, onLoeschen }) {
  if (vorratsListe.length === 0) {
    return null;
  }

  const sortiert = [...vorratsListe].sort((a, b) => {
    if (sortierung === "name") {
      return a.produkt.localeCompare(b.produkt);
    } else {
      return new Date(a.fertigAm) - new Date(b.fertigAm);
    }
  });

  return (
    <ul className="wecker-liste">
      {sortiert.map((eintrag, index) => {
        const einlegedatumFormatiert = new Date(eintrag.einlegedatum).toLocaleDateString("de-DE");
        const fertig = new Date(eintrag.fertigAm);
        const heute = new Date();
        const tageUebrig = Math.ceil((fertig - heute) / (1000 * 60 * 60 * 24));

        return (
          <li key={index}>
            <span>{eintrag.produkt}</span>
            <span>Einlegedatum: {einlegedatumFormatiert}</span>
            <span>{tageUebrig <= 0 ? "✅ fertig!" : `🫙 noch ${tageUebrig} Tage`}</span>
            <button className="loeschen-button" onClick={() => onLoeschen(index)}>
              🍽️ Aufgegessen
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default WeckerListe;