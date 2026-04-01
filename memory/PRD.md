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

### Systém přijímání zakázek (NOVÉ 1.4.2026)
- **Závazně přijmout** — přijme zakázku (dříve "Přijmout zakázku")
- **Nezávazně přijmout** — 5 předdefinovaných důvodů, uloží se na zakázku + notifikace zákazníkovi (email+SMS)
- **Spustit chat** — chat je skrytý, zobrazí se až po kliknutí (pro open demands)
- Nezávazné nabídky viditelné v detailu zakázky pro oba uživatele
- Backend: POST /api/demands/{id}/soft-accept

### Dashboardy
- Zákazník: stat karty → modal popup, nová poptávka s termínem realizace
- Dodavatel: 4 kategorie, mapa (h-80, scroll zoom), finanční přehled
- Mobilní bottom navigation bar, deaktivace účtu

### Poptávky
- CRUD + požadovaný termín realizace (deadline)
- Příjezd, dochvilnost, fotky, fakturace, zrušení

### Email notifikace
- Nová poptávka: obsahuje jméno zákazníka
- Nezávazné přijetí: dodavatel+důvod odesláno zákazníkovi

### UX
- Větší a černé texty, větší mapa + scroll zoom
- Fotomenu: Vyfotit/Galerie, klikatelné profily

### Core
- JWT auth, 3 role, ARES, 61 kategorií, chat polling, hodnocení + dochvilnost

## Backlog
- P3: Mobilní aplikace + push notifikace (odloženo)
