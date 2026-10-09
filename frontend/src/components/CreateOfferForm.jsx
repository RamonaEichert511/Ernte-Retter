import { useState } from "react";

const emptyForm = {
  title: "",
  quantity: "",
  location: "",
  description: "",
};

export default function CreateOfferForm({ onCreate, disabled }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }
  async function handleSubmit(event) {
    event.preventDefault();
    const values = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    );
    if (
      !values.title ||
      !values.quantity ||
      !values.location
    ) {
      setError(
        "Bitte fülle alle Pflichtfelder aus. Leerzeichen allein reichen nicht.",
      );
      return;
    }
    const success = await onCreate(values);
    if (!success) return;
    setForm(emptyForm);
    setError("");
  }
  return (
    <form className="market-form" onSubmit={handleSubmit}>
      <h3>Ernte anbieten</h3>
      <div className="market-fields">
        <label htmlFor="offer-title">
          Was möchtest du abgeben? *
          <input
            id="offer-title"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="z. B. Äpfel aus dem Garten"
            maxLength={100}
            required
          />
        </label>
        <label htmlFor="offer-quantity">
          Menge *
          <input
            id="offer-quantity"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            placeholder="z. B. 3 kg"
            maxLength={60}
            required
          />
        </label>
        <label htmlFor="offer-location">
          Abholort *
          <input
            id="offer-location"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="z. B. Ort oder Stadtteil"
            maxLength={100}
            required
          />
        </label>
        <label className="market-wide" htmlFor="offer-description">
          Beschreibung
          <textarea
            id="offer-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Was sollten Interessierte wissen?"
            rows={3}
            maxLength={1000}
          />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <button className="mein-button" type="submit" disabled={disabled}>
        + Inserat erstellen
      </button>
    </form>
  );
}
