import { useState } from "react";

/**
 * TaskForm.jsx – Schritt 5 der Aufgabe
 * Formular zum Erstellen neuer Aufgaben.
 */
function TaskForm({ addTask }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("mittel");
  const [kategorie, setKategorie] = useState("allgemein");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim(), priority, kategorie);
    setTitle("");
    setPriority("mittel");
    setKategorie("allgemein");
  };

  return (
    <div className="task-form-wrapper">
      <form onSubmit={handleSubmit} className="task-form">
        <div className="task-form-zeile">
          <input
            type="text"
            placeholder="Neue Aufgabe eingeben..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="task-select"
          >
            <option value="hoch">🔴 Hohe Priorität</option>
            <option value="mittel">🟡 Mittlere Priorität</option>
            <option value="niedrig">🟢 Niedrige Priorität</option>
          </select>
          <select
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value)}
            className="task-select"
          >
            <option value="allgemein">📋 Allgemein</option>
            <option value="garten">🌱 Garten</option>
            <option value="küche">🍳 Küche</option>
            <option value="einkochen">🫙 Einkochen</option>
            <option value="einkauf">🛒 Einkauf</option>
          </select>
          <button type="submit" className="mein-button">＋ Hinzufügen</button>
        </div>
      </form>
    </div>
  );
}

export default TaskForm;
