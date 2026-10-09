function Navbar({ darkMode, toggleDarkMode }) {
  return (
    <header>
      <nav className="navbar">
        <div className="logo">Ernte Retter</div>
        <ul className="nav-links">
          <li><a href="#ueber-mich">🌱 Vom Beet auf den Teller</a></li>
          <li><a href="#rezepte">🥘 Ab in den Topf</a></li>
          <li><a href="#favouriten">❤️ Meine Favouriten</a></li>
          <li><a href="#info">📚 Einmach-Fibel</a></li>
          <li><a href="#wecker">🫙 Meine Vorratskammer</a></li>
          <li><a href="#marktplatz">🥕 Ernte teilen</a></li>
          <li><a href="#aufgaben">✅ Meine Aufgaben</a></li>
        </ul>
        <button className="mein-button" onClick={toggleDarkMode}>
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </nav>
    </header>
  );
}

export default Navbar;
