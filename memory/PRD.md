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

### Dashboard dodavatele (nový)
- **Dostupné** (zelená) - zakázky v okolí/kategoriích dodavatele s mapou
- **Rozdělané** (červená) - probíhající zakázky + upload průběžných fotek
- **Dokončené** (šedá) - dokončené zakázky se seznamem zákazníků a naúčtovanými cenami + finanční přehled (celkové příjmy)
- **Nedokončené** (oranžová) - zrušené zakázky s důvody

### Finanční přehled dodavatele
- Celkové příjmy a počet dokončených zakázek v sidebaru
- Naúčtované částky u každé dokončené zakázky

### Core
- JWT auth, 3 role, multi-step registrace, ARES, 61 kategorií s filtrováním
- Tarify: Zákazník 99 Kč/měsíc, Dodavatel 399 Kč/měsíc

### Poptávky & Zakázky
- CRUD, stavy: open → in_progress → completed/cancelled
- Tlačítko "Dorazil jsem" + čas příjezdu
- Upload průběžných fotek během zakázky
- Naúčtování částky (invoice)
- Důvod zrušení zakázky

### Komunikace
- Real-time chat (polling 5s) + zvuková notifikace
- Status notifikace + čekající banner

### Hodnotící systém
- Hvězdičky 1-5 + procentuální hodnocení 0-100% s posuvníkem
- Certifikace dodavatelů (upload/správa)
- Admin hodnocení důvěryhodnosti (hvězdičky 1-5)

### Upload
- Veřejný/autentizovaný endpoint, HEIC konverze, max 25 MB

### Dashboard zákazníka
- Klikatelné stat karty s filtrovanými poptávkami

## API Endpoints (nové)
- POST /api/demands/{id}/progress-photo - průběžné foto
- POST /api/demands/{id}/invoice - naúčtování
- POST /api/demands/{id}/cancel-reason - důvod zrušení
- GET /api/suppliers/{id}/finances - finanční přehled

## Backlog
- P0: Uživatelské E2E testování
- P2: Automatický vliv času příjezdu na hodnocení
- P3: Mobilní aplikace + push notifikace
