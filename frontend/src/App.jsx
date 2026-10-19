
import { useState, useMemo, useEffect } from "react";
import { api } from "./services/api";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Auth from "./components/Auth";
import useMarketplace from "./hooks/useMarketplace";
import UeberMich from "./components/UeberMich";
import Rezepte from "./components/Rezepte";
import Favouriten from "./components/Favouriten";
import EinmachFibel from "./components/EinmachFibel";
import Vorratskammer from "./components/Vorratskammer";
import Footer from "./components/Footer";
import Marktplatz from "./components/Marktplatz";
import Chats from "./components/Chats";
// NEU: Task Manager Komponenten
import Dashboard from "./components/Dashboard";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import useLocalStorage from "./hooks/useLocalStorage";
import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useLocalStorage(
    "ernte-retter-dark-mode",
    false,
  );
  const views = [
    "uebersicht",
    "rezepte",
    "info",
    "wecker",
    "marktplatz",
    "chats",
    "favouriten",
    "aufgaben",
    "ueber-mich",
    "konto",
  ];
const readView = () => {
  const hashView = window.location.hash.slice(1);
  const pathView = window.location.pathname.replace(/^\/|\/$/g, "");

  if (views.includes(hashView)) return hashView;
  if (views.includes(pathView)) return pathView;

  return "uebersicht";
};
  const [activeView, setActiveView] = useState(readView);
  const [searchRequest, setSearchRequest] = useState(null);
  const market = useMarketplace();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    setUnreadMessages(0);

    if (!market.user) return;

    const controller = new AbortController();
    let loading = false;

    async function updateUnreadMessages() {
      if (loading || controller.signal.aborted) return;

      loading = true;

      try {
        const conversations = await api("/nachrichten/inbox", {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          const total = conversations.reduce(
            (sum, conversation) => sum + conversation.ungelesen,
            0,
          );

          setUnreadMessages(total);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(
            "Ungelesene Nachrichten konnten nicht geladen werden:",
            error,
          );
        }
    } finally {
      loading = false;
    }
  }

  updateUnreadMessages();

  const interval = window.setInterval(updateUnreadMessages, 30000);

  window.addEventListener("focus", updateUnreadMessages);
  window.addEventListener(
    "ernte-retter:messages-read",
    updateUnreadMessages,
  );

  return () => {
    controller.abort();
    window.clearInterval(interval);

    window.removeEventListener("focus", updateUnreadMessages);
    window.removeEventListener(
      "ernte-retter:messages-read",
      updateUnreadMessages,
    );
  };
}, [market.user?.id]);  
  const [chatTarget, setChatTarget] = useState(null);

  useEffect(() => {
    setChatTarget(null);
  }, [market.user?.id]);

  const openChat = (offer) => {
    if (!market.user) {
      window.location.hash = "konto";
      return;
    }

    setChatTarget({
      offer_id: offer.id,
      offer_title: offer.title,
      partner_id: offer.owner_id,
      partner_name: offer.owner_name || "Anbieter",
    });

   window.location.hash = "chats";
  }
 
  useEffect(() => {
    const update = () => {
      const nextView = readView();

      setActiveView(nextView);
      setFilter("alle");

      // Alte Rezeptsuche beim Verlassen zurücksetzen.
      if (nextView !== "rezepte") {
        setSearchRequest(null);
      }

      // Beide Ansichten zeigen Inserate an.
      if (nextView === "marktplatz" || nextView === "uebersicht") {
        void market.refresh();
      }

      window.scrollTo(0, 0);

      requestAnimationFrame(() =>
        document.getElementById("main-content")?.focus({
          preventScroll: true,
        }),
      );
    };

    window.addEventListener("hashchange", update);

    return () => window.removeEventListener("hashchange", update);
  }, [market.refresh]);
  function searchFromHero(query) {
    setSearchRequest({ query, id: Date.now() });
    window.location.hash = "rezepte";
  }

  // NEU: Tasks dauerhaft per Custom Hook speichern (Bonus-Aufgabe)
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("alle");
  useEffect(() => {
  let cancelled = false;

  setTasks([]);

  if (!market.user || activeView !== "aufgaben") return;

  async function loadTasks() {
    try {
      const data = await api("/aufgaben");

      if (!cancelled) {
        setTasks(data);
      }
    } catch (error) {
      if (!cancelled) {
        console.error("Aufgaben konnten nicht geladen werden:", error);
      }
    }
  }

  loadTasks();

  return () => {
    cancelled = true;
  };
}, [market.user?.id, activeView]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Schritt 4: Task hinzufügen
  const addTask = async (title) => {
    if (!market.user) {
      alert("Bitte melde dich an, um Aufgaben zu erstellen.");
      return;
    }
    try {
      const newTask = await api("/aufgaben", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setTasks((previousTasks) => [...previousTasks, newTask]);
    } catch (error) {
      alert (`Fehler beim Erstellen der Aufgabe: ${error.message}`);
    }
  };
    

  // Schritt 7: Task-Status umschalten
  const toggleTask = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    );
  };

  // Schritt 7: Task löschen
  const deleteTask = async (id) => {
    try {
      await api(`/aufgaben/${id}`, { 
        method: "DELETE" 
      });
      setTasks((previousTasks) =>
        previousTasks.filter((task) => task.id !== id)
      );
    } catch (error) {
      alert(`Fehler beim Löschen der Aufgabe: ${error.message}`);
    }
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
      prozent:
        tasks.length === 0 ? 0 : Math.round((erledigt / tasks.length) * 100),
    };
  }, [tasks]);

  return (
    <div className={`app-shell ${darkMode ? "dark-mode" : ""}`}>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Zum Inhalt
      </a>
      <Navbar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        activeView={activeView}
        user={market.user}
        unreadMessages={unreadMessages}
      />
      <div className="workspace">
        <main key={activeView} id="main-content" tabIndex={-1}>
          {market.error && (
            <p className="form-error" role="alert">
              {market.error}
            </p>
          )}
          {activeView === "uebersicht" && (
            <Home onSearch={searchFromHero} market={market} onChat={openChat} />
          )}
          {activeView === "rezepte" && (
            <div className="page-panel">
              <Rezepte searchRequest={searchRequest} />
            </div>
          )}
          {activeView === "ueber-mich" && (
            <div className="page-panel">
              <UeberMich />
            </div>
          )}
          {activeView === "favouriten" && (
            <div className="page-panel">
              <Favouriten />
            </div>
          )}
          {activeView === "info" && (
            <div className="page-panel">
              <EinmachFibel />
            </div>
          )}
          {activeView === "wecker" && (
            <div className="page-panel">
              <Vorratskammer />
            </div>
          )}
          {activeView === "marktplatz" && (
            <div className="page-panel">
              <Marktplatz market={market} onChat={openChat} />
            </div>
          )}
          {activeView === "chats" && (
            <div className="page-panel">
              <Chats
                key={`${market.user?.id ?? "gast"}:${chatTarget?.offer_id ?? ""}:${chatTarget?.partner_id ?? ""}`}
                user={market.user}
                initialConversation={chatTarget}
              />
            </div>
          )}  
          
          {activeView === "konto" && (
            <div className="page-panel">
              <Auth market={market} />
            </div>
          )}
          {activeView === "aufgaben" && (
            <section id="aufgaben" className="page-panel">
              <span className="eyebrow">GARTEN & KÜCHE</span>
              <h2>Meine Aufgaben</h2>
              <p>
                Plane und verwalte deine Garten- und Küchenaufgaben an einem
                Ort.
              </p>
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
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;

