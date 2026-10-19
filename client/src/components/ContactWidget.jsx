import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const INITIAL_MESSAGES = [
  {
    from: "bot",
    text: "Hi! I’m the Huduma Hub assistant. What can I help you with today?",
  },
];

const QUICK_HELP = {
  submit:
    "To report a community issue, choose “New Request” after signing in. Add the category, location, and a short description. You can attach a photo too.",
  track:
    "Sign in and open “My Requests” to see each request’s current status and activity history.",
};

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.4 3.6A11.8 11.8 0 0 0 2 17.8L.5 23.5l5.8-1.5a11.8 11.8 0 0 0 14.1-18.4ZM12 21a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.4.9.9-3.3-.2-.4A9.8 9.8 0 1 1 12 21Zm5.4-7.3c-.3-.2-1.7-.9-2-.9s-.5-.2-.7.2-.8.9-1 1.1-.4.2-.7 0a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.7-2.1c-.2-.3 0-.5.2-.7l.5-.6.2-.5-.1-.5c-.1-.2-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.1-1.4-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3C6.5 3 2 6.7 2 11.2c0 2.2 1.1 4.2 3 5.7l-.7 3.7 4-2a12 12 0 0 0 3.7.6c5.5 0 10-3.7 10-8.2S17.5 3 12 3Zm-4 9.3a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export default function ContactWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [mode, setMode] = useState("menu");
  const [value, setValue] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
    if (mode !== "menu" && mode !== "done") inputRef.current?.focus();
    return undefined;
  }, [isOpen, messages, mode]);

  const addMessages = (...entries) => {
    setMessages((current) => [...current, ...entries]);
  };

  const selectHelp = (choice) => {
    setError("");
    if (choice === "agent") {
      addMessages(
        { from: "you", text: "I’d like to talk to an agent." },
        {
          from: "bot",
          text: "Of course. What name should we use when we contact you?",
        },
      );
      setMode("name");
      return;
    }

    const answer = QUICK_HELP[choice];
    addMessages(
      {
        from: "you",
        text:
          choice === "submit"
            ? "How do I submit a request?"
            : "How do I track my request?",
      },
      { from: "bot", text: answer },
      { from: "bot", text: "Would you like help with anything else?" },
    );
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const answer = value.trim();
    if (!answer || sending) return;
    setError("");

    if (mode === "name") {
      if (answer.length < 2 || answer.length > 100) {
        setError("Please enter a name between 2 and 100 characters.");
        return;
      }
      setContact((current) => ({ ...current, name: answer }));
      addMessages(
        { from: "you", text: answer },
        {
          from: "bot",
          text: `Thanks, ${answer.split(/\s+/)[0]}. What email address should we use to contact you?`,
        },
      );
      setMode("email");
      setValue("");
      return;
    }

    if (mode === "email") {
      if (answer.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) {
        setError("Please enter a valid email address.");
        return;
      }
      setContact((current) => ({ ...current, email: answer }));
      addMessages(
        { from: "you", text: answer },
        {
          from: "bot",
          text: "Thanks. What phone number can our support team reach you on?",
        },
      );
      setMode("phone");
      setValue("");
      return;
    }

    if (mode === "phone") {
      const phone = answer.replace(/[\s().-]/g, "");
      if (!/^(?:\+?[1-9]\d{6,14}|0\d{9})$/.test(phone)) {
        setError(
          "Enter a valid phone number, including your country code if outside Kenya.",
        );
        return;
      }
      setContact((current) => ({ ...current, phone }));
      addMessages(
        { from: "you", text: answer },
        {
          from: "bot",
          text: "Got it. Briefly tell us what you need help with (10–1000 characters).",
        },
      );
      setMode("message");
      setValue("");
      return;
    }

    if (mode === "message") {
      if (answer.length < 10 || answer.length > 1000) {
        setError("Please enter a message between 10 and 1000 characters.");
        return;
      }
      addMessages({ from: "you", text: answer });
      setValue("");
      setSending(true);
      try {
        await api("/contact", {
          method: "POST",
          body: { ...contact, message: answer },
        });
        addMessages({
          from: "bot",
          text: `Thanks, ${contact.name.split(/\s+/)[0]}. We’ve received your message and sent a confirmation to ${contact.email}. Our support team will contact you soon.`,
        });
        setMode("done");
      } catch (requestError) {
        setError(
          requestError.message ||
            "We could not send your message. Please try again or contact us on WhatsApp.",
        );
        addMessages({
          from: "bot",
          text: "I couldn’t submit that just now. Please try again, or use the WhatsApp button to reach us.",
        });
      } finally {
        setSending(false);
      }
    }
  };

  const restart = () => {
    setMessages(INITIAL_MESSAGES);
    setMode("menu");
    setContact({ name: "", email: "", phone: "" });
    setValue("");
    setError("");
  };

  const prompt =
    {
      name: "Your name",
      email: "Your email address",
      phone: "Your phone number",
      message: "Type your message…",
    }[mode] || "Write a message…";

  return (
    <div className="contact-widget">
      {isOpen && (
        <section
          className="contact-panel"
          aria-label="Huduma Hub support assistant"
        >
          <header className="contact-panel__header">
            <span className="contact-panel__avatar" aria-hidden="true">
              H
            </span>
            <div className="contact-panel__title">
              <strong>Huduma Hub Support</strong>
              <span>
                <i /> Here to help
              </span>
            </div>
            <button
              className="contact-panel__close"
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close support chat"
            >
              <CloseIcon />
            </button>
          </header>

          <div
            className="contact-panel__messages"
            ref={listRef}
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <p
                className={`contact-message contact-message--${message.from}`}
                key={`${index}-${message.text}`}
              >
                {message.text}
              </p>
            ))}
            {sending && (
              <p className="contact-message contact-message--bot">
                Sending your message…
              </p>
            )}
          </div>

          {error && (
            <p className="contact-panel__error" role="alert">
              {error}
            </p>
          )}

          {mode === "menu" && (
            <div className="contact-panel__choices">
              <button type="button" onClick={() => selectHelp("submit")}>
                Submit a request
              </button>
              <button type="button" onClick={() => selectHelp("track")}>
                Track a request
              </button>
              <button type="button" onClick={() => selectHelp("agent")}>
                Talk to an agent
              </button>
            </div>
          )}

          {mode !== "menu" && mode !== "done" && (
            <form className="contact-panel__form" onSubmit={sendMessage}>
              <input
                ref={inputRef}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError("");
                }}
                placeholder={prompt}
                aria-label={prompt}
                disabled={sending}
                maxLength={
                  mode === "message" ? 1000 : mode === "name" ? 100 : 191
                }
                type={mode === "email" ? "email" : "text"}
                autoComplete={
                  mode === "email"
                    ? "email"
                    : mode === "phone"
                      ? "tel"
                      : mode === "name"
                        ? "name"
                        : "off"
                }
              />
              <button
                type="submit"
                disabled={sending || !value.trim()}
                aria-label="Send answer"
              >
                ➤
              </button>
            </form>
          )}

          {mode === "done" && (
            <button
              className="contact-panel__restart"
              type="button"
              onClick={restart}
            >
              Start another conversation
            </button>
          )}
          <p className="contact-panel__privacy">
            Your contact details are only used to respond to this request.
          </p>
        </section>
      )}

      <div className="contact-widget__actions">
        <a
          className="contact-widget__button contact-widget__button--whatsapp"
          href="https://wa.me/254705173921?text=Hello%20Huduma%20Hub%2C%20I%20need%20help."
          target="_blank"
          rel="noreferrer"
          aria-label="Contact Huduma Hub on WhatsApp"
          title="Chat on WhatsApp"
        >
          <WhatsAppIcon />
        </a>
        <button
          className="contact-widget__button contact-widget__button--chat"
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={
            isOpen ? "Close support assistant" : "Open support assistant"
          }
          aria-expanded={isOpen}
          title="Contact support"
        >
          {isOpen ? <CloseIcon /> : <ChatIcon />}
        </button>
      </div>
    </div>
  );
}
