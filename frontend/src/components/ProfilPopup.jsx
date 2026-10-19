import { useEffect, useId, useRef, useState } from "react";
import { api } from "../services/api";
import "./ProfilPopup.css";

export default function ProfilPopup({ userId, name, onClose }) {
  const dialogRef = useRef(null);
  const titelId = useId();
  const [inserate, setInserate] = useState([]);
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    let aktiv = true;

    async function inserateLaden() {
      setLaden(true);
      setFehler("");
      setInserate([]);

      try {
        const angebote = await api("/offers");

        if (aktiv) {
          setInserate(
            angebote.filter(
              (angebot) => angebot.owner_id === userId,
            ),
          );
        }
      } catch {
        if (aktiv) {
          setFehler("Die Inserate konnten nicht geladen werden.");
        }
      } finally {
        if (aktiv) {
          setLaden(false);
        }
      }
    }

    void inserateLaden();

    return () => {
      aktiv = false;
    };
  }, [userId]);

  const initialen = (name || "")
    .trim()
    .split(/\s+/)
    .map((teil) => Array.from(teil)[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="profil-popup"
      aria-labelledby={titelId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="profil-popup-kopf">
        <span className="eyebrow">ERNTERETTER-PROFIL</span>

        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
          autoFocus
        >
          Schließen
        </button>
      </div>

      <div className="profil-popup-person">
        <div className="profil-popup-avatar" aria-hidden="true">
          {initialen}
        </div>

        <h2 id={titelId}>{name}</h2>
      </div>

      <p className="profil-popup-hinweis">
        Weitere Profilangaben sind hier bald verfügbar.
      </p>
      <section className="profil-popup-inserate">
        <h3>Inserate von {name}</h3>

        {laden ? (
          <p role="status">Inserate werden geladen …</p>
        ) : fehler ? (
          <p className="form-error" role="alert">
            {fehler}
          </p>
        ) : inserate.length === 0 ? (
          <p>Aktuell sind keine Inserate vorhanden.</p>
        ) : (
          <ul className="profil-inserate-liste">
            {inserate.map((angebot) => {
              const reserviert = [
                "reserviert",
                "reserved",
              ].includes(angebot.status);

              return (
                <li key={angebot.id} className="profil-inserat">
                  <span className="form-hint">
                    {reserviert ? "Reserviert" : "Verfügbar"}
                  </span>

                  <h4>{angebot.title}</h4>

                  <p>
                    {angebot.menge} {angebot.einheit}
                  </p>

                  <p>Abholort: {angebot.location}</p>

                  {angebot.description && (
                    <p className="profil-inserat-beschreibung">
                      {angebot.description}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </dialog>
  );
}