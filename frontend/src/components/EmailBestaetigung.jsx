import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";

export default function EmailBestaetigung() {
  const [status, setStatus] = useState("loading");
  const [fehler, setFehler] = useState("");
  const anfrage = useRef(null);

  useEffect(() => {
    let aktiv = true;

    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setStatus("error");
      setFehler("Im Bestätigungslink fehlt der Token.");
      return;
    }

    // Auch im React StrictMode nur eine Anfrage senden.
    if (!anfrage.current) {
      anfrage.current = api("/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    }

    anfrage.current.then(
      () => {
        if (aktiv) setStatus("success");
      },
      (error) => {
        if (!aktiv) return;

        setStatus("error");
        setFehler(
          error.status === 400
            ? "Dieser Link ist ungültig, abgelaufen oder bereits verwendet."
            : "Die Bestätigung konnte nicht abgeschlossen werden. Bitte versuche es später erneut.",
        );
      },
    );

    return () => {
      aktiv = false;
    };
  }, []);

  function zurAnmeldung() {
    window.history.replaceState(null, "", "/#konto");
    window.dispatchEvent(new Event("hashchange"));
  }

  return (
    <section className="account-panel">
      <h2>E-Mail bestätigen</h2>

      {status === "loading" && (
        <p role="status">Deine E-Mail-Adresse wird bestätigt …</p>
      )}

      {status === "success" && (
        <>
          <p role="status">
            Deine E-Mail-Adresse wurde bestätigt. Du kannst dich jetzt anmelden.
          </p>
          <button type="button" className="mein-button" onClick={zurAnmeldung}>
            Zur Anmeldung
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <p className="form-error" role="alert">
            {fehler}
          </p>
          <button
            type="button"
            className="secondary-button"
            onClick={zurAnmeldung}
          >
            Zur Anmeldung
          </button>
        </>
      )}
    </section>
  );
}
