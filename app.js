const STORAGE_KEY = 'seroquel_tracker_entries_v1';
let tempFoods = [];
let naMode = false;

const $ = (id) => document.getElementById(id);

function todayLocal(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function loadEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function setDefaults() {
  $('nightDate').value = todayLocal();
  $('dayDate').value = todayLocal();
}

function renderFoodList() {
  $('foodList').innerHTML = tempFoods.map((f, idx) =>
    `<li>${f.time || 'No time'} — ${escapeHtml(f.what)} <button onclick="removeFood(${idx})" class="secondary" style="margin-left:8px;padding:4px 8px;font-size:12px;">Remove</button></li>`
  ).join('');
}

window.removeFood = function(idx) {
  tempFoods.splice(idx, 1);
  renderFoodList();
};

function clearNightForm() {
  $('medTime').value = '';
  $('foodTime').value = '';
  $('foodWhat').value = '';
  tempFoods = [];
  naMode = false;
  $('naStatus').textContent = '';
  renderFoodList();
}


function isValid24HourTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function normalizeMedicationInput(raw) {
  return String(raw || '').trim();
}

function sanitizeMedicationTyping(raw) {
  let v = String(raw || '').replace(/[^\d:]/g, '');
  if (v.length > 5) v = v.slice(0, 5);
  if (v.length >= 2 && !v.includes(':')) {
    v = v.slice(0, 2) + ':' + v.slice(2);
  }
  if (v.indexOf(':') !== -1) {
    const parts = v.split(':');
    v = parts[0].slice(0, 2) + ':' + (parts[1] || '').slice(0, 2);
  }
  return v;
}

function clearDayForm() {
  $('wakeTime').value = '';
  $('d11').value = '';
  $('d12').value = '';
  $('d15').value = '';
  $('d17').value = '';
}

function saveNight() {
  const entries = loadEntries();
  const date = $('nightDate').value;
  if (!date) return alert('Please choose a night date.');

  const medTime = normalizeMedicationInput($('medTime').value);
  if (!naMode && !isValid24HourTime(medTime)) return alert('Enter medication time as HH:MM in 24-hour time, for example 21:30, or use NA.');

  const idx = entries.findIndex(e => e.date === date);
  const current = idx >= 0 ? entries[idx] : { date };
  current.medication = naMode ? 'NA' : medTime;
  current.didNotTake = naMode;
  current.foods = [...tempFoods];
  current.updatedAt = new Date().toISOString();

  if (idx >= 0) entries[idx] = current;
  else entries.push(current);

  saveEntries(entries);
  renderEntries();
  alert('Night entry saved.');
}

function saveDay() {
  const entries = loadEntries();
  const date = $('dayDate').value;
  if (!date) return alert('Please choose the morning date.');

  const idx = entries.findIndex(e => e.date === date);
  const current = idx >= 0 ? entries[idx] : { date };
  current.wakeTime = $('wakeTime').value || '';
  current.drowsiness = {
    '11:00': numberOrBlank($('d11').value),
    '12:00': numberOrBlank($('d12').value),
    '15:00': numberOrBlank($('d15').value),
    '17:00': numberOrBlank($('d17').value),
  };
  current.updatedAt = new Date().toISOString();

  if (idx >= 0) entries[idx] = current;
  else entries.push(current);

  saveEntries(entries);
  renderEntries();
  alert('Day check-in saved.');
}

function numberOrBlank(v) {
  return v === '' ? '' : Number(v);
}

function renderEntries() {
  const entries = loadEntries().sort((a,b) => b.date.localeCompare(a.date));
  const el = $('entries');
  if (!entries.length) {
    el.innerHTML = '<p class="note">No saved entries yet.</p>';
    return;
  }
  el.innerHTML = entries.map((e, idx) => `
    <div class="entry">
      <div class="inline-row between">
        <h3>${e.date}</h3>
        <button class="danger" onclick="deleteEntry(${idx})">Delete</button>
      </div>
      <div class="entry-grid">
        <div><strong>Medication:</strong> ${e.didNotTake ? 'NA / did not take' : (e.medication || '—')}</div>
        <div><strong>Wake-up:</strong> ${e.wakeTime || '—'}</div>
        <div><strong>11:00:</strong> ${displayVal(e.drowsiness?.['11:00'])}</div>
        <div><strong>12:00:</strong> ${displayVal(e.drowsiness?.['12:00'])}</div>
        <div><strong>15:00:</strong> ${displayVal(e.drowsiness?.['15:00'])}</div>
        <div><strong>17:00:</strong> ${displayVal(e.drowsiness?.['17:00'])}</div>
      </div>
      <div style="margin-top:10px;"><strong>Late night foods:</strong> ${renderFoodsText(e.foods)}</div>
    </div>
  `).join('');

  window.deleteEntry = function(sortedIdx) {
    const latest = loadEntries().sort((a,b) => b.date.localeCompare(a.date));
    const toDelete = latest[sortedIdx]?.date;
    if (!toDelete) return;
    const kept = loadEntries().filter(e => e.date !== toDelete);
    saveEntries(kept);
    renderEntries();
  }
}

function displayVal(v) {
  return v === '' || v === undefined ? '—' : v;
}

function renderFoodsText(foods) {
  if (!foods || !foods.length) return 'None recorded';
  return foods.map(f => `${f.time || 'No time'} — ${escapeHtml(f.what)}`).join('; ');
}

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function exportCSV() {
  const entries = loadEntries();
  const rows = [['date','medication','did_not_take','foods','wake_time','drowsiness_1100','drowsiness_1200','drowsiness_1500','drowsiness_1700','updated_at']];
  entries.forEach(e => {
    rows.push([
      e.date || '',
      e.medication || '',
      e.didNotTake ? 'yes' : 'no',
      (e.foods || []).map(f => `${f.time || ''} ${f.what || ''}`.trim()).join(' | '),
      e.wakeTime || '',
      e.drowsiness?.['11:00'] ?? '',
      e.drowsiness?.['12:00'] ?? '',
      e.drowsiness?.['15:00'] ?? '',
      e.drowsiness?.['17:00'] ?? '',
      e.updatedAt || ''
    ]);
  });
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\n');
  downloadFile('seroquel-tracker-export.csv', csv, 'text/csv');
}

function csvCell(v) {
  const s = String(v ?? '');
  return `"${s.replaceAll('"','""')}"`;
}

function exportJSON() {
  downloadFile('seroquel-tracker-export.json', JSON.stringify(loadEntries(), null, 2), 'application/json');
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

$('markNA').addEventListener('click', () => {
  naMode = true;
  $('medTime').value = '';
  $('naStatus').textContent = 'Saved as NA / did not take.';
});

$('medTime').addEventListener('input', (e) => {
  const cleaned = sanitizeMedicationTyping(e.target.value);
  if (e.target.value !== cleaned) e.target.value = cleaned;
  if (cleaned.length) {
    naMode = false;
    $('naStatus').textContent = '';
  }
});

$('medTime').addEventListener('blur', () => {
  const value = normalizeMedicationInput($('medTime').value);
  if (!value) return;
  if (!isValid24HourTime(value)) {
    $('naStatus').textContent = 'Use HH:MM in 24-hour time, for example 21:30.';
  } else {
    $('naStatus').textContent = '';
  }
});

$('addFood').addEventListener('click', () => {
  const time = $('foodTime').value;
  const what = $('foodWhat').value.trim();
  if (!time && !what) return alert('Enter a food time, a food item, or both.');
  tempFoods.push({ time, what });
  $('foodTime').value = '';
  $('foodWhat').value = '';
  renderFoodList();
});

$('saveNight').addEventListener('click', saveNight);
$('saveDay').addEventListener('click', saveDay);
$('resetNight').addEventListener('click', clearNightForm);
$('resetDay').addEventListener('click', clearDayForm);
$('exportCSV').addEventListener('click', exportCSV);
$('exportJSON').addEventListener('click', exportJSON);
$('clearAll').addEventListener('click', () => {
  if (!confirm('Clear all saved tracker data on this device?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderEntries();
});

setDefaults();
renderFoodList();
renderEntries();
