# CraftBolt - PRD & Project Status

## Základní informace
- **Projekt:** CraftBolt.cz - Platforma pro propojení zákazníků s řemeslníky
- **Doména:** craftbolt.cz (DNS aktivní)
- **Provozovatel:** AC/DC MONT s.r.o., IČO: 097 44 550
- **Poslední aktualizace:** 1. 4. 2026

## Architektura (po refaktoringu)
- **Frontend:** React.js + Tailwind CSS + Leaflet + Phosphor Icons
- **Backend:** FastAPI (Python) - modulární struktura:
  - `server.py` - hlavní app, startup, middleware
  - `database.py` - MongoDB connection
  - `auth.py` - JWT helpers
  - `models.py` - Pydantic modely
  - `helpers.py` - user_to_response
  - `notifications.py` - Twilio SMS + Wedos SMTP
  - `routes/auth_routes.py` - registrace, login, me
  - `routes/users.py` - profil, certifikace, trust score
  - `routes/demands.py` - poptávky, příjezd dodavatele
  - `routes/messages.py` - chat zprávy
  - `routes/reviews.py` - hodnocení s % posuvníkem
  - `routes/uploads.py` - upload souborů
  - `routes/payments.py` - Stripe platby
  - `routes/admin.py` - admin statistiky
  - `routes/misc.py` - geocoding, ARES, kategorie
- **Databáze:** MongoDB
- **Integrace:** Stripe, Twilio, Wedos SMTP

## Implementováno

### Core
- JWT auth, 3 role, multi-step registrace, ARES, 61 kategorií
- Tarify: Zákazník 99 Kč/měsíc, Dodavatel 399 Kč/měsíc

### Poptávky & Zakázky
- CRUD, stavy: open → in_progress → completed/cancelled
- Geocoding + Leaflet mapa
- **Tlačítko "Dorazil jsem"** - dodavatel potvrdí příjezd, zaznamenání času příjezdu
- Průměrný čas příjezdu se ukládá do profilu dodavatele

### Komunikace
- Real-time chat (polling 5s) + zvuková notifikace (Web Audio API)
- Status notifikace (popup při změně stavu zakázky)
- Čekající banner pro zákazníka: "Nyní vyčkejte..."

### Hodnotící systém
- **Hvězdičky 1-5** (klasické)
- **Procentuální hodnocení 0-100%** s barevným posuvníkem (zelená 80+%, oranžová 50-79%, červená <50%)
- Oba typy se průměrují a zobrazují na profilu

### Certifikace dodavatelů
- Upload certifikátů, oprávnění, vyhlášek (CRUD)
- Zobrazení na profilu s možností stažení
- Počet certifikací viditelný v admin panelu

### Admin hodnocení důvěryhodnosti
- Hvězdičky 1-5 přímo v admin tabulce uživatelů
- Badge "Ověřeno" s hvězdičkami na profilu dodavatele

### Notifikace
| Událost | Email | SMS | Popup |
|---------|-------|-----|-------|
| Registrace | OK | - | - |
| Nová poptávka | OK | OK | - |
| Zakázka přijata | OK | OK | OK |
| Dodavatel dorazil | - | - | Badge |
| Nová zpráva | OK | OK | Zvuk |
| Platba úspěšná | OK | - | - |

### Upload
- Veřejný endpoint pro registraci, formáty: JPEG/PNG/WebP/GIF/HEIC/BMP/TIFF/AVIF
- HEIC→JPEG konverze, max 25 MB

### Adresový našeptávač
- Nominatim API, debounce 400ms, Leaflet mapa s markerem

### Filtrování kategorií
- Vyhledávací pole v registraci dodavatele

### Dashboard zákazníka
- Klikatelné stat karty s filtrovanými poptávkami

## Backlog

### P0 - Uživatelské testování
- Registrace (4 cesty), upload, chat, notifikace

### P2 - Budoucí
- Čas příjezdu automaticky ovlivňuje hodnocení dodavatele
- Mobilní aplikace + push notifikace

## DNS (Wedos)
- A @ → 162.159.142.117, 172.66.2.113 (TTL 300)
- CNAME www → craftbolt.cz (TTL 300)
