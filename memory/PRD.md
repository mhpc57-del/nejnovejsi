# CraftBolt - PRD & Project Status

## Základní informace
- **Projekt:** CraftBolt.cz - Platforma pro propojení zákazníků s řemeslníky
- **Doména:** craftbolt.cz (DNS aktivní)
- **Poslední aktualizace:** 1. 4. 2026

## Architektura (modulární)
- Frontend: React.js + Tailwind CSS + Leaflet
- Backend: FastAPI - modulární routes (auth, users, demands, messages, reviews, uploads, payments, admin, misc)
- Databáze: MongoDB
- Integrace: Stripe, Twilio, Wedos SMTP

## Implementováno

### Dashboard dodavatele + zákazníka
- Stat karty → modal popup, mobilní bottom nav
- 4 kategorie dodavatele: Dostupné, Rozdělané, Dokončené, Nedokončené

### Deaktivace účtu (1.4.2026)
- 2-krokový modal: varování → zadání hesla
- Backend: POST /api/auth/deactivate (vyžaduje heslo)
- Login blokován pro deaktivované účty (403 + česká hláška)
- Admin obnovení: PUT /api/admin/users/{id}/reactivate
- Tlačítko v sidebaru obou dashboardů

### Core
- JWT auth, 3 role, multi-step registrace, ARES, 61 kategorií
- Tarify: Zákazník 99 Kč/měsíc, Dodavatel 399 Kč/měsíc

### Poptávky & Zakázky
- CRUD, stavy, příjezd, dochvilnost, fotky, fakturace, zrušení

### Komunikace
- Real-time chat (polling 5s) + zvuková notifikace

### Hodnotící systém
- Hvězdičky + % (80% recenze + 20% dochvilnost), certifikace, trust score

### Upload & Fotky
- HEIC konverze, fotomenu: Vyfotit/Galerie

### Navigace
- Klikatelné profily v sidebaru zakázky
- Mobilní bottom navigation bar

## Backlog
- P3: Mobilní aplikace + push notifikace (odloženo)
