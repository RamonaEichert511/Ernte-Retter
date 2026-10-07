/**

 */
function Dashboard({ stats }) {
  return (
    <div id="dashboard">
      <div className="dashboard-karten">
        <div className="dashboard-karte">
          <span className="dashboard-zahl">{stats.gesamt}</span>
          <span className="dashboard-label">Gesamt</span>
        </div>
        <div className="dashboard-karte">
          <span className="dashboard-zahl">{stats.offen}</span>
          <span className="dashboard-label">🌿 Offen</span>
        </div>
        <div className="dashboard-karte dashboard-karte-gruen">
          <span className="dashboard-zahl">{stats.erledigt}</span>
          <span className="dashboard-label">✅ Erledigt</span>
        </div>
        <div className="dashboard-karte">
          <span className="dashboard-zahl">{stats.prozent}%</span>
          <span className="dashboard-label">Quote</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${stats.prozent}%` }}></div>
      </div>
      {stats.prozent === 100 && stats.gesamt > 0 && (
        <p className="progress-label">🎉 Alle Aufgaben erledigt!</p>
      )}
    </div>
  );
}

export default Dashboard;
