import { useEffect, useState } from "react";
import { api, getToken } from "../services/api";
import RezeptKarte from "./RezeptKarte";
import RezeptDetail from "./RezeptDetail";

function Favouriten() {
  const [favouriten, setFavouriten] = useState([]);
  const [auswahl, setAuswahl] = useState(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");
  const [aktualisierung, setAktualisierung] = useState(0);

  const angemeldet = Boolean(getToken());

  // Gespeicherte Rezepte beim Öffnen und auf Klick laden.
  useEffect(() => {
    const controller = new AbortController();

    setFehler("");

    if (!angemeldet) {
      setFavouriten([]);
      setLaedt(false);
      return;
    }

    setLaedt(true);

    async function laden() {
      try {
        const daten = await api("/favoriten", {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setFavouriten(daten);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFehler(
            "Deine Favoriten konnten nicht geladen werden."
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
  }, [angemeldet, aktualisierung]);

  // Nach dem Entfernen auch die angezeigte Liste aktualisieren.
  function favoritEntfernt(id) {
    setFavouriten((vorherige) =>
      vorherige.filter((rezept) => rezept.id !== id)
    );
  }

  if (auswahl !== null) {
    return (
      <RezeptDetail
        id={auswahl}
        onZurueck={() => {
          setAuswahl(null);
          setAktualisierung((wert) => wert + 1);
        }}
        onFavoritEntfernt={favoritEntfernt}
      />
    );
  }

  return (
    <section id="favouriten">
      <h2>❤️ Meine Favoriten</h2>

      {!angemeldet ? (
        <p>
          <a href="#konto">Melde dich an</a>, um deine
          Favoriten zu sehen.
        </p>
      ) : (
        <>
          <p>
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
                : "↻ Favoriten aktualisieren"}
            </button>
          </p>

          {fehler && <p role="alert">{fehler}</p>}

          <div
            id="favouriten-container"
            aria-live="polite"
            aria-busy={laedt}
          >
            {laedt ? (
              <p>Favoriten werden geladen …</p>
            ) : fehler ? null : favouriten.length === 0 ? (
              <p>Noch keine Favoriten gespeichert. 🤍</p>
            ) : (
              favouriten.map((rezept) => (
                <RezeptKarte
                  key={rezept.id}
                  recipe={rezept}
                  onKlick={() => setAuswahl(rezept.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Favouriten;