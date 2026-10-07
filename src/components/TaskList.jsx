import TaskItem from "./TaskItem";

/**
 * TaskList.jsx – Schritt 6 der Aufgabe
 * Gibt die gefilterte Aufgabenliste aus.
 */
function TaskList({ tasks, filter, setFilter, toggleTask, deleteTask }) {
  return (
    <div className="task-list-wrapper">
      {/* Filter-Buttons */}
      <div id="sortier-buttons">
        <button
          className={`mein-button${filter === "alle" ? " active" : ""}`}
          onClick={() => setFilter("alle")}
        >
          Alle
        </button>
        <button
          className={`mein-button${filter === "offen" ? " active" : ""}`}
          onClick={() => setFilter("offen")}
        >
          🌿 Offen
        </button>
        <button
          className={`mein-button${filter === "erledigt" ? " active" : ""}`}
          onClick={() => setFilter("erledigt")}
        >
          ✅ Erledigt
        </button>
      </div>

      {tasks.length === 0 ? (
        <p>
          {filter === "erledigt"
            ? "Noch nichts erledigt – los geht's! 🌱"
            : "Keine Aufgaben vorhanden. Füge deine erste Aufgabe hinzu!"}
        </p>
      ) : (
        <ul className="task-liste">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              toggleTask={toggleTask}
              deleteTask={deleteTask}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default TaskList;
