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

### Dashboard dodavatele
- 4 kategorie: Dostupné, Rozdělané, Dokončené, Nedokončené
- Finanční přehled, mobilní bottom nav

### Dashboard zákazníka
- Stat karty → modal popup s filtrovanými poptávkami
- Mobilní bottom nav (Domů, Přehled, +Nová poptávka, Profil, Odhlásit)

### Core
- JWT auth, 3 role, multi-step registrace, ARES, 61 kategorií
- Tarify: Zákazník 99 Kč/měsíc, Dodavatel 399 Kč/měsíc

### Poptávky & Zakázky
- CRUD, stavy: open → in_progress → completed/cancelled
- Dorazil jsem + dochvilnost + průběžné fotky + fakturace + zrušení

### Komunikace
- Real-time chat (polling 5s) + zvuková notifikace

### Hodnotící systém
- Hvězdičky 1-5 + % hodnocení (80% recenze + 20% dochvilnost)
- Certifikace dodavatelů, Admin trust score

### Upload & Fotky
- HEIC konverze, fotomenu: Vyfotit/Galerie

### Navigace
- Klikatelné profily v sidebaru zakázky
- Mobilní bottom navigation bar na obou dashboardech

## Backlog
- P3: Mobilní aplikace + push notifikace (odloženo)
