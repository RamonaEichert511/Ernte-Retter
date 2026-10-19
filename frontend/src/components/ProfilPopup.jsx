import { useEffect, useId, useRef } from "react";
import "./ProfilPopup.css";

export default function ProfilPopup({ name, onClose }) {
  const dialogRef = useRef(null);
  const titelId = useId();

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
    </dialog>
  );
}