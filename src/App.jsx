import { useState, useMemo } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import UeberMich from "./components/UeberMich";
import Rezepte from "./components/Rezepte";
import Favouriten from "./components/Favouriten";
import EinmachFibel from "./components/EinmachFibel";
import Vorratskammer from "./components/Vorratskammer";
import Footer from "./components/Footer";
// NEU: Task Manager Komponenten
import Dashboard from "./components/Dashboard";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import useLocalStorage from "./hooks/useLocalStorage";
import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useState(false);

  // NEU: Tasks dauerhaft per Custom Hook speichern (Bonus-Aufgabe)
  const [tasks, setTasks] = useLocalStorage("tasks", []);
  const [filter, setFilter] = useState("alle");

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Schritt 4: Task hinzufügen
  const addTask = (title, priority = "mittel", kategorie = "allgemein") => {
    const newTask = {
      id: Date.now(),
      title,
      done: false,
      priority,
      kategorie,
    };
    setTasks([...tasks, newTask]);
  };

  // Schritt 7: Task-Status umschalten
  const toggleTask = (id) => {
    setTasks(tasks.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task
    ));
  };

  // Schritt 7: Task löschen
  const deleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  // Bonus: gefilterte Liste per useMemo
  const gefilterteTasks = useMemo(() => {
    if (filter === "offen") return tasks.filter((t) => !t.done);
    if (filter === "erledigt") return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  // Bonus: Statistiken per useMemo
  const stats = useMemo(() => {
    const erledigt = tasks.filter((t) => t.done).length;
    return {
      gesamt: tasks.length,
      erledigt,
      offen: tasks.length - erledigt,
      prozent: tasks.length === 0 ? 0 : Math.round((erledigt / tasks.length) * 100),
    };
  }, [tasks]);

  return (
    <div className={darkMode ? "dark-mode" : ""}>
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <Hero />

      <main>
        <UeberMich />
        <Rezepte />
        <Favouriten />
        <EinmachFibel />
        <Vorratskammer />

        {/* NEU: Task Manager Sektion */}
        <section id="aufgaben">
          <h2>✅ Meine Aufgaben</h2>
          <p>Plane und verwalte deine Garten- und Küchenaufgaben an einem Ort.</p>
          <Dashboard stats={stats} />
          <TaskForm addTask={addTask} />
          <TaskList
            tasks={gefilterteTasks}
            filter={filter}
            setFilter={setFilter}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
