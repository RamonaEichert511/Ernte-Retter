function RezeptKarte({ recipe, onKlick }) {
  return (
    <div className="rezept-karte" onClick={onKlick}>
      <img src={recipe.image} alt={recipe.title} />
      <h3>{recipe.title}</h3>
    </div>
  );
}

export default RezeptKarte;