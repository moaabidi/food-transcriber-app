let recipes = [];
let selectedId = null;
let autoSaveTimer = null;

const $ = (id) => document.getElementById(id);

function current() {
  return recipes.find((r) => r.id === selectedId) || null;
}

function formatAmount(value) {
  if (value == null || Number.isNaN(value)) return '';
  const rounded = Math.round(value * 1000) / 1000;
  const whole = Math.floor(rounded);
  const frac = Math.round((rounded - whole) * 16) / 16;
  const fractions = {
    0.0625: '1/16', 0.125: '1/8', 0.1875: '3/16', 0.25: '1/4',
    0.3125: '5/16', 0.375: '3/8', 0.4375: '7/16', 0.5: '1/2',
    0.5625: '9/16', 0.625: '5/8', 0.6875: '11/16', 0.75: '3/4',
    0.8125: '13/16', 0.875: '7/8', 0.9375: '15/16'
  };
  if (frac === 0) return String(whole);
  const fraction = fractions[frac];
  if (!fraction) return String(rounded);
  return whole ? `${whole} ${fraction}` : fraction;
}

function parseAmount(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const mixed = raw.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = raw.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return null;
}

async function persist(message = 'Saved') {
  await chrome.storage.local.set({ recipes });
  $('saveStatus').textContent = message;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => $('saveStatus').textContent = 'Changes save automatically.', 1500);
}

function queueSave() {
  $('saveStatus').textContent = 'Saving…';
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => persist(), 500);
}

function renderList(filter = '') {
  const q = filter.trim().toLowerCase();
  const list = $('recipeList');
  list.innerHTML = '';
  const shown = recipes.filter((entry) => {
    const haystack = [entry.recipe.recipe_name, ...(entry.recipe.ingredients || []).map((i) => i.item)].join(' ').toLowerCase();
    return !q || haystack.includes(q);
  });

  $('emptyState').classList.toggle('hidden', recipes.length > 0);
  shown.forEach((entry) => {
    const btn = document.createElement('button');
    btn.className = `recipeCard ${entry.id === selectedId ? 'active' : ''}`;
    const title = document.createElement('strong');
    title.textContent = entry.recipe.recipe_name || 'Untitled recipe';
    const meta = document.createElement('span');
    meta.textContent = [entry.recipe.creator ? `@${entry.recipe.creator.replace(/^@/, '')}` : '', entry.recipe.yield_text || ''].filter(Boolean).join(' · ') || 'Saved recipe';
    btn.append(title, meta);
    btn.addEventListener('click', () => selectRecipe(entry.id));
    list.appendChild(btn);
  });
}

function ingredientRow(ing, index) {
  const row = document.createElement('div');
  row.className = 'ingredientRow';

  const qty = document.createElement('input');
  qty.placeholder = 'Amount';
  qty.value = ing.quantity_text || (ing.quantity_value != null ? formatAmount(ing.quantity_value) : '');
  qty.addEventListener('input', () => {
    const entry = current();
    const value = parseAmount(qty.value);
    entry.recipe.ingredients[index].quantity_text = qty.value || null;
    entry.recipe.ingredients[index].quantity_value = value;
    entry.recipe.ingredients[index].scalable = value != null;
    entry.originalRecipe.ingredients[index].quantity_text = qty.value || null;
    entry.originalRecipe.ingredients[index].quantity_value = value;
    entry.originalRecipe.ingredients[index].scalable = value != null;
    queueSave();
  });

  const unit = document.createElement('input');
  unit.placeholder = 'Unit';
  unit.value = ing.unit || '';
  unit.addEventListener('input', () => {
    const entry = current();
    entry.recipe.ingredients[index].unit = unit.value || null;
    entry.originalRecipe.ingredients[index].unit = unit.value || null;
    queueSave();
  });

  const item = document.createElement('input');
  item.placeholder = 'Ingredient';
  item.value = ing.item || '';
  item.addEventListener('input', () => {
    const entry = current();
    entry.recipe.ingredients[index].item = item.value;
    entry.originalRecipe.ingredients[index].item = item.value;
    queueSave();
  });

  const notes = document.createElement('input');
  notes.className = 'notesField';
  notes.placeholder = 'Notes, e.g. finely chopped';
  notes.value = ing.notes || '';
  notes.addEventListener('input', () => {
    const entry = current();
    entry.recipe.ingredients[index].notes = notes.value || null;
    entry.originalRecipe.ingredients[index].notes = notes.value || null;
    queueSave();
  });

  const remove = document.createElement('button');
  remove.className = 'iconBtn';
  remove.textContent = '×';
  remove.title = 'Remove ingredient';
  remove.addEventListener('click', () => {
    const entry = current();
    entry.recipe.ingredients.splice(index, 1);
    entry.originalRecipe.ingredients.splice(index, 1);
    renderEditor();
    persist('Ingredient removed');
  });

  row.append(qty, unit, item, notes, remove);
  return row;
}

function renderIngredients() {
  const container = $('ingredients');
  container.innerHTML = '';
  (current()?.recipe.ingredients || []).forEach((ing, index) => container.appendChild(ingredientRow(ing, index)));
}

