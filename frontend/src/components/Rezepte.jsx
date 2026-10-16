import { useEffect, useState } from "react";
import { api } from "../services/api";
import RezeptKarte from "./RezeptKarte";
import RezeptDetail from "./RezeptDetail";

function Rezepte({ searchRequest }) {
  const [rezepte, setRezepte] = useState([]);
  const [suchbegriff, setSuchbegriff] = useState(
    searchRequest?.query || ""
  );
  const [suche, setSuche] = useState(
    searchRequest?.query?.trim() || ""
  );
  const [kategorie, setKategorie] = useState("alle");
  const [auswahl, setAuswahl] = useState(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");
  const [aktualisierung, setAktualisierung] = useState(0);

  // Suchbegriff von der Startseite übernehmen.
  useEffect(() => {
    if (!searchRequest) return;

    setSuchbegriff(searchRequest.query || "");
    setSuche(searchRequest.query?.trim() || "");
    setAuswahl(null);
  }, [searchRequest]);

  // Rezepte beim Öffnen und nach Klick auf Aktualisieren laden.
  useEffect(() => {
    const controller = new AbortController();

    setLaedt(true);
    setFehler("");

    async function laden() {
      try {
        const daten = await api("/rezepte", {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setRezepte(daten);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFehler(
            "Rezepte konnten nicht geladen werden. Bitte versuche es erneut."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLaedt(false);
        }
      }
    }

    void laden();

    return () => controller.abort();
  }, [aktualisierung]);

  const handleSuche = (event) => {
    event.preventDefault();
    setSuche(suchbegriff.trim());
  };

  // Geladene Rezepte nach Suchbegriff und Kategorie filtern.
  const treffer = rezepte.filter((rezept) => {
    const text = [
      rezept.title,
      rezept.info,
      rezept.beschreibung,
      ...(rezept.zutaten || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("de-DE");

    const passendeKategorie =
      kategorie === "alle" || rezept.kategorie === kategorie;

    const passenderSuchbegriff = text.includes(
      suche.toLocaleLowerCase("de-DE")
    );

    return passendeKategorie && passenderSuchbegriff;
  });

  if (auswahl !== null) {
    return (
      <RezeptDetail
        id={auswahl}
        onZurueck={() => setAuswahl(null)}
      />
    );
  }

  return (
    <section id="rezepte">
      <h2>🥘 Ab in den Topf</h2>

      <p>
        Was hast du denn heute Schönes geerntet?
        Was möchtest du heute verarbeiten?
      </p>

      <form className="such-bereich" onSubmit={handleSuche}>
        <label htmlFor="rezept">Ernte oder Rezept:</label>

        <div className="such-zeile">
          <input
            type="search"
            id="rezept"
            placeholder="Zum Beispiel Kürbis …"
            value={suchbegriff}
            onChange={(event) =>
              setSuchbegriff(event.target.value)
            }
          />

          <button className="mein-button" type="submit">
            Suchen
          </button>
        </div>

        <p>
          <label htmlFor="rezept-kategorie">
            Kategorie:{" "}
          </label>

          <select
            id="rezept-kategorie"
            value={kategorie}
            onChange={(event) =>
              setKategorie(event.target.value)
            }
          >
            <option value="alle">Alle Rezepte</option>
            <option value="abendessen">Abendessen</option>
            <option value="haltbarmachen">
              Haltbarmachen
            </option>
          </select>
        </p>

        <button
          className="mein-button"
          type="button"
          disabled={laedt}
          onClick={() =>
            setAktualisierung((wert) => wert + 1)
          }
        >
          {laedt
            ? "Wird geladen …"
            : "↻ Rezepte aktualisieren"}
        </button>
      </form>

      {fehler && <p role="alert">{fehler}</p>}

      <div
        id="rezept-container"
        aria-live="polite"
        aria-busy={laedt}
      >
        {laedt ? (
          <p>Rezepte werden geladen …</p>
        ) : fehler ? null : treffer.length === 0 ? (
          <p>
            {rezepte.length === 0
              ? "Unsere Rezeptsammlung ist noch leer. 🌿"
              : "Keine passenden Rezepte gefunden. Ändere die Suche oder Kategorie."}
          </p>
        ) : (
          treffer.map((rezept) => (
            <RezeptKarte
              key={rezept.id}
              recipe={rezept}
              onKlick={() => setAuswahl(rezept.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default Rezepte;        