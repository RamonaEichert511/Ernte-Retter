# React + Vite

# Ernte Retter – Ramona Eichert

## Beschreibung

Eine React-App rund um die Verarbeitung der eigenen Gartenernte. Man kann nach Rezepten suchen, sie als Favorit speichern, eingelegte Vorräte mit Einlegedatum eintragen und sehen wie viele Tage bis zum perfekten Reifegrad noch fehlen. Zusätzlich gibt es eine persönliche Geschichte, eine Einmach-Fibel mit Tipps und einen Dark Mode.

Als Erweiterung wurde ein **Smart Task Manager** als neue Sektion (`#aufgaben`) integriert. Er erlaubt es, Aufgaben rund um Garten und Küche anzulegen, als erledigt zu markieren, zu filtern und zu löschen – mit dauerhafter Speicherung im Browser sowie einem Dashboard mit Live-Statistiken.

---

## Verwendete Techniken

- React (Vite Setup)
- Komponenten & Props
- `useState` für State Management
- `useEffect` für das Laden von Daten (API-Calls, localStorage)
- `useMemo` für optimierte Dashboard-Statistiken
- Custom Hook `useLocalStorage` für wiederverwendbare Persistenz
- Controlled Inputs
- Listen rendern mit `map()` und Keys
- Konditionales Rendering (`&&`, Ternary, Early Return)
- Externe APIs (Spoonacular für Rezepte, MyMemory für Übersetzung)
- `localStorage` für persistente Daten (Favoriten, Vorratskammer, Aufgaben)
- Dark Mode via `useEffect` auf `document.body`
- Custom Font via `@font-face` in `index.css`

---

## Weg

Ich habe Weg A (Eigenes Thema – Kreativ) gewählt und den Ernte Retter um den Smart Task Manager erweitert.

---

## Komponenten-Struktur

**Ernte Retter (Basis-App)**
- **App.jsx** – Hauptkomponente; verwaltet Dark-Mode-, Filter- und Sort-State; toggled die `dark-mode`-Klasse via `useEffect` auf `document.body`
- **Navbar.jsx** – Navigation mit Dark-Mode-Toggle
- **Hero.jsx** – Willkommensbereich
- **UeberMich.jsx** – Persönliche Entstehungsgeschichte
- **Rezepte.jsx** – Rezeptsuche mit State, API-Logik und Pagination
- **RezeptKarte.jsx** – Einzelne Rezeptkarte (erhält Props)
- **RezeptDetail.jsx** – Detailansicht mit Zutaten und Zubereitung
- **Favouriten.jsx** – Liste der gespeicherten Lieblingsrezepte
- **EinmachFibel.jsx** – Tipps und Faustformeln zum Einmachen
- **Vorratskammer.jsx** – Formular und State für den Reife-Wecker
- **WeckerListe.jsx** – Liste der eingelegten Vorräte (erhält Props)
- **Footer.jsx** – Footer-Bereich

**Smart Task Manager (Erweiterung)**
- **Aufgaben.jsx** – Elternkomponente der Aufgaben-Sektion; verwaltet zentralen State
- **TaskForm.jsx** – Formular zum Anlegen neuer Aufgaben (erhält `addTask` als Prop)
- **TaskList.jsx** – Rendert die gefilterte Aufgabenliste (erhält `tasks` und Aktionsfunktionen als Props)
- **TaskItem.jsx** – Einzelne Aufgabe mit Toggle und Löschen-Button
- **TaskDashboard.jsx** – Zeigt Statistiken (Gesamt, Offen, Erledigt) via `useMemo`
- **useLocalStorage.js** – Custom Hook für persistente Speicherung im `localStorage`

---

## Offene Fragen – Antworten

### 1. Komponentenstruktur verstehen

**Warum ist es sinnvoll, den Task Manager in mehrere Komponenten aufzuteilen?**

Wenn alles in einer einzigen Komponente steckt, wird der Code schnell unlesbar – man scrollt ewig und verliert den Überblick. Einzelne Komponenten wie `TaskForm`, `TaskList` und `TaskItem` haben jeweils nur eine klare Aufgabe. Das macht den Code übersichtlich, leichter zu verstehen und einfacher zu ändern. Wenn z. B. das Formular einen Bug hat, weiß ich sofort, wo ich suchen muss. Außerdem kann ich Komponenten wiederverwenden, ohne alles neu zu schreiben.

---

### 2. State & Datenfluss

**Warum wird der State zentral in der Elternkomponente verwaltet?**

Weil mehrere Komponenten auf dieselben Daten zugreifen müssen. Das `TaskDashboard` braucht zum Beispiel die gleiche Aufgabenliste wie `TaskList`. Wenn beide sich ihren eigenen State merken würden, könnten sie leicht auseinanderlaufen und unterschiedliche Dinge anzeigen. Wenn der State an einer zentralen Stelle liegt, ist immer klar: das ist die eine Wahrheit über den aktuellen Zustand.

**Was wäre das Problem mit unabhängigem State pro Komponente?**

Man müsste ständig dafür sorgen, dass alle Komponenten synchron bleiben – das ist fehleranfällig und sehr mühsam. Statt einem State hat man dann plötzlich vier, die alle leicht unterschiedliche Versionen der Daten speichern.

---

### 3. Funktionen über Props

**Warum werden Funktionen wie `addTask`, `deleteTask` oder `toggleTask` als Props übergeben?**

Weil die Daten (also der State) in der Elternkomponente leben und nur dort verändert werden dürfen. Die Kindkomponenten wie `TaskForm` oder `TaskItem` brauchen eine Möglichkeit, eine Änderung auszulösen – aber sie sollen den State nicht selbst direkt anfassen. Die übergebenen Funktionen wirken wie eine Art sicherer Knopf: Man darf drücken, aber was genau passiert, bestimmt die Elternkomponente. So bleiben die Daten kontrolliert an einem Ort.

---

### 4. localStorage Nutzung

**Welche Vor- und Nachteile hat `localStorage` im Vergleich zu einer echten Datenbank oder API?**

Der große Vorteil ist, dass es einfach funktioniert, ohne Server, ohne Anmeldung, ohne Kosten. Die Daten bleiben auch nach einem Browser-Reload erhalten, was für kleine Apps wie diese perfekt ist.

Der Nachteil: Alles bleibt nur im eigenen Browser. Auf einem anderen Gerät oder in einem anderen Browser sind die Daten weg. Und es gibt kein Konto, keine Synchronisierung. Eine echte Datenbank oder API würde das lösen, ist aber auch deutlich komplexer.

---

### 5. Erweiterungsidee: Filter nach „erledigt" und „offen"

**Wie würde ich das Filter-Feature umsetzen?**

Ich würde einen neuen State für den aktiven Filter anlegen, z. B. `const [filter, setFilter] = useState("alle")`. Die Aufgabenliste würde ich dann vor der Weitergabe an `TaskList` filtern – mit `useMemo`, damit die Berechnung nur läuft, wenn sich `tasks` oder `filter` wirklich ändern. Drei Buttons (Alle / Offen / Erledigt) würden den Filter-State umschalten.

**Welche Teile wären davon betroffen?**

`App.jsx` bräuchte den neuen Filter-State und die gefilterte Liste. `TaskList.jsx` würde statt der vollständigen Liste nur noch die bereits gefilterte bekommen. Die Filter-Buttons könnte man direkt in `App.jsx` einbauen oder als eigene kleine Komponente `TaskFilter.jsx` auslagern.

---

## Was ich gelernt habe

Beim Smart Task Manager habe ich zum ersten Mal einen eigenen Custom Hook geschrieben. `useLocalStorage` klingt erst komplizierter als es ist – im Kern ist es einfach `useState`, der seinen Initialwert aus dem `localStorage` liest und bei jeder Änderung automatisch zurückschreibt. Das Spannende daran: Sobald der Hook fertig ist, kann ich ihn in jeder Komponente benutzen, als wäre es ein normaler State. Das hat mir gezeigt, wie man in React Logik wirklich sauber wiederverwendbar macht.

`useMemo` war neu für mich. Ich habe es für das Dashboard verwendet, das Gesamtzahl, offene und erledigte Aufgaben zählt. Ohne `useMemo` würde diese Berechnung bei jedem Render neu laufen, auch wenn sich die Aufgaben gar nicht verändert haben. Mit `useMemo` passiert das nur, wenn `tasks` sich wirklich ändert – React merkt sich das Ergebnis dazwischen.

Außerdem habe ich besser verstanden, warum Funktionen wie `addTask`, `deleteTask` und `toggleTask` als Props nach unten weitergegeben werden statt in jeder Komponente neu geschrieben zu werden: Die Daten gehören dem Elternteil, also soll auch nur der Elternteil sie verändern.

---

## Schwierigkeiten

Der Dark Mode war für den Task Manager eigentlich als Bonus-Feature mit der Context API geplant. Was im Projekt umgesetzt wurde, ist ein schneller Fix aus dem vorherigen Entwicklungsstand der App: Die CSS war mit `body.dark-mode`-Selektoren korrekt geschrieben, aber in `App.jsx` wurde die Klasse per `className` auf ein Wrapper-`<div>` gesetzt – nicht auf `body`. Deshalb hat keiner der CSS-Selektoren gegriffen. Der Fix war, `App.jsx` so anzupassen, dass die Klasse via `useEffect` direkt auf `document.body` gesetzt wird. Eine saubere Lösung mit Context API wäre der nächste Schritt.

Eine weitere Stolperfalle war der Custom Font. Die Datei heißt `Strawberry Muffins Demo.ttf` – mit Leerzeichen im Namen. Zunächst war der Pfad in `index.css` mit Backslash-Escapes geschrieben (`Strawberry\ Muffins\ Demo.ttf`), was nicht funktioniert hat. Die Lösung war, die Leerzeichen einfach direkt im Pfad stehen zu lassen: `url('fonts/Strawberry Muffins Demo.ttf')`. Dazu musste der Dev-Server neu gestartet werden – ein einfaches `npm run dev` nochmal, und alles war da.

---

## Starten

```bash
npm install
npm run dev
```