function renderInstructions() {
  const container = $('instructions');
  container.innerHTML = '';
  (current()?.recipe.instructions || []).forEach((step, index) => {
    const row = document.createElement('div');
    row.className = 'stepRow';
    const num = document.createElement('div');
    num.className = 'stepNum';
    num.textContent = index + 1;
    const text = document.createElement('textarea');
    text.rows = 2;
    text.value = step;
    text.addEventListener('input', () => {
      current().recipe.instructions[index] = text.value;
      queueSave();
    });
    const remove = document.createElement('button');
    remove.className = 'iconBtn';
    remove.textContent = '×';
    remove.title = 'Remove step';
    remove.addEventListener('click', () => {
      current().recipe.instructions.splice(index, 1);
      renderInstructions();
      persist('Step removed');
    });
    row.append(num, text, remove);
    container.appendChild(row);
  });
}

function applyScale(targetServings) {
  const entry = current();
  if (!entry) return;
  const base = Number($('baseServings').value);
  const target = Number(targetServings);
  if (!(base > 0) || !(target > 0)) return;
  const ratio = target / base;

  entry.recipe.yield_servings = target;
  entry.recipe.yield_text = `${formatAmount(target)} servings`;
  entry.recipe.ingredients = entry.originalRecipe.ingredients.map((original) => {
    const copy = { ...original };
    if (original.scalable && original.quantity_value != null) {
      copy.quantity_value = original.quantity_value * ratio;
      copy.quantity_text = formatAmount(copy.quantity_value);
    }
    return copy;
  });
  renderIngredients();
  renderList($('search').value);
  queueSave();
}

function renderEditor() {
  const entry = current();
  $('editor').classList.toggle('hidden', !entry);
  if (!entry) return;

  $('name').value = entry.recipe.recipe_name || '';
  $('sourceMeta').textContent = [entry.recipe.creator ? `@${entry.recipe.creator.replace(/^@/, '')}` : '', entry.source?.webpage_url || ''].filter(Boolean).join(' · ');
  const base = entry.originalRecipe.yield_servings || entry.recipe.yield_servings || '';
  $('baseServings').value = base;
  $('servings').value = entry.recipe.yield_servings || base;
  $('notes').value = (entry.recipe.notes || []).join('\n');
  $('transcript').value = entry.transcript || '';
  renderIngredients();
  renderInstructions();
}

function selectRecipe(id) {
  selectedId = id;
  renderList($('search').value);
  renderEditor();
}

$('search').addEventListener('input', () => renderList($('search').value));

$('name').addEventListener('input', () => {
  current().recipe.recipe_name = $('name').value;
  renderList($('search').value);
  queueSave();
});

$('notes').addEventListener('input', () => {
  current().recipe.notes = $('notes').value.split('\n').map((x) => x.trim()).filter(Boolean);
  queueSave();
});

$('baseServings').addEventListener('change', () => {
  const entry = current();
  const value = Number($('baseServings').value);
  if (!(value > 0)) return;
  entry.originalRecipe.yield_servings = value;
  entry.originalRecipe.yield_text = `${formatAmount(value)} servings`;
  if (!Number($('servings').value)) $('servings').value = value;
  applyScale($('servings').value || value);
});

$('servings').addEventListener('change', () => applyScale($('servings').value));
$('minus').addEventListener('click', () => {
  const next = Math.max(0.25, (Number($('servings').value) || Number($('baseServings').value) || 1) - 1);
  $('servings').value = next;
  applyScale(next);
});
$('plus').addEventListener('click', () => {
  const next = (Number($('servings').value) || Number($('baseServings').value) || 1) + 1;
  $('servings').value = next;
  applyScale(next);
});
$('resetScale').addEventListener('click', () => {
  const entry = current();
  const base = Number($('baseServings').value) || entry.originalRecipe.yield_servings;
  if (!base) return;
  $('servings').value = base;
  entry.recipe = JSON.parse(JSON.stringify(entry.originalRecipe));
  renderEditor();
  persist('Scale reset');
});

$('addIngredient').addEventListener('click', () => {
  const blank = { item: '', quantity_value: null, quantity_text: null, unit: null, notes: null, scalable: false };
  current().recipe.ingredients.push({ ...blank });
  current().originalRecipe.ingredients.push({ ...blank });
  renderIngredients();
  queueSave();
});

$('addStep').addEventListener('click', () => {
  current().recipe.instructions.push('');
  renderInstructions();
  queueSave();
});

$('openSource').addEventListener('click', () => {
  const url = current()?.source?.webpage_url;
  if (url) chrome.tabs.create({ url });
});

$('duplicate').addEventListener('click', async () => {
  const entry = current();
  const copy = JSON.parse(JSON.stringify(entry));
  copy.id = crypto.randomUUID();
  copy.savedAt = new Date().toISOString();
  copy.recipe.recipe_name = `${copy.recipe.recipe_name || 'Recipe'} copy`;
  recipes.unshift(copy);
  selectedId = copy.id;
  await persist('Recipe duplicated');
  renderList();
  renderEditor();
});

$('delete').addEventListener('click', async () => {
  const entry = current();
  if (!entry || !confirm(`Delete “${entry.recipe.recipe_name || 'this recipe'}”?`)) return;
  recipes = recipes.filter((r) => r.id !== selectedId);
  selectedId = recipes[0]?.id || null;
  await persist('Recipe deleted');
  renderList();
  renderEditor();
});

$('saveNow').addEventListener('click', () => persist('Saved ✓'));

(async function init() {
  const stored = await chrome.storage.local.get('recipes');
  recipes = stored.recipes || [];
  selectedId = recipes[0]?.id || null;
  renderList();
  renderEditor();
})();
