const API = 'http://127.0.0.1:5000';
let currentResult = null;

const $ = (id) => document.getElementById(id);

function setStatus(message, type = '') {
  const el = $('status');
  el.textContent = message;
  el.className = `status ${type}`;
}

async function getCurrentTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url || '';
}

function ingredientText(ing) {
  const amount = [ing.quantity_text, ing.unit].filter(Boolean).join(' ');
  return [amount, ing.item, ing.notes ? `(${ing.notes})` : ''].filter(Boolean).join(' ');
}

function renderResult(data) {
  currentResult = data;
  const r = data.recipe;
  $('recipeName').textContent = r.recipe_name || 'Untitled recipe';
  $('meta').textContent = [r.creator ? `@${r.creator.replace(/^@/, '')}` : '', r.yield_text || '', r.total_time || ''].filter(Boolean).join(' · ');

  $('ingredients').innerHTML = '';
  (r.ingredients || []).forEach((ing) => {
    const li = document.createElement('li');
    li.textContent = ingredientText(ing);
    $('ingredients').appendChild(li);
  });

  $('instructions').innerHTML = '';
  (r.instructions || []).forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    $('instructions').appendChild(li);
  });

  $('notes').innerHTML = '';
  (r.notes || []).forEach((note) => {
    const p = document.createElement('p');
    p.textContent = `• ${note}`;
    $('notes').appendChild(p);
  });

  $('missing').innerHTML = '';
  (r.missing_details || []).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    $('missing').appendChild(li);
  });

  $('transcript').textContent = data.transcript || '';
  $('result').classList.remove('hidden');
  $('saveBtn').textContent = 'Save';
  setStatus('Recipe extracted. Review it, then save it.', 'ok');
}

async function extractRecipe() {
  const url = $('url').value.trim();
  if (!url) {
    setStatus('Paste or open a TikTok/Instagram recipe first.', 'error');
    return;
  }

  $('extractBtn').disabled = true;
  $('result').classList.add('hidden');
  setStatus('Extracting audio, caption, and recipe details…');

  try {
    const health = await fetch(`${API}/health`);
    if (!health.ok) throw new Error('Local helper is not running. Start start.bat first.');

    const response = await fetch(`${API}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not extract this recipe.');
    renderResult(data);
  } catch (err) {
    setStatus(err.message.includes('Failed to fetch') ? 'Local helper is not running. Double-click start.bat, then try again.' : err.message, 'error');
  } finally {
    $('extractBtn').disabled = false;
  }
}

async function saveCurrentRecipe() {
  if (!currentResult) return;
  const { recipes = [] } = await chrome.storage.local.get('recipes');
  const saved = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    source: currentResult.source,
    transcript: currentResult.transcript,
    recipe: currentResult.recipe,
    originalRecipe: JSON.parse(JSON.stringify(currentResult.recipe))
  };
  recipes.unshift(saved);
  await chrome.storage.local.set({ recipes });
  $('saveBtn').textContent = 'Saved ✓';
  setStatus('Saved to My Recipes.', 'ok');
}

$('usePageBtn').addEventListener('click', async () => {
  $('url').value = await getCurrentTabUrl();
  setStatus('Using the current tab.');
});

$('extractBtn').addEventListener('click', extractRecipe);
$('saveBtn').addEventListener('click', saveCurrentRecipe);
$('libraryBtn').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('library.html') }));

document.addEventListener('DOMContentLoaded', async () => {
  const url = await getCurrentTabUrl();
  if (/tiktok\.com|instagram\.com/i.test(url)) $('url').value = url;
});
