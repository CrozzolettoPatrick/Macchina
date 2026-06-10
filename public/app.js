// MacchinaLocker

let currentParking = null;
let leafletMap = null;

// ── Init ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  setupAuthForm();
  setupAppButtons();

  if (localStorage.getItem('token')) {
    showAppView();
    loadCurrentParking();
  } else {
    showAuthView();
  }
});

// ── Views ─────────────────────────────────────────────────────────────
function showAuthView() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
}

function showAppView() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  document.getElementById('header-email').textContent = localStorage.getItem('userEmail') || '';
}

// ── Auth ──────────────────────────────────────────────────────────────
let currentTab = 'login';

function setupAuthForm() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = currentTab === 'login';
      document.getElementById('auth-submit').textContent = isLogin ? 'Accedi' : 'Registrati';
      document.getElementById('auth-password').autocomplete = isLogin ? 'current-password' : 'new-password';
      document.getElementById('auth-error').textContent = '';
    });
  });

  document.getElementById('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const btn = document.getElementById('auth-submit');

    btn.disabled = true;
    btn.textContent = '...';
    errorEl.textContent = '';

    try {
      const endpoint = currentTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errorEl.textContent = data.error || 'Errore di autenticazione';
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userEmail', data.user.email);
      showAppView();
      loadCurrentParking();
    } catch {
      errorEl.textContent = 'Errore di connessione';
    } finally {
      btn.disabled = false;
      btn.textContent = currentTab === 'login' ? 'Accedi' : 'Registrati';
    }
  });
}

function logout() {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  currentParking = null;
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  showAuthView();
}

// ── Buttons ───────────────────────────────────────────────────────────
function setupAppButtons() {
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('btn-chiudi').addEventListener('click', handleChiudi);
  document.getElementById('btn-apri').addEventListener('click', () => handleApri());
  document.getElementById('btn-navigate').addEventListener('click', navigateToCar);
  document.getElementById('history-toggle').addEventListener('click', toggleHistory);
  document.getElementById('btn-add-note').addEventListener('click', handleAddNote);
}

// ── State management ──────────────────────────────────────────────────
async function loadCurrentParking() {
  const parking = await apiGet('/api/parking/current');
  parking ? setLockedState(parking) : setIdleState();
}

function setIdleState() {
  currentParking = null;
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  document.getElementById('state-idle').classList.remove('hidden');
  document.getElementById('state-locked').classList.add('hidden');
}

function setLockedState(parking) {
  currentParking = parking;
  document.getElementById('state-idle').classList.add('hidden');
  document.getElementById('state-locked').classList.remove('hidden');

  document.getElementById('locked-time').textContent =
    `Parcheggiata ${formatDate(new Date(parking.parked_at))}`;

  const noteEl = document.getElementById('locked-note');
  if (parking.note) {
    noteEl.textContent = `"${parking.note}"`;
    noteEl.classList.remove('hidden');
    document.getElementById('btn-add-note').textContent = '✎ Modifica nota';
  } else {
    noteEl.classList.add('hidden');
    document.getElementById('btn-add-note').textContent = '+ Aggiungi nota';
  }

  initMap(parseFloat(parking.lat), parseFloat(parking.lng));
}

// ── CHIUDI ────────────────────────────────────────────────────────────
async function handleChiudi() {
  const btnChiudi = document.getElementById('btn-chiudi');
  btnChiudi.disabled = true;

  // 1. Acquisisci GPS
  showLoading(true);
  let position;
  try {
    position = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      })
    );
  } catch {
    showLoading(false);
    btnChiudi.disabled = false;
    alert('Impossibile ottenere la posizione GPS.\nVerifica di aver concesso i permessi di localizzazione.');
    return;
  }

  const { latitude: lat, longitude: lng } = position.coords;

  // 2. Salva il parcheggio (senza nota)
  let parking;
  try {
    parking = await apiPost('/api/parking', { lat, lng, note: null });
  } finally {
    showLoading(false);
  }

  if (!parking || parking.error) {
    btnChiudi.disabled = false;
    return;
  }

  // 3. Mostra lo stato locked
  setLockedState(parking);
}

