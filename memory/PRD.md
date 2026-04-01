# CraftBolt - PRD & Project Status

## Základní informace
- **Projekt:** CraftBolt.cz - Platforma pro propojení zákazníků s řemeslníky
- **Doména:** craftbolt.cz
- **Poslední aktualizace:** 1. 4. 2026

## Architektura
- Frontend: React.js + Tailwind CSS + Leaflet
- Backend: FastAPI - modulární routes
- Databáze: MongoDB
- Integrace: Stripe (MOCKED), Twilio, Wedos SMTP

## Implementováno

### Dashboardy
- Zákazník: stat karty → modal popup, nová poptávka s termínem realizace
- Dodavatel: 4 kategorie, mapa (h-80, scroll zoom), finanční přehled
- Mobilní bottom navigation bar na obou

### Deaktivace účtu
- 2-krokový modal (varování → heslo), backend deaktivace, admin obnovení

### Poptávky
- CRUD + **požadovaný termín realizace** (deadline)
- Příjezd, dochvilnost, fotky, fakturace, zrušení

### Email notifikace
- Oznamovací email dodavatelům nyní obsahuje **iniciály/jméno zákazníka**

### UX vylepšení
- Větší a černé texty na celé platformě (text-sm, text-gray-900/700)
- Větší mapa v Dostupných zakázkách + scroll wheel zoom
- Fotomenu: Vyfotit/Galerie
- Klikatelné profily v sidebaru zakázky

### Core
- JWT auth, 3 role, ARES, 61 kategorií, chat polling, hodnocení + dochvilnost

## Backlog
- P3: Mobilní aplikace + push notifikace (odloženo)
