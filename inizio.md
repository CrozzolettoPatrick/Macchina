# CarLock - App per ricordare se hai chiuso la macchina

## Descrizione

Applicazione web mobile-first che permette all'utente di registrare la posizione del parcheggio al momento della chiusura della macchina, e di essere guidato fino ad essa tramite Google Maps o Apple Maps.

---

## Flusso utente

1. **Stato iniziale** — bottone grande verde con scritta **"CHIUDI"**
2. **Click su "CHIUDI"** — l'app acquisisce la posizione GPS del dispositivo e la salva
3. **Stato "macchina chiusa"** — l'interfaccia cambia:
   - Messaggio: *"Macchina chiusa ✓"*
   - Bottone secondario: **"PORTAMI ALLA MACCHINA"**
4. **Click su "PORTAMI ALLA MACCHINA"** — apre Google Maps (Android) o Mappe (iOS) con destinazione il punto salvato
5. **Reset automatico** — quando l'utente si avvicina alla posizione salvata (entro ~50 metri), l'app torna allo stato iniziale

---

## Funzionalità principali

| Funzionalità | Dettaglio |
|---|---|
| Registrazione posizione | Geolocation API del browser |
| Salvataggio stato | `localStorage` (nessun backend necessario) |
| Navigazione esterna | URL scheme: `geo:` / `maps://` / `https://maps.google.com` |
| Reset automatico | Watchposition GPS — confronto distanza con posizione salvata |
| Supporto offline | ServiceWorker / PWA per uso senza connessione |

---

## Stack tecnologico

- **Frontend**: HTML5 + CSS3 + JavaScript vanilla (nessun framework, massima leggerezza)
- **Storage**: `localStorage` per persistenza tra sessioni
- **Geolocalizzazione**: `navigator.geolocation` (Geolocation API)
- **Deploy**: statico — GitHub Pages, Netlify o Vercel
- **PWA**: `manifest.json` + ServiceWorker per installazione su homescreen

---

## Struttura file del progetto

```
carlock/
├── index.html          # unica pagina
├── style.css           # stili, focus su mobile
├── app.js              # logica applicazione
├── manifest.json       # configurazione PWA
├── sw.js               # service worker (offline)
└── icons/              # icone app (192x192, 512x512)
```

---

## Dettaglio tecnico: apertura mappe esterne

```js
function apriMappa(lat, lng) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `maps://maps.apple.com/?daddr=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, '_blank');
}
```

---

## Dettaglio tecnico: reset automatico per prossimità

```js
const SOGLIA_METRI = 50;

function calcolaDistanza(lat1, lon1, lat2, lon2) {
  // Formula Haversine
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

---

## Stati dell'applicazione

```
[ IDLE ]
    │
    │ click "CHIUDI" + salvataggio GPS
    ▼
[ CHIUSA ]
    │
    │ utente si avvicina (< 50m) → reset automatico
    ▼
[ IDLE ]
```

---

## UI / Design

- **Mobile-first**, ottimizzata per uso con una mano
- Bottone principale occupa almeno il 60% dello schermo
- Colori:
  - Stato IDLE: verde `#2ECC71` — "pronto a chiudere"
  - Stato CHIUSA: rosso `#E74C3C` — "macchina chiusa"
- Font grande e leggibile (min 18px)
- Nessuna navigazione complessa — tutto su una schermata

---

## Fasi di sviluppo

### Fase 1 — MVP
- [ ] Struttura HTML base
- [ ] Bottone "CHIUDI" con acquisizione GPS
- [ ] Salvataggio posizione in `localStorage`
- [ ] Cambio stato UI dopo click
- [ ] Bottone "PORTAMI ALLA MACCHINA" con apertura mappe

### Fase 2 — Reset automatico
- [ ] Monitoraggio continuo posizione con `watchPosition`
- [ ] Calcolo distanza con formula Haversine
- [ ] Reset automatico sotto soglia 50m
- [ ] Notifica visiva all'utente del reset

### Fase 3 — PWA
- [ ] `manifest.json` per installazione su homescreen
- [ ] ServiceWorker per funzionamento offline
- [ ] Icone app

### Fase 4 — Miglioramenti opzionali
- [ ] Mappa inline (Leaflet.js + OpenStreetMap) che mostra il punto salvato
- [ ] Indirizzo leggibile via reverse geocoding
- [ ] Storico ultimi parcheggi
- [ ] Notifica push di promemoria

---

## Note e vincoli

- La geolocalizzazione richiede **HTTPS** obbligatoriamente (eccetto localhost)
- Su iOS Safari, `watchPosition` funziona solo se la pagina è in primo piano
- Il reset automatico potrebbe non funzionare se il browser sospende la pagina in background — aggiungere un bottone manuale "Reset" come fallback
- Nessun account o backend necessario nella versione base: tutto gira nel browser
