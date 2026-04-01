# CraftBolt - PRD & Project Status

## Základní informace
- **Projekt:** CraftBolt.cz - Platforma pro propojení zákazníků s řemeslníky
- **Doména:** craftbolt.cz (DNS aktivní, funguje)
- **Provozovatel:** AC/DC MONT s.r.o., IČO: 097 44 550, Sportovní 7, 789 63 Ruda nad Moravou
- **Poslední aktualizace:** 1. 4. 2026

---

## Architektura
- **Frontend:** React.js + Tailwind CSS + Leaflet + Phosphor Icons
- **Backend:** FastAPI (Python) + Motor (MongoDB async)
- **Databáze:** MongoDB
- **Platební brána:** Stripe (testovací režim, emergentintegrations)
- **SMS:** Twilio (Alphanumeric Sender ID: "CraftBolt")
- **Email:** SMTP Wedos (info@craftbolt.cz)

---

## Implementováno

### Autentizace & Uživatelé
- JWT autentizace, 3 role: Zákazník, Dodavatel, Admin
- Multi-step registrace, 14denní trial, ARES integrace

### Tarify
| Tarif | Cena | Role |
|-------|------|------|
| Zákazník | 99 Kč/měsíc bez DPH | customer |
| Dodavatel | 399 Kč/měsíc bez DPH | supplier |

### Poptávky & Zakázky
- 61 kategorií služeb, geocoding + mapa
- Stavy: open → in_progress → completed/cancelled

### Komunikace
- **Real-time chat** s polling každých 5 sekund
- **Zvuková notifikace** (Web Audio API) při nové zprávě od protistrany
- **Status notifikace** - popup při změně stavu zakázky
- **Čekající banner** pro zákazníka: "Nyní vyčkejte, až dodavatel dorazí"

### Upload souborů
- Veřejný endpoint `/api/upload/public` (bez autentizace - pro registraci)
- Formáty: JPEG, PNG, WebP, GIF, HEIC, HEIF, BMP, TIFF, AVIF
- HEIC→JPEG konverze, max 25 MB

### Adresový našeptávač (registrace)
- Nominatim API s debounce 400ms
- Leaflet mapa s markerem po výběru adresy
- Funguje pro všechna adresová pole

### Filtrování kategorií (registrace)
- Vyhledávací pole s ikonou lupy
- Case-insensitive filtrování 61 kategorií
- Možnost přidat vlastní kategorii

### Dashboard zákazníka
- **Klikatelné stat karty** (Celkem, Otevřené, Probíhající, Dokončené)
- Kliknutím se zobrazí filtrovaný seznam poptávek
- Sekce "Moje poptávky" odstraněna (nahrazena klikatelnými kartami)

### Notifikace
| Událost | Email | SMS | Popup |
|---------|-------|-----|-------|
| Registrace | OK | - | - |
| Nová poptávka | OK | OK | - |
| Zakázka přijata | OK | OK | OK (zelený banner) |
| Nová zpráva | OK | OK | Zvuk (pípnutí) |
| Změna stavu | OK | OK | OK (banner) |
| Platba úspěšná | OK | - | - |

---

## Backlog

### P0 - K otestování uživatelem
- 4 registrační cesty (zákazník + dodavatel × nepodnikatel/OSVČ/firma)
- Upload fotky, adresový našeptávač, email, SMS
- Chat v reálném čase + zvukové notifikace
- Klikatelné stat karty na mobilu

### P2 - Hodnotící systém (příští iterace)
- Procentuální hodnocení 0-100% s posuvníkem
- Tlačítko "Dodavatel dorazil" + sledování času příjezdu
- Čas příjezdu ovlivňuje hodnocení dodavatele
- Certifikace dodavatelů (nahrání certifikátů, oprávnění)
- Admin hodnocení důvěryhodnosti (hvězdičky 1-5)

### P3 - Budoucí úkoly
- Mobilní aplikace (iOS + Android) + push notifikace
- Refaktoring server.py (1300+ řádků) na moduly

---

## DNS (Wedos)
- A @ → 162.159.142.117 (TTL 300)
- A @ → 172.66.2.113 (TTL 300)
- CNAME www → craftbolt.cz (TTL 300)

## Stránky webu
- `/` - Homepage
- `/prihlaseni` - Přihlášení
- `/registrace` - Multi-step registrace
- `/cenik` - Ceník tarifů
- `/dashboard` - Dashboard (zákazník/dodavatel/admin)
- `/zakazka/:id` - Detail zakázky + chat
- `/obchodni-podminky`, `/kontakt`, `/podminky-opakovanych-plateb`
