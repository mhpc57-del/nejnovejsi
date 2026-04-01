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
- **Dostupné** (zelená) - zakázky v okolí/kategoriích dodavatele s mapou
- **Rozdělané** (červená) - probíhající zakázky + upload průběžných fotek
- **Dokončené** (šedá) - dokončené zakázky + finanční přehled
- **Nedokončené** (oranžová) - zrušené zakázky s důvody

### Core
- JWT auth, 3 role, multi-step registrace, ARES, 61 kategorií
- Tarify: Zákazník 99 Kč/měsíc, Dodavatel 399 Kč/měsíc

### Poptávky & Zakázky
- CRUD, stavy: open → in_progress → completed/cancelled
- Tlačítko "Dorazil jsem" + čas příjezdu
- Upload průběžných fotek, naúčtování částky, důvod zrušení

### Komunikace
- Real-time chat (polling 5s) + zvuková notifikace

### Hodnotící systém
- Hvězdičky 1-5 + procentuální hodnocení 0-100%
- Certifikace dodavatelů, Admin hodnocení důvěryhodnosti

### Upload
- Veřejný/autentizovaný endpoint, HEIC konverze, max 25 MB

### Klikatelné profily v detailu zakázky (1.4.2026)
- Jména zákazníka a dodavatele v sidebaru klikatelná → /profil/:id

### Automatický systém dochvilnosti (1.4.2026)
- Výpočet dochvilnosti při příjezdu (<=30min=100%, 30-60=90%, 60-120=70%, 120-240=50%, >240=30%)
- Celkové hodnocení = 80% recenze + 20% dochvilnost
- Badge "X% dochvilnost" na profilu dodavatele

### Fotoaparát při nahrávání fotky (1.4.2026)
- Popup menu s volbami "Vyfotit" (capture="user") a "Vybrat z galerie"
- Implementováno na RegisterPage + ProfilePage
- Click-outside dismiss, stopPropagation na toggle button

## Backlog
- P3: Mobilní aplikace + push notifikace (odloženo na konec)
