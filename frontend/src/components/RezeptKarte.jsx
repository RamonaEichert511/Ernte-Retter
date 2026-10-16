function RezeptKarte({ recipe, onKlick }) {
  return (
    <article className="rezept-karte">
      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={recipe.title}
          loading="lazy"
        />
      )}

      <h3>{recipe.title}</h3>

      <button
        className="mein-button"
        type="button"
        onClick={onKlick}
      >
        Rezept ansehen
      </button>
    </article>
  );
}

export default RezeptKarte;