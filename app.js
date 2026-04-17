const STORAGE_KEY = 'seroquel_tracker_entries_v1';
const SETTINGS_KEY = 'seroquel_tracker_settings_v1';

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

function loadSettings() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function setDefaults() {
  $('nightDate').value = todayLocal();
  $('dayDate').value = todayLocal();
  const settings = loadSettings();
  ['remMed','remFood','remWake','rem11','rem12','rem15','rem17'].forEach(id => {
    if (settings[id]) $(id).value = settings[id];
  });
  $('chartEnd').value = todayLocal();
  $('chartStart').value = todayLocal(-29);
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

  const idx = entries.findIndex(e => e.date === date);
  const current = idx >= 0 ? entries[idx] : { date };
  current.medication = naMode ? 'NA' : ($('medTime').value || '');
  current.didNotTake = naMode;
  current.foods = [...tempFoods];
  current.updatedAt = new Date().toISOString();

  if (idx >= 0) entries[idx] = current;
  else entries.push(current);

  saveEntries(entries);
  renderEntries();
  refreshCharts();
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
    '11am': numberOrBlank($('d11').value),
    '12pm': numberOrBlank($('d12').value),
    '3pm': numberOrBlank($('d15').value),
    '5pm': numberOrBlank($('d17').value),
  };
  current.updatedAt = new Date().toISOString();

  if (idx >= 0) entries[idx] = current;
  else entries.push(current);

  saveEntries(entries);
  renderEntries();
  refreshCharts();
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
        <div><strong>11 AM:</strong> ${displayVal(e.drowsiness?.['11am'])}</div>
        <div><strong>12 PM:</strong> ${displayVal(e.drowsiness?.['12pm'])}</div>
        <div><strong>3 PM:</strong> ${displayVal(e.drowsiness?.['3pm'])}</div>
        <div><strong>5 PM:</strong> ${displayVal(e.drowsiness?.['5pm'])}</div>
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
    refreshCharts();
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
  const rows = [['date','medication','did_not_take','foods','wake_time','drowsiness_11am','drowsiness_12pm','drowsiness_3pm','drowsiness_5pm','updated_at']];
  entries.forEach(e => {
    rows.push([
      e.date || '',
      e.medication || '',
      e.didNotTake ? 'yes' : 'no',
      (e.foods || []).map(f => `${f.time || ''} ${f.what || ''}`.trim()).join(' | '),
      e.wakeTime || '',
      e.drowsiness?.['11am'] ?? '',
      e.drowsiness?.['12pm'] ?? '',
      e.drowsiness?.['3pm'] ?? '',
      e.drowsiness?.['5pm'] ?? '',
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

function pad(n) {
  return String(n).padStart(2, '0');
}

function makeICSDate(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function buildICS() {
  const startDate = todayLocal();
  const items = [
    ['Medication reminder', $('remMed').value],
    ['Late night food log', $('remFood').value],
    ['Wake-up log', $('remWake').value],
    ['11 AM drowsiness check', $('rem11').value],
    ['12 PM drowsiness check', $('rem12').value],
    ['3 PM drowsiness check', $('rem15').value],
    ['5 PM drowsiness check', $('rem17').value],
  ];

  let lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenAI//Seroquel Tracker//EN',
    'CALSCALE:GREGORIAN',
  ];

  items.forEach(([title, time], idx) => {
    const dt = makeICSDate(startDate, time);
    lines.push(
      'BEGIN:VEVENT',
      `UID:seroquel-${idx}-${Date.now()}@tracker.local`,
      `DTSTAMP:${dt}`,
      `DTSTART:${dt}`,
      'DURATION:PT5M',
      `RRULE:FREQ=DAILY`,
      `SUMMARY:${title}`,
      'BEGIN:VALARM',
      'TRIGGER:PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${title}`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function applyQuickRange() {
  const value = $('quickRange').value;
  if (value === 'all') {
    const entries = loadEntries().sort((a, b) => a.date.localeCompare(b.date));
    $('chartStart').value = entries[0]?.date || todayLocal(-29);
    $('chartEnd').value = entries[entries.length - 1]?.date || todayLocal();
    return;
  }
  const days = Number(value);
  $('chartEnd').value = todayLocal();
  $('chartStart').value = todayLocal(-(days - 1));
}

function getFilteredEntries() {
  const start = $('chartStart').value;
  const end = $('chartEnd').value;
  return loadEntries()
    .filter(e => (!start || e.date >= start) && (!end || e.date <= end))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function refreshCharts() {
  const entries = getFilteredEntries();
  renderSummaryStats(entries);
  drawMedicationChart(entries);
  drawAverageDrowsinessChart(entries);
  drawDailyTrendChart(entries);
  drawWakeChart(entries);
  renderDoctorSummary(entries);
}

function renderSummaryStats(entries) {
  const taken = entries.filter(e => e.medication && !e.didNotTake).length;
  const na = entries.filter(e => e.didNotTake).length;
  const foodNights = entries.filter(e => (e.foods || []).length > 0).length;
  const drowsyDays = entries.filter(e => averageDrowsiness(e) !== null).length;
  $('summaryStats').innerHTML = [
    statBox('Entries in range', entries.length),
    statBox('Medication taken', taken),
    statBox('NA / did not take', na),
    statBox('Nights with food logged', foodNights),
    statBox('Days with drowsiness data', drowsyDays)
  ].join('');
}

function statBox(label, value) {
  return `<div class="stat-box"><div class="note">${label}</div><strong>${value}</strong></div>`;
}

function averageDrowsiness(entry) {
  const vals = ['11am', '12pm', '3pm', '5pm']
    .map(k => entry.drowsiness?.[k])
    .filter(v => v !== '' && v !== undefined && v !== null && !Number.isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + Number(b), 0) / vals.length;
}

function avg(list) {
  return list.length ? list.reduce((a,b)=>a+b,0) / list.length : null;
}

function getDrowsinessAverages(entries) {
  return {
    '11 AM': avg(entries.map(e => e.drowsiness?.['11am']).filter(v => v !== '' && v !== undefined)),
    '12 PM': avg(entries.map(e => e.drowsiness?.['12pm']).filter(v => v !== '' && v !== undefined)),
    '3 PM': avg(entries.map(e => e.drowsiness?.['3pm']).filter(v => v !== '' && v !== undefined)),
    '5 PM': avg(entries.map(e => e.drowsiness?.['5pm']).filter(v => v !== '' && v !== undefined)),
  };
}

function parseTimeToMinutes(time) {
  if (!time || !time.includes(':')) return null;
  const [h, m] = time.split(':').map(Number);
  return (h * 60) + m;
}

function formatMinutes(mins) {
  if (mins === null || mins === undefined || Number.isNaN(mins)) return '—';
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${pad(m)} ${suffix}`;
}

function clearCanvas(canvasId) {
  const canvas = $(canvasId);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

function drawEmptyState(ctx, canvas, text) {
  ctx.fillStyle = '#56727b';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.textAlign = 'left';
}

function drawMedicationChart(entries) {
  const { canvas, ctx } = clearCanvas('medChart');
  if (!entries.length) return drawEmptyState(ctx, canvas, 'No data in this date range.');

  const margin = { top: 26, right: 24, bottom: 56, left: 56 };
  const w = canvas.width - margin.left - margin.right;
  const h = canvas.height - margin.top - margin.bottom;
  const barW = w / Math.max(entries.length, 1) * 0.7;

  drawAxes(ctx, margin, w, h, 1);
  ctx.fillStyle = '#56727b';
  ctx.font = '14px sans-serif';
  ctx.fillText('NA', 16, margin.top + 8);
  ctx.fillText('Taken', 8, margin.top + h + 4);

  entries.forEach((e, i) => {
    const x = margin.left + (i + 0.15) * (w / entries.length);
    const y = e.didNotTake ? margin.top : margin.top + h / 2;
    const barH = h / 2;
    ctx.fillStyle = e.didNotTake ? '#a63d40' : '#2f7d4f';
    ctx.fillRect(x, y, barW, barH);

    if (entries.length <= 12) {
      ctx.save();
      ctx.translate(x + 8, canvas.height - 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#56727b';
      ctx.font = '12px sans-serif';
      ctx.fillText(shortDate(e.date), 0, 0);
      ctx.restore();
    }
  });
}

function drawAverageDrowsinessChart(entries) {
  const { canvas, ctx } = clearCanvas('avgDrowsinessChart');
  const averages = getDrowsinessAverages(entries);
  const labels = Object.keys(averages);
  const vals = Object.values(averages);
  if (!vals.some(v => v !== null)) return drawEmptyState(ctx, canvas, 'No drowsiness data in this date range.');

  const margin = { top: 24, right: 24, bottom: 56, left: 56 };
  const w = canvas.width - margin.left - margin.right;
  const h = canvas.height - margin.top - margin.bottom;
  drawAxes(ctx, margin, w, h, 5);

  labels.forEach((label, i) => {
    const val = vals[i];
    const x = margin.left + (i + 0.25) * (w / labels.length);
    const barW = (w / labels.length) * 0.5;
    const barH = val === null ? 0 : (val / 5) * h;
    ctx.fillStyle = '#2d6a7f';
    ctx.fillRect(x, margin.top + h - barH, barW, barH);
    ctx.fillStyle = '#17323b';
    ctx.font = '13px sans-serif';
    ctx.fillText(label, x, canvas.height - 16);
    if (val !== null) ctx.fillText(val.toFixed(1), x + 8, margin.top + h - barH - 8);
  });
}

function drawDailyTrendChart(entries) {
  const { canvas, ctx } = clearCanvas('dailyTrendChart');
  const points = entries
    .map(e => ({ date: e.date, value: averageDrowsiness(e) }))
    .filter(p => p.value !== null);
  if (!points.length) return drawEmptyState(ctx, canvas, 'No daily drowsiness averages to plot.');

  const margin = { top: 24, right: 24, bottom: 56, left: 56 };
  const w = canvas.width - margin.left - margin.right;
  const h = canvas.height - margin.top - margin.bottom;
  drawAxes(ctx, margin, w, h, 5);

  ctx.strokeStyle = '#1f4b5c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = margin.left + (points.length === 1 ? w / 2 : (i * w / (points.length - 1)));
    const y = margin.top + h - ((p.value / 5) * h);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach((p, i) => {
    const x = margin.left + (points.length === 1 ? w / 2 : (i * w / (points.length - 1)));
    const y = margin.top + h - ((p.value / 5) * h);
    ctx.fillStyle = '#1f4b5c';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (points.length <= 12) {
      ctx.save();
      ctx.translate(x - 10, canvas.height - 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#56727b';
      ctx.font = '12px sans-serif';
      ctx.fillText(shortDate(p.date), 0, 0);
      ctx.restore();
    }
  });
}

function drawWakeChart(entries) {
  const { canvas, ctx } = clearCanvas('wakeChart');
  const points = entries
    .map(e => ({ date: e.date, value: parseTimeToMinutes(e.wakeTime) }))
    .filter(p => p.value !== null);
  if (!points.length) return drawEmptyState(ctx, canvas, 'No wake-up times in this date range.');

  const min = Math.min(...points.map(p => p.value));
  const max = Math.max(...points.map(p => p.value));
  const range = Math.max(max - min, 30);
  const margin = { top: 24, right: 24, bottom: 56, left: 70 };
  const w = canvas.width - margin.left - margin.right;
  const h = canvas.height - margin.top - margin.bottom;

  ctx.strokeStyle = '#d6e1e5';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = margin.top + (i * h / 4);
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + w, y);
    ctx.stroke();
    const labelMins = Math.round(max - (i * range / 4));
    ctx.fillStyle = '#56727b';
    ctx.font = '12px sans-serif';
    ctx.fillText(formatMinutes(labelMins), 8, y + 4);
  }
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + h);
  ctx.lineTo(margin.left + w, margin.top + h);
  ctx.stroke();

  ctx.strokeStyle = '#c08a1b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = margin.left + (points.length === 1 ? w / 2 : (i * w / (points.length - 1)));
    const y = margin.top + ((max - p.value) / range) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach((p, i) => {
    const x = margin.left + (points.length === 1 ? w / 2 : (i * w / (points.length - 1)));
    const y = margin.top + ((max - p.value) / range) * h;
    ctx.fillStyle = '#c08a1b';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (points.length <= 12) {
      ctx.save();
      ctx.translate(x - 10, canvas.height - 10);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#56727b';
      ctx.font = '12px sans-serif';
      ctx.fillText(shortDate(p.date), 0, 0);
      ctx.restore();
    }
  });
}

function drawAxes(ctx, margin, w, h, maxY) {
  ctx.strokeStyle = '#d6e1e5';
  ctx.lineWidth = 1;
  for (let i = 0; i <= maxY; i++) {
    const y = margin.top + h - (i / maxY) * h;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + w, y);
    ctx.stroke();
    ctx.fillStyle = '#56727b';
    ctx.font = '12px sans-serif';
    ctx.fillText(String(i), margin.left - 18, y + 4);
  }
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + h);
  ctx.lineTo(margin.left + w, margin.top + h);
  ctx.stroke();
}

function shortDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function renderDoctorSummary(entries) {
  const taken = entries.filter(e => e.medication && !e.didNotTake).length;
  const na = entries.filter(e => e.didNotTake).length;
  const wakeVals = entries.map(e => parseTimeToMinutes(e.wakeTime)).filter(v => v !== null);
  const avgWake = wakeVals.length ? Math.round(avg(wakeVals)) : null;
  const foodNights = entries.filter(e => (e.foods || []).length > 0);
  const foodAvg = avg(foodNights.map(e => averageDrowsiness(e)).filter(v => v !== null));
  const noFoodAvg = avg(entries.filter(e => !(e.foods || []).length).map(e => averageDrowsiness(e)).filter(v => v !== null));
  const dAvg = getDrowsinessAverages(entries);

  const bullets = [];
  bullets.push(`Entries reviewed: ${entries.length}. Medication logged as taken ${taken} times and as NA / did not take ${na} times.`);
  if (avgWake !== null) bullets.push(`Average wake-up time in this range: ${formatMinutes(avgWake)}.`);
  const validTimes = Object.entries(dAvg).filter(([,v]) => v !== null);
  if (validTimes.length) bullets.push(`Average drowsiness scores — ${validTimes.map(([k,v]) => `${k}: ${v.toFixed(1)}`).join('; ')}.`);
  if (foodAvg !== null && noFoodAvg !== null) bullets.push(`On nights with late food logged, next-day average drowsiness was ${foodAvg.toFixed(1)}. On nights without food logged, it was ${noFoodAvg.toFixed(1)}.`);
  if (!bullets.length) bullets.push('No summary available yet. Enter more data to build a report.');

  $('doctorSummary').innerHTML = `<ul>${bullets.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`;
}

$('markNA').addEventListener('click', () => {
  naMode = true;
  $('medTime').value = '';
  $('naStatus').textContent = 'Saved as NA / did not take.';
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
$('downloadICS').addEventListener('click', () => {
  downloadFile('seroquel-reminders.ics', buildICS(), 'text/calendar');
});
$('saveReminderSettings').addEventListener('click', () => {
  const settings = {};
  ['remMed','remFood','remWake','rem11','rem12','rem15','rem17'].forEach(id => settings[id] = $(id).value);
  saveSettings(settings);
  alert('Reminder times saved.');
});
$('clearAll').addEventListener('click', () => {
  if (!confirm('Clear all saved tracker data on this device?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderEntries();
  refreshCharts();
});
$('quickRange').addEventListener('change', () => {
  applyQuickRange();
  refreshCharts();
});
$('chartStart').addEventListener('change', refreshCharts);
$('chartEnd').addEventListener('change', refreshCharts);
$('refreshCharts').addEventListener('click', refreshCharts);
$('printReport').addEventListener('click', () => window.print());

setDefaults();
renderFoodList();
renderEntries();
refreshCharts();
