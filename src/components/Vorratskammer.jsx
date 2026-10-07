import { useState, useEffect } from "react";
import WeckerListe from "./WeckerListe";

const reifezeiten = {
  "saure gurken": 42,
  kimchi: 5,
  sauerkraut: 21,
  essiggurken: 28,
  marmelade: 1,
  "eingelegte paprika": 10,
  "fermentierte tomaten": 7,
  pickles: 14,
  apfelmus: 0,
  rotkohl: 2,
  "salz zitronen": 90,
  "eingelegte zwiebeln": 14,
};

function Vorratskammer() {
  const [produkt, setProdukt] = useState("");
  const [einlegedatum, setEinlegedatum] = useState("");
  const [meldung, setMeldung] = useState(null);
  const [vorratsListe, setVorratsListe] = useState([]);
  const [sortierung, setSortierung] = useState("name");

  useEffect(() => {
    const gespeichert = JSON.parse(localStorage.getItem("wecker") || "[]");
    setVorratsListe(gespeichert);
  }, []);

  const weckerStarten = () => {
    const produktKlein = produkt.toLowerCase().trim();

    if (!produktKlein || !einlegedatum) {
      alert("Bitte Produkt und Einlegedatum eingeben.");
      return;
    }

    const tage = reifezeiten[produktKlein];

    if (!tage) {
      setMeldung({
        text: `❓ Für "${produktKlein}" haben wir leider keine Reifezeit. Versuch es mit: ${Object.keys(reifezeiten).join(", ")}`,
        typ: "warten",
      });
      return;
    }

    const einlegeDatumObjekt = new Date(einlegedatum);
    const einlegedatumFormatiert = einlegeDatumObjekt.toLocaleDateString("de-DE");
    const fertigAm = new Date(einlegedatum);
    fertigAm.setDate(fertigAm.getDate() + tage);

    const heute = new Date();
    const tageUebrig = Math.ceil((fertigAm - heute) / (1000 * 60 * 60 * 24));

    if (tageUebrig <= 0) {
      setMeldung({
        text: `🎉 Dein ${produktKlein} (Einlegedatum: ${einlegedatumFormatiert}) ist jetzt perfekt durchgezogen. Guten Appetit!`,
        typ: "fertig",
      });
    } else {
      setMeldung({
        text: `⏳ Noch ${tageUebrig} Tage bis zum perfekten Aroma. Bitte noch ungeöffnet und dunkel lagern!`,
        typ: "warten",
      });
    }

    const neuerEintrag = {
      produkt: produktKlein,
      einlegedatum,
      fertigAm: fertigAm.toISOString(),
    };

    const aktualisiert = [...vorratsListe, neuerEintrag];
    setVorratsListe(aktualisiert);
    localStorage.setItem("wecker", JSON.stringify(aktualisiert));

    setProdukt("");
    setEinlegedatum("");
  };

  const eintragLoeschen = (index) => {
    const aktualisiert = vorratsListe.filter((_, i) => i !== index);
    setVorratsListe(aktualisiert);
    localStorage.setItem("wecker", JSON.stringify(aktualisiert));
  };

  return (
    <section id="wecker">
      <h2>🫙 Meine Vorratskammer</h2>
      <p>
        Hier findest du eine Übersicht deiner eingelegten Vorräte und wie lange sie noch
        brauchen bis sie perfekt schmecken.
      </p>

      <ul className="wecker-produkte">
        <li>
          <strong>In unserem Wecker stehen dir für folgende Produkte die Reifezeiten zur Verfügung:</strong>
          <br />
          Saure Gurken, Kimchi, Sauerkraut, Essiggurken, Marmelade, Eingelegte Paprika,
          Fermentierte Tomaten, Pickles, Apfelmus, Rotkohl, Salz Zitronen, Eingelegte Zwiebeln.
        </li>
      </ul>

      <div className="wecker-formular">
        <label htmlFor="produkt">Was hast du eingelegt?</label>
        <input
          type="text"
          id="produkt"
          placeholder="z.B. Saure Gurken, Kimchi..."
          value={produkt}
          onChange={(e) => setProdukt(e.target.value)}
        />
        <label htmlFor="einlegedatum">Einlegedatum:</label>
        <input
          type="date"
          id="einlegedatum"
          value={einlegedatum}
          onChange={(e) => setEinlegedatum(e.target.value)}
        />
        <button className="mein-button" onClick={weckerStarten}>
          Wecker starten
        </button>
      </div>

      {meldung && (
        <div className={`wecker-meldung wecker-${meldung.typ}`}>{meldung.text}</div>
      )}

      <div id="sortier-buttons">
        <button className="mein-button" onClick={() => setSortierung("name")}>
          A-Z
        </button>
        <button className="mein-button" onClick={() => setSortierung("fertig")}>
          Reif zuerst
        </button>
      </div>

      <WeckerListe
        vorratsListe={vorratsListe}
        sortierung={sortierung}
        onLoeschen={eintragLoeschen}
      />
    </section>
  );
}

export default Vorratskammer;