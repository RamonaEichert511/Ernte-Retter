function EinmachFibel() {
  return (
    <section id="info">
      <div className="fibel-section info-section">
        <h2>📚 Einmach-Fibel</h2>
        <p>
          Beim Einkochen und Fermentieren gibt es eine goldene Regel: Die Verhältnisse müssen stimmen.
          Zu wenig Zucker in der Marmelade und sie schimmelt; zu wenig Salz beim Fermentieren und das Gemüse wird matschig. Hier sind die wichtigsten Faustformeln auf einen Blick:
        </p>
        <div className="ratio-box">
          <ul>
            <li>
              <strong>Marmelade (3:1 Verhältnis):</strong> Teile das Fruchtgewicht durch 3. <br />
              <em>Beispiel: 1200g Früchte = 400g Gelierzucker.</em>
            </li>
            <li>
              <strong>Fermentieren (2% Salz-Anteil):</strong> Nimm das Gemüsegewicht mal 0,02. <br />
              <em>Beispiel: 500g Gemüse = 10g Salz.</em>
            </li>
          </ul>
        </div>
      </div>

      <div className="fibel-section tips-section">
        <h3>👵 Omas Geheimtipps für den perfekten Vorrat</h3>
        <ul className="fibel-tricks-list">
          <li>
            <strong>Der Deckel-Test (Vakuum prüfen):</strong> Nach dem Abkühlen muss die Mitte des Schraubdeckels leicht nach unten gezogen sein. Wenn du draufdrückst und es macht „Knack", hat sich kein Vakuum gebildet. Dieses Glas solltest du als Erstes aufbrauchen.
          </li>
          <li>
            <strong>Die Dunkelhaft für Gläser:</strong> Lagere deine fertigen Schätze an einem kühlen, dunklen Ort (z. B. Keller). Licht entzieht dem Gemüse die schöne Farbe und baut Vitamine ab.
          </li>
          <li>
            <strong>Keine Kälteschocks:</strong> Stelle die kochend heißen Gläser nach dem Einkochen niemals direkt auf eine kalte Steinplatte oder in den Luftzug – das Glas könnte durch den Temperaturunterschied springen. Ein trockenes Küchentuch als Unterlage ist ideal.
          </li>
        </ul>
      </div>
    </section>
  );
}

export default EinmachFibel;