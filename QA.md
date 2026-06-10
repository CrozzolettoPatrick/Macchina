# QA — Risposte raccolte

## Nome
- **MacchinaLocker**

## Design
- Tema **scuro**
- Stile **minimale**
- **2 bottoni principali**: CHIUDI e APRI

## Funzionamento
- Reset automatico alla prossimità + **bottone manuale "APRI"** come fallback
- Mostrare a schermo **orario di chiusura** (es. "Chiusa oggi alle 14:32")
- **Note opzionali** al parcheggio — chatbox con X per chiuderla, non obbligatoria

## Mappe
- Apertura **automatica** in base al dispositivo (Google Maps su Android, Apple Maps su iOS)
- **Mappa inline** che mostra il punto salvato
- **Bottone** che apre l'app esterna per la navigazione

## Storico
- **Storico parcheggi** legato all'account utente

## Notifiche
- **Nessuna** notifica push

## Account
- Sistema di **login/registrazione** completo

## Tecnico
- **PWA** — installabile sull'homescreen
- Hosting: **Railway**
- Backend: **Node.js + Express**
- Database: **PostgreSQL**
- Frontend: HTML + CSS + JS vanilla, mobile-first
