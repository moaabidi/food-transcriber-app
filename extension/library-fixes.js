// Keep Reset focused on scaling only. It restores ingredient amounts and serving count
// without overwriting recipe-name, notes, or instruction edits.
document.getElementById('resetScale').addEventListener('click', (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();

  const entry = current();
  if (!entry) return;

  const base = Number(document.getElementById('baseServings').value) || entry.originalRecipe.yield_servings;
  if (!base) return;

  document.getElementById('servings').value = base;
  entry.recipe.yield_servings = base;
  entry.recipe.yield_text = entry.originalRecipe.yield_text || `${formatAmount(base)} servings`;
  entry.recipe.ingredients = entry.originalRecipe.ingredients.map((ingredient) => ({ ...ingredient }));
  renderIngredients();
  renderList(document.getElementById('search').value);
  persist('Scale reset');
}, true);
