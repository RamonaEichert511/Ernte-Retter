import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import "./Chats.css";

export default function Chats({ user, initialConversation = null }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(initialConversation);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inboxError, setInboxError] = useState("");
  const [chatError, setChatError] = useState("");
  const [reload, setReload] = useState(0);

  const endRef = useRef(null);
  const selectionRef = useRef(null);
  const sendingRef = useRef(false);

  const conversationKey = selected
    ? `${selected.offer_id}:${selected.partner_id}`
    : null;

  selectionRef.current = conversationKey;

  useEffect(() => {
  if (!user) return;

  const refreshChats = () => {
    setReload((previous) => previous + 1);
  };

  window.addEventListener(
    "ernte-retter:new-message",
    refreshChats,
  );

  return () => {
    window.removeEventListener(
      "ernte-retter:new-message",
      refreshChats,
    );
  };
}, [user?.id]);
  // Gesprächsübersicht laden.
  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    async function loadInbox() {
      setLoadingInbox(true);
      setInboxError("");

      try {
        const data = await api("/nachrichten/inbox", {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setConversations(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setInboxError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingInbox(false);
        }
      }
    }

    loadInbox();

    return () => controller.abort();
  }, [user?.id, reload]);

  // Nachrichten des ausgewählten Gesprächs laden.
  useEffect(() => {
    if (!user || !selected) return;

    const controller = new AbortController();

    async function loadMessages() {
      setLoadingMessages(true);
      setChatError("");

      try {
        const data = await api(
          `/offers/${selected.offer_id}/nachrichten?mit=${selected.partner_id}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setMessages(data);
          window.dispatchEvent(
            new Event("ernte-retter:messages-read"),
          );

          setConversations((previous) =>
            previous.map((conversation) =>
              conversation.offer_id === selected.offer_id &&
              conversation.partner_id === selected.partner_id
                ? { ...conversation, ungelesen: 0 }
                : conversation,
            ),
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setChatError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => controller.abort();
  }, [user?.id, selected?.offer_id, selected?.partner_id, reload]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  function openConversation(conversation) {
    if (
      selected?.offer_id === conversation.offer_id &&
      selected?.partner_id === conversation.partner_id
    ) {
      return;
    }

    setSelected(conversation);
    setMessages([]);
    setText("");
    setChatError("");
  }

  async function sendMessage(event) {
    event.preventDefault();

    const messageText = text.trim();

    if (
      !selected ||
      !messageText ||
      messageText.length > 2000 ||
      sendingRef.current
    ) {
      return;
    }

    const sentKey = conversationKey;
    const draft = text;

    sendingRef.current = true;
    setSending(true);
    setChatError("");

    try {
      await api(`/offers/${selected.offer_id}/nachrichten`, {
        method: "POST",
        body: JSON.stringify({
          text: messageText,
          an: selected.partner_id,
        }),
      });

      if (selectionRef.current === sentKey) {
        setText((current) => (current === draft ? "" : current));
      }

      setReload((previous) => previous + 1);
    } catch (error) {
      if (selectionRef.current === sentKey) {
        setChatError(error.message);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function formatDate(value) {
    return new Date(value).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!user) {
    return (
      <section>
        <h2>Meine Chats</h2>
        <p>Melde dich an, um Nachrichten zu lesen und zu schreiben.</p>
        <a className="mein-button" href="#konto">
          Anmelden
        </a>
      </section>
    );
  }

  return (
    <section className="chats" aria-labelledby="chats-heading">
      <div className="chats-header">
        <h2 id="chats-heading">Meine Chats</h2>

        <button
          type="button"
          className="secondary-button"
          disabled={loadingInbox || loadingMessages || sending}
          onClick={() => setReload((previous) => previous + 1)}
        >
          Aktualisieren
        </button>
      </div>

      {inboxError && (
        <p className="form-error" role="alert">
          {inboxError}
        </p>
      )}

      <div className="chats-layout">
        <aside className="chats-sidebar" aria-label="Gespräche">
          <h3>Deine Gespräche</h3>

          {loadingInbox && <p role="status">Gespräche werden geladen …</p>}

          {!loadingInbox &&
            !inboxError &&
            conversations.length === 0 && (
              <p>
                Noch keine Gespräche. Über „Nachricht schreiben“ an einem
                Inserat kannst du Kontakt aufnehmen.
              </p>
            )}

          <ul className="chats-list">
            {conversations.map((conversation) => {
              const active =
                selected?.offer_id === conversation.offer_id &&
                selected?.partner_id === conversation.partner_id;

              return (
                <li
                  key={`${conversation.offer_id}-${conversation.partner_id}`}
                >
                  <button
                    type="button"
                    className={`chat-preview ${active ? "is-active" : ""}`}
                    aria-current={active ? "true" : undefined}
                    onClick={() => openConversation(conversation)}
                  >
                    <strong>{conversation.offer_title}</strong>
                    <span>{conversation.partner_name}</span>
                    <span>{conversation.letzte_nachricht}</span>

                    {conversation.ungelesen > 0 && (
                      <span className="chat-unread">
                        {conversation.ungelesen} ungelesen
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="chat-conversation">
          {!selected ? (
            <p>Wähle ein Gespräch aus oder starte eines an einem Inserat.</p>
          ) : (
            <>
              <header>
                <h3>{selected.offer_title}</h3>
                <p>Gespräch mit {selected.partner_name}</p>
              </header>

              {chatError && (
                <p className="form-error" role="alert">
                  {chatError}
                </p>
              )}

              <div
                className="chat-messages"
                aria-label="Nachrichtenverlauf"
                aria-busy={loadingMessages}
              >
                {loadingMessages ? (
                  <p role="status">Nachrichten werden geladen …</p>
                ) : (
                  <>
                    {!chatError && messages.length === 0 && (
                      <p>Noch keine Nachrichten. Schreib die erste!</p>
                    )}

                    {messages.map((message) => {
                      const own = message.sender_id === user.id;

                      return (
                        <article
                          key={message.id}
                          className={`chat-message ${own ? "is-own" : ""}`}
                        >
                          <strong>
                            {own ? "Du" : selected.partner_name}
                          </strong>

                          <p style={{ whiteSpace: "pre-wrap" }}>
                            {message.text}
                          </p>

                          <time dateTime={message.created_at}>
                            {formatDate(message.created_at)}
                          </time>
                        </article>
                      );
                    })}

                    <div ref={endRef} />
                  </>
                )}
              </div>

              <form className="chat-form" onSubmit={sendMessage}>
                <label htmlFor="chat-text">Deine Nachricht</label>

                <textarea
                  id="chat-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Zum Beispiel: Wann könnte ich die Ernte abholen?"
                  maxLength={2000}
                  rows={3}
                  required
                  disabled={sending}
                />

                <button
                  type="submit"
                  className="mein-button"
                  disabled={sending || loadingMessages || !text.trim()}
                >
                  {sending ? "Wird gesendet …" : "Nachricht senden"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}