// ── APRI ──────────────────────────────────────────────────────────────
async function handleApri() {
  if (!currentParking) return;
  await apiPatch(`/api/parking/${currentParking.id}/close`);
  setIdleState();
}

// ── AGGIUNGI NOTA ─────────────────────────────────────────────────────
async function handleAddNote() {
  if (!currentParking) return;
  const note = await showNoteModal();
  if (note === null) return;
  const updated = await apiPatchNote(`/api/parking/${currentParking.id}/note`, { note });
  if (updated && !updated.error) {
    currentParking = updated;
    const noteEl = document.getElementById('locked-note');
    if (note) {
      noteEl.textContent = `"${note}"`;
      noteEl.classList.remove('hidden');
      document.getElementById('btn-add-note').textContent = '✎ Modifica nota';
    } else {
      noteEl.classList.add('hidden');
      document.getElementById('btn-add-note').textContent = '+ Aggiungi nota';
    }
  }
}

// ── Navigazione ───────────────────────────────────────────────────────
function navigateToCar() {
  if (!currentParking) return;
  const lat = parseFloat(currentParking.lat);
  const lng = parseFloat(currentParking.lng);
  const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const url = isApple
    ? `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  window.open(url, '_blank');
}

// ── Mappa Leaflet ─────────────────────────────────────────────────────
function initMap(lat, lng) {
  setTimeout(() => {
    const el = document.getElementById('map');
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    leafletMap = L.map(el, { zoomControl: false, attributionControl: false }).setView([lat, lng], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(leafletMap);
    const icon = L.divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;background:#ff453a;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.6)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    L.marker([lat, lng], { icon }).addTo(leafletMap);
  }, 120);
}

// ── Modale note ───────────────────────────────────────────────────────
function showNoteModal() {
  return new Promise(resolve => {
    const modal = document.getElementById('note-modal');
    const input = document.getElementById('note-input');
    input.value = '';
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 50);

    const done = (value) => {
      modal.classList.add('hidden');
      resolve(value);
    };

    document.getElementById('note-confirm').onclick = () => done(input.value.trim() || null);
    document.getElementById('note-close').onclick = () => done(null);
  });
}

// ── Storico ───────────────────────────────────────────────────────────
async function toggleHistory() {
  const list = document.getElementById('history-list');
  const arrow = document.querySelector('.toggle-arrow');
  const isOpen = !list.classList.contains('hidden');

  if (isOpen) {
    list.classList.add('hidden');
    arrow.classList.remove('open');
    return;
  }

  arrow.classList.add('open');
  list.innerHTML = '<div class="history-empty">Caricamento...</div>';
  list.classList.remove('hidden');

  const history = await apiGet('/api/parking/history');

  if (!history || !history.length) {
    list.innerHTML = '<div class="history-empty">Nessun parcheggio salvato</div>';
    return;
  }

  list.innerHTML = history.map(p => {
    const parked = formatDate(new Date(p.parked_at));
    const status = p.closed_at
      ? `→ aperta ${formatDate(new Date(p.closed_at))}`
      : '<span style="color:#30d158">attiva</span>';
    return `
      <div class="history-item">
        <div class="history-item-time">📍 ${parked} ${status}</div>
        ${p.note ? `<div class="history-item-note">"${p.note}"</div>` : ''}
      </div>`;
  }).join('');
}

// ── Utilità ───────────────────────────────────────────────────────────
function formatDate(date) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const ieri = new Date(now); ieri.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === ieri.toDateString();
  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `oggi alle ${time}`;
  if (isYesterday) return `ieri alle ${time}`;
  return `il ${date.toLocaleDateString('it-IT')} alle ${time}`;
}

function showLoading(show) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}

// ── API helpers ───────────────────────────────────────────────────────
const token = () => localStorage.getItem('token');

async function apiGet(url) {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.status === 401) { logout(); return null; }
    return res.json();
  } catch { return null; }
}

async function apiPost(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body)
    });
    if (res.status === 401) { logout(); return null; }
    return res.json();
  } catch { return null; }
}

async function apiPatch(url) {
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.status === 401) { logout(); return null; }
    return res.json();
  } catch { return null; }
}

async function apiPatchNote(url, body) {
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body)
    });
    if (res.status === 401) { logout(); return null; }
    return res.json();
  } catch { return null; }
}
