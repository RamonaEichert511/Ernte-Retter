/**
 * TaskItem.jsx – Schritt 6 & 7 der Aufgabe
 * Einzelne Aufgabe mit Checkbox (toggle) und Löschen-Button.
 */
const priorityIcon = { hoch: "🔴", mittel: "🟡", niedrig: "🟢" };
const kategorieIcon = { allgemein: "📋", garten: "🌱", küche: "🍳", einkochen: "🫙", einkauf: "🛒" };

function TaskItem({ task, toggleTask, deleteTask }) {
  return (
    <li className={`task-item${task.done ? " task-erledigt" : ""}`}>
      {/* Schritt 7: Status umschalten */}
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => toggleTask(task.id)}
        className="task-checkbox"
      />
      {/* Schritt 6: line-through wenn erledigt */}
      <span
        className="task-title"
        style={{ textDecoration: task.done ? "line-through" : "none" }}
      >
        {task.title}
      </span>
      <span className="task-badge task-priority">
        {priorityIcon[task.priority] || "🟡"} {task.priority}
      </span>
      <span className="task-badge task-kategorie">
        {kategorieIcon[task.kategorie] || "📋"} {task.kategorie}
      </span>
      {/* Schritt 7: Löschen */}
      <button className="loeschen-button" onClick={() => deleteTask(task.id)}>
        🗑️ Löschen
      </button>
    </li>
  );
}

export default TaskItem;
