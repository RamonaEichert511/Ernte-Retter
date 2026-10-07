import { useState, useEffect } from "react"

function App() {
  const [kategorien, setKategorien] = useState([])
  const [rezepte, setRezepte] = useState([])
  const [neueKategorie, setNeueKategorie] = useState("")
  const [titel, setTitel] = useState("")
  const [kategorieId, setKategorieId] = useState("")
  const [zutaten, setZutaten] = useState("")
  const [schritte, setSchritte] = useState("")

  useEffect(() => {
    laden()
  }, [])

  function laden() {
    fetch("/api/kategorien").then(r => r.json()).then(setKategorien)
    fetch("/api/rezepte").then(r => r.json()).then(setRezepte)
  }

  function kategorieAnlegen(e) {
    e.preventDefault()
    fetch("/api/kategorien", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: neueKategorie })
    }).then(() => {
      setNeueKategorie("")
      laden()
    })
  }

  function rezeptAnlegen(e) {
    e.preventDefault()
    fetch("/api/rezepte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titel,
        kategorie_id: Number(kategorieId),
        zutaten: zutaten.split("\n").filter(z => z.trim()),
        schritte: schritte.split("\n").filter(s => s.trim())
      })
    }).then(() => {
      setTitel("")
      setKategorieId("")
      setZutaten("")
      setSchritte("")
      laden()
    })
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h1>Rezeptbuch</h1>

      <section>
        <h2>Kategorien</h2>
        <form onSubmit={kategorieAnlegen} style={{ marginBottom: 10 }}>
          <input
            value={neueKategorie}
            onChange={e => setNeueKategorie(e.target.value)}
            placeholder="Neue Kategorie..."
            required
          />
          <button type="submit">Hinzufuegen</button>
        </form>
        <ul>
          {kategorien.map(k => <li key={k.id}>{k.name}</li>)}
        </ul>
      </section>

      <section>
        <h2>Neues Rezept</h2>
        <form onSubmit={rezeptAnlegen}>
          <input
            value={titel}
            onChange={e => setTitel(e.target.value)}
            placeholder="Titel"
            required
            style={{ width: "100%", marginBottom: 5 }}
          />
          <br />
          <select
            value={kategorieId}
            onChange={e => setKategorieId(e.target.value)}
            required
            style={{ marginBottom: 5 }}
          >
            <option value="">Kategorie waehlen...</option>
            {kategorien.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
          <br />
          <textarea
            value={zutaten}
            onChange={e => setZutaten(e.target.value)}
            placeholder="Zutaten (eine pro Zeile)"
            rows={3}
            style={{ width: "100%", marginBottom: 5 }}
          />
          <br />
          <textarea
            value={schritte}
            onChange={e => setSchritte(e.target.value)}
            placeholder="Schritte (einer pro Zeile)"
            rows={3}
            style={{ width: "100%", marginBottom: 5 }}
          />
          <br />
          <button type="submit">Rezept speichern</button>
        </form>
      </section>

      <section>
        <h2>Alle Rezepte ({rezepte.length})</h2>
        {rezepte.length === 0 && <p>Noch keine Rezepte vorhanden.</p>}
        {rezepte.map(r => (
          <div key={r._id} style={{
            border: "1px solid #ddd",
            padding: 15,
            marginBottom: 10,
            borderRadius: 5
          }}>
            <h3 style={{ margin: "0 0 10px" }}>{r.titel}</h3>
            <p><strong>Zutaten:</strong></p>
            <ul>{r.zutaten.map((z, i) => <li key={i}>{z}</li>)}</ul>
            <p><strong>Zubereitung:</strong></p>
            <ol>{r.schritte.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        ))}
      </section>
    </div>
  )
}

export default App