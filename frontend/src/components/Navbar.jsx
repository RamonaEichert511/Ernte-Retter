import { useState, useEffect } from "react";
import Icon from "./Icon";
import Botanical from "./Botanical";
const items = [
  ["uebersicht", "home", "Übersicht"],
  ["rezepte", "pot", "Rezepte"],
  ["info", "book", "Einmach-Fibel"],
  ["wecker", "jar", "Vorratskammer"],
  ["marktplatz", "people", "Ernte teilen"],
  ["favouriten", "heart", "Favoriten"],
  ["aufgaben", "check", "Aufgaben"],
];
export default function Navbar({ darkMode, toggleDarkMode, activeView, user }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const escape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.getElementById("menu-toggle")?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  return (
    <>
      <div className="mobile-bar">
        <a href="#uebersicht" className="brand">
          <Icon name="leaf" />
          Ernte Retter
        </a>
        <button
          id="menu-toggle"
          className="icon-button"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(!open)}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && (
        <button
          className="menu-backdrop"
          aria-label="Menü schließen"
          onClick={() => setOpen(false)}
        />
      )}
      <aside id="sidebar" className={`sidebar ${open ? "is-open" : ""}`}>
        <a href="#uebersicht" className="brand" onClick={() => setOpen(false)}>
          <Icon name="leaf" />
          <span>
            Ernte Retter<small>GUTES BEWAHREN. GEMEINSAM.</small>
          </span>
        </a>
        <nav aria-label="Hauptnavigation">
          <ul>
            {items.map(([id, icon, label], i) => (
              <li key={id} className={i === 5 ? "nav-separator" : ""}>
                <a
                  href={`#${id}`}
                  aria-current={activeView === id ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <Icon name={icon} />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Botanical className="sidebar-plant" />
        <div className="sidebar-bottom">
          <a
            href="#konto"
            aria-current={activeView === "konto" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <Icon name="people" />
            {user ? "Mein Konto" : "Anmelden"}
          </a>
          <a
            href="#ueber-mich"
            aria-current={activeView === "ueber-mich" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <Icon name="leaf" />
            Unsere Geschichte
          </a>
          <button onClick={toggleDarkMode} aria-pressed={darkMode}>
            <Icon name={darkMode ? "sun" : "moon"} />
            {darkMode ? "Helle Ansicht" : "Dunkle Ansicht"}
          </button>
        </div>
      </aside>
    </>
  );
}
