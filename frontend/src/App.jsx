import { useState, useMemo, useEffect, useRef } from "react";
import { api, getToken } from "./services/api";
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
import Impressum from "./components/Impressum";
// NEU: Task Manager Komponenten
import Dashboard from "./components/Dashboard";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import useLocalStorage from "./hooks/useLocalStorage";
import EmailBestaetigung from "./components/EmailBestaetigung";
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
    "impressum",
    "verify",
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
  const [messageToast, setMessageToast] = useState(false);
  const toastTimer = useRef(null);

  function closeMessageToast() {
    window.clearTimeout(toastTimer.current);
    setMessageToast(false);
  }

  function showMessageToast() {
    window.clearTimeout(toastTimer.current);
    setMessageToast(true);

    toastTimer.current = window.setTimeout(() => {
      setMessageToast(false);
    }, 6000);
  }

  // Bei Kontowechsel oder Logout den Hinweis entfernen.
  useEffect(() => {
    setMessageToast(false);
    window.clearTimeout(toastTimer.current);

    return () => {
      window.clearTimeout(toastTimer.current);
    };
  }, [market.user?.id]);

  useEffect(() => {
    setUnreadMessages(0);

    if (!market.user) return;

    const controller = new AbortController();

    let websocket;
    let reconnectTimer;
    let stopped = false;
    let reconnectDelay = 1000;
    let loading = false;
    let reloadRequested = false;

    async function updateUnreadMessages() {
      if (stopped) return;

      // Kommt während einer Abfrage ein neues Ereignis,
      // fragen wir danach noch einmal ab.
      reloadRequested = true;

      if (loading) return;

      loading = true;

      try {
        while (reloadRequested && !stopped) {
          reloadRequested = false;

          const conversations = await api("/nachrichten/inbox", {
            signal: controller.signal,
          });

          if (stopped) return;

          const total = conversations.reduce(
            (sum, conversation) => sum + conversation.ungelesen,
            0,
          );

          setUnreadMessages(total);
        }
      } catch (error) {
        if (!stopped) {
          console.error(
            "Ungelesene Nachrichten konnten nicht geladen werden:",
            error,
          );
        }
      } finally {
        loading = false;
      }
    }

    function connectWebSocket() {
      if (stopped) return;

      const token = getToken();

      if (!token) return;

      // Dieselbe Backend-Adresse wie für unsere API verwenden.
      const apiBase = import.meta.env.VITE_API_URL || "/api";
      const url = new URL(apiBase, window.location.origin);

      url.pathname = `${url.pathname.replace(/\/+$/, "")}/ws/notifications`;

      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.search = "";
      url.hash = "";
      url.searchParams.set("token", token);

      websocket = new WebSocket(url.toString());

      websocket.onopen = () => {
        if (stopped) return;

        reconnectDelay = 1000;

        // Auch nach einem Verbindungsabbruch die aktuelle Zahl laden.
        void updateUnreadMessages();
      };

      websocket.onmessage = (event) => {
        if (stopped) return;

        try {
          const notification = JSON.parse(event.data);

          if (notification.type === "new_message") {
            void updateUnreadMessages();
            showMessageToast();

            window.dispatchEvent(new Event("ernte-retter:new-message"));
          }
        } catch {
          console.warn(
            "WebSocket-Benachrichtigung konnte nicht gelesen werden.",
          );
        }
      };

      websocket.onerror = () => {
        // onclose kümmert sich anschließend um den Neuaufbau.
        websocket.close();
      };

      websocket.onclose = (event) => {
        if (stopped) return;

        // Bei abgewiesener Anmeldung nicht endlos neu verbinden.
        if ([1008, 4401, 4403].includes(event.code)) {
          console.warn(
            "Die WebSocket-Verbindung wurde vom Backend abgewiesen.",
          );
          return;
        }

        reconnectTimer = window.setTimeout(connectWebSocket, reconnectDelay);

        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      };
    }

    void updateUnreadMessages();
    connectWebSocket();

    window.addEventListener("focus", updateUnreadMessages);
    window.addEventListener("ernte-retter:messages-read", updateUnreadMessages);

    return () => {
      stopped = true;

      controller.abort();
      window.clearTimeout(reconnectTimer);

      window.removeEventListener("focus", updateUnreadMessages);
      window.removeEventListener(
        "ernte-retter:messages-read",
        updateUnreadMessages,
      );

      if (websocket) {
        websocket.onopen = null;
        websocket.onmessage = null;
        websocket.onerror = null;
        websocket.onclose = null;
        websocket.close();
      }
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
  };

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
      alert(`Fehler beim Erstellen der Aufgabe: ${error.message}`);
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
        method: "DELETE",
      });
      setTasks((previousTasks) =>
        previousTasks.filter((task) => task.id !== id),
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
      {messageToast && market.user && (
        <div className="message-toast">
          <button
            type="button"
            className="message-toast-open"
            onClick={() => {
              closeMessageToast();
              setChatTarget(null);
              window.location.hash = "chats";
            }}
          >
            <span aria-hidden="true">✉️</span>

            <span>
              <strong role="status">Neue Nachricht erhalten</strong>
              <span>Hier klicken, um deine Chats zu öffnen.</span>
            </span>
          </button>

          <button
            type="button"
            className="message-toast-close"
            aria-label="Benachrichtigung schließen"
            onClick={closeMessageToast}
          >
            ×
          </button>
        </div>
      )}
      <Navbar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        activeView={activeView}
        user={market.user}
        unreadMessages={unreadMessages}
      />
      <div className="workspace">
        <main key={activeView} id="main-content" tabIndex={-1}>
          {activeView === "verify" && (
            <div className="page-panel">
              <EmailBestaetigung />
            </div>
          )}
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
          {activeView === "impressum" && (
            <div className="page-panel">
              <Impressum />
            </div>
          )}
          {activeView === "konto" && (
            <div className="page-panel">
              <Auth market={market} onChat={openChat} />
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
