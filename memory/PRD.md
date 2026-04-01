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

### Klikatelné profily v detailu zakázky (NOVÉ - 1.4.2026)
- Jména zákazníka a dodavatele v sidebaru DemandDetail jsou klikatelná
- Navigace na /profil/:id s kompletním read-only profilem (adresa, telefon, email, certifikace)

### Automatický systém dochvilnosti (NOVÉ - 1.4.2026)
- Výpočet dochvilnosti při příjezdu dodavatele (<=30min=100%, 30-60=90%, 60-120=70%, 120-240=50%, >240=30%)
- Průměrná dochvilnost (punctuality_score) uložena na profilu dodavatele
- Celkové hodnocení = 80% recenze + 20% dochvilnost
- Badge "X% dochvilnost" zobrazený na profilu dodavatele

## API Endpoints (nové)
- POST /api/demands/{id}/progress-photo - průběžné foto
- POST /api/demands/{id}/invoice - naúčtování
- POST /api/demands/{id}/cancel-reason - důvod zrušení
- GET /api/suppliers/{id}/finances - finanční přehled
- POST /api/demands/{id}/arrive - příjezd dodavatele + punctuality score

## Backlog
- P2: Automatický vliv času příjezdu na hodnocení ✅ HOTOVO
- P3: Mobilní aplikace + push notifikace (odloženo na konec)
