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
- **Dostupné** (zelená), **Rozdělané** (červená), **Dokončené** (šedá), **Nedokončené** (oranžová)
- Finanční přehled celkových příjmů

### Dashboard zákazníka
- Stat karty (Celkem/Otevřené/Probíhající/Dokončené) → otevírají **modal popup** s filtrovanými poptávkami (mobile-friendly)
- Nová poptávka modal s mapou, geocoding, fotkami

### Core
- JWT auth, 3 role, multi-step registrace, ARES, 61 kategorií
- Tarify: Zákazník 99 Kč/měsíc, Dodavatel 399 Kč/měsíc

### Poptávky & Zakázky
- CRUD, stavy: open → in_progress → completed/cancelled
- Tlačítko "Dorazil jsem" + čas příjezdu + upload průběžných fotek + fakturace + zrušení

### Komunikace
- Real-time chat (polling 5s) + zvuková notifikace

### Hodnotící systém
- Hvězdičky 1-5 + procentuální hodnocení 0-100%
- Certifikace dodavatelů, Admin hodnocení důvěryhodnosti
- Automatická dochvilnost: 80% recenze + 20% punctuality

### Upload
- Veřejný/autentizovaný endpoint, HEIC konverze, max 25 MB
- Fotomenu: Vyfotit (fotoaparát) / Vybrat z galerie

### Klikatelné profily v detailu zakázky
- Jména zákazníka a dodavatele v sidebaru klikatelná → /profil/:id

## Backlog
- P3: Mobilní aplikace + push notifikace (odloženo na konec)
