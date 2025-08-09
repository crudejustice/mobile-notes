const form = document.getElementById('note-form');
const textarea = document.getElementById('note');
const tagsInput = document.getElementById('tags');
const listEl = document.getElementById('list');
const searchInput = document.getElementById('search');
const tagFilterRow = document.getElementById('tag-filter');

const STORAGE_KEY = 'pocket-notes:v2';

function loadRaw(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? []; }
  catch { return []; }
}

// --- migration v1 -> v2
function migrateIfNeeded() {
  const v2 = loadRaw(STORAGE_KEY);
  if (v2.length) return v2;

  const v1 = loadRaw('pocket-notes:v1');
  if (!v1.length) return [];

  const migrated = v1.map(n => ({ text: n.text, ts: n.ts ?? Date.now(), tags: [] }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

function load() { return migrateIfNeeded(); }
function save(notes) { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }

// Parse tags from input: "work, errands" or "#work #errands"
function parseTags(str) {
  if (!str) return [];
  const cleaned = str.replace(/#/g, ' ').split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  // dedupe
  return [...new Set(cleaned)];
}

let state = {
  notes: load(),
  search: '',
  activeTag: null, // string or null
};

function byNewest(a, b){ return b.ts - a.ts; }

function allTags(notes) {
  const bag = new Set();
  notes.forEach(n => (n.tags||[]).forEach(t => bag.add(t)));
  return Array.from(bag).sort();
}

function renderTagFilter() {
  const tags = allTags(state.notes);
  tagFilterRow.innerHTML = '';
  if (!tags.length) return;

  // "All" chip
  const all = document.createElement('div');
  all.textContent = 'All';
  all.className = 'tag-chip' + (state.activeTag === null ? ' active' : '');
  all.addEventListener('click', () => { state.activeTag = null; render(state.notes); });
  tagFilterRow.appendChild(all);

  tags.forEach(tag => {
    const chip = document.createElement('div');
    chip.textContent = `#${tag}`;
    chip.className = 'tag-chip' + (state.activeTag === tag ? ' active' : '');
    chip.addEventListener('click', () => { state.activeTag = (state.activeTag === tag ? null : tag); render(state.notes); });
    tagFilterRow.appendChild(chip);
  });
}

function render(notes) {
  // filters
  const q = state.search.trim().toLowerCase();
  const filtered = notes
    .filter(n => (!q || n.text.toLowerCase().includes(q)))
    .filter(n => (!state.activeTag || (n.tags||[]).includes(state.activeTag)))
    .sort(byNewest);

  listEl.innerHTML = '';
  filtered.forEach((n, i) => {
    const item = document.createElement('div');
    item.className = 'note-item';

    const left = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = n.text;
    left.appendChild(p);

    if (n.tags?.length) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'note-tags';
      n.tags.forEach(t => {
        const span = document.createElement('span');
        span.className = 'note-tag';
        span.textContent = `#${t}`;
        tagsWrap.appendChild(span);
      });
      left.appendChild(tagsWrap);
    }

    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      const idx = state.notes.findIndex(x => x.ts === n.ts);
      if (idx !== -1) {
        const updated = [...state.notes.slice(0, idx), ...state.notes.slice(idx+1)];
        state.notes = updated; save(updated); render(updated); renderTagFilter();
      }
    });

    item.append(left, del);
    listEl.appendChild(item);
  });

  renderTagFilter();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = textarea.value.trim();
  const tags = parseTags(tagsInput.value);
  if (!text) return;

  const note = { text, ts: Date.now(), tags };
  const updated = [note, ...state.notes];
  state.notes = updated; save(updated);

  textarea.value = '';
  tagsInput.value = '';
  render(updated);
});

searchInput?.addEventListener('input', (e) => {
  state.search = e.target.value || '';
  render(state.notes);
});

// first paint
render(state.notes);
