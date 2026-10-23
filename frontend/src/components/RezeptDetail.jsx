import { useEffect, useState } from "react";
import { api, getToken } from "../services/api";

function RezeptDetail({ id, onZurueck, onFavoritEntfernt }) {
  const [rezept, setRezept] = useState(null);
  const [favorit, setFavorit] = useState(false);
  const [laedt, setLaedt] = useState(true);
  const [favoritBereit, setFavoritBereit] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState("");
  const [favoritFehler, setFavoritFehler] = useState("");
  const [versuch, setVersuch] = useState(0);

  const angemeldet = Boolean(getToken());

  // Das ausgewählte Rezept laden.
  useEffect(() => {
    const controller = new AbortController();

    setLaedt(true);
    setRezept(null);
    setFehler("");

    async function laden() {
      try {
        const daten = await api(`/rezepte/${id}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setRezept(daten);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFehler("Das Rezept konnte nicht geladen werden.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLaedt(false);
        }
      }
    }

    void laden();

    return () => controller.abort();
  }, [id, versuch]);

  // Prüfen, ob das Rezept bereits als Favorit gespeichert ist.
  useEffect(() => {
    const controller = new AbortController();

    setFavoritBereit(false);
    setFavorit(false);
    setFavoritFehler("");

    if (!angemeldet) return;

    async function laden() {
      try {
        const daten = await api("/favoriten", {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setFavorit(daten.some((eintrag) => eintrag.id === Number(id)));
          setFavoritBereit(true);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFavoritFehler("Der Favoritenstatus konnte nicht geladen werden.");
        }
      }
    }

    void laden();

    return () => controller.abort();
  }, [id, angemeldet, versuch]);

  // Favorit in der Datenbank speichern oder entfernen.
  async function toggleFavorit() {
    if (speichert || !favoritBereit) return;

    setSpeichert(true);
    setFavoritFehler("");

    try {
      if (favorit) {
        await api(`/favoriten/${id}`, {
          method: "DELETE",
        });

        setFavorit(false);
        onFavoritEntfernt?.(Number(id));
      } else {
        await api("/favoriten", {
          method: "POST",
          body: JSON.stringify({
            recipe_id: Number(id),
          }),
        });

        setFavorit(true);
      }
    } catch (error) {
      setFavoritFehler(
        "Die Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.",
      );
    } finally {
      setSpeichert(false);
    }
  }

  return (
    <section className="rezept-detail" aria-busy={laedt}>
      <button className="mein-button" type="button" onClick={onZurueck}>
        ← Zurück
      </button>

      {laedt && <p role="status">Rezept wird geladen …</p>}

      {fehler && <p role="alert">{fehler}</p>}

      {rezept && (
        <>
          <h2>{rezept.title}</h2>

          {rezept.image_url && (
            <img
              src={rezept.image_url}
              alt={rezept.title}
              style={{ maxWidth: "100%" }}
            />
          )}

          <p>
            {rezept.kategorie === "haltbarmachen"
              ? "Haltbarmachen"
              : "Abendessen"}
          </p>

          {rezept.owner_name && <p>Rezept von {rezept.owner_name}</p>}

          {rezept.info && <p>{rezept.info}</p>}
          {rezept.beschreibung?.trim() && (
            <p className="rezept-beschreibung">{rezept.beschreibung}</p>
          )}

          <section className="rezept-abschnitt">
            <h3>Zutaten</h3>

            {rezept.zutaten?.length > 0 ? (
              <ul className="rezept-zutaten">
                {rezept.zutaten.map((zutat, index) => (
                  <li key={index}>{zutat}</li>
                ))}
              </ul>
            ) : (
              <p>Noch keine Zutaten hinterlegt.</p>
            )}
          </section>

          {rezept.vorbereitung?.trim() && (
            <section className="rezept-abschnitt">
              <h3>Vorbereitung</h3>
              <p className="rezept-text">{rezept.vorbereitung}</p>
            </section>
          )}

          <section className="rezept-abschnitt">
            <h3>Zubereitung</h3>

            {rezept.schritte?.length > 0 ? (
              <ol className="rezept-schritte">
                {rezept.schritte.map((schritt, index) => (
                  <li key={index}>{schritt}</li>
                ))}
              </ol>
            ) : (
              <p>Noch keine Zubereitung hinterlegt.</p>
            )}
          </section>

          {rezept.fertigstellung?.trim() && (
            <section className="rezept-abschnitt">
              <h3>Fertigstellung</h3>
              <p className="rezept-text">{rezept.fertigstellung}</p>
            </section>
          )}

          {rezept.tipps?.trim() && (
            <section className="rezept-abschnitt rezept-tipps">
              <h3>Tipps</h3>
              <p className="rezept-text">{rezept.tipps}</p>
            </section>
          )}
          {angemeldet ? (
            <button
              className="mein-button"
              type="button"
              disabled={speichert || !favoritBereit}
              aria-pressed={favorit}
              onClick={toggleFavorit}
            >
              {speichert
                ? "Wird gespeichert …"
                : favorit
                  ? "♥ Aus Favoriten entfernen"
                  : "♡ Als Favorit speichern"}
            </button>
          ) : (
            <p>
              <a href="#konto">Melde dich an</a>, um das Rezept als Favorit zu
              speichern.
            </p>
          )}
        </>
      )}

      {favoritFehler && <p role="alert">{favoritFehler}</p>}

      {(fehler || favoritFehler) && (
        <button
          className="mein-button"
          type="button"
          disabled={laedt || speichert}
          onClick={() => setVersuch((wert) => wert + 1)}
        >
          Erneut versuchen
        </button>
      )}
    </section>
  );
}

export default RezeptDetail;
