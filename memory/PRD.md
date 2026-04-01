# CraftBolt - PRD & Project Status

## Základní informace
- **Projekt:** CraftBolt.cz - Platforma pro propojení zákazníků s řemeslníky
- **Doména:** craftbolt.cz (DNS aktivní, funguje)
- **Provozovatel:** AC/DC MONT s.r.o., IČO: 097 44 550, Sportovní 7, 789 63 Ruda nad Moravou
- **Poslední aktualizace:** 1. 4. 2026

---

## Architektura
- **Frontend:** React.js + Tailwind CSS
- **Backend:** FastAPI (Python)
- **Databáze:** MongoDB
- **Platební brána:** Stripe (připraveno, testovací režim)
- **SMS:** Twilio (Alphanumeric Sender ID: "CraftBolt")
- **Email:** SMTP Wedos (info@craftbolt.cz)

---

## Implementováno

### Autentizace & Uživatelé
- JWT autentizace
- 3 role: Zákazník, Dodavatel, Admin
- Multi-step registrace
- 14denní trial pro všechny uživatele
- ARES integrace (automatické vyplnění z IČO)

### Tarify (aktuální)
| Tarif | Cena | Role |
|-------|------|------|
| Zákazník | 99 Kč/měsíc bez DPH | customer |
| Dodavatel | 399 Kč/měsíc bez DPH | supplier |

### Poptávky & Zakázky
- 61 kategorií služeb
- Vytvoření poptávky s fotografiemi
- Přijetí poptávky dodavatelem
- Stavy: open → in_progress → completed/cancelled
- Geocoding + mapa (Leaflet)

### Komunikace
- Chat mezi zákazníkem a dodavatelem
- Hodnocení a recenze

### Platební brána (Stripe)
- Checkout v CZK
- Opakované měsíční platby (subscriptions)
- 14denní trial
- Webhook handling
- Zrušení předplatného

### Notifikace
| Událost | Email | SMS |
|---------|-------|-----|
| Registrace úspěšná | OK | - |
| Nová poptávka (pro dodavatele) | OK | OK |
| Nová nabídka (pro zákazníka) | OK | OK |
| Nová zpráva v chatu | OK | OK |
| Změna stavu zakázky | OK | OK |
| Platba úspěšná | OK | - |

### Upload souborů
- Veřejný upload endpoint pro registraci (`/api/upload/public`) - nevyžaduje autentizaci
- Autentizovaný upload pro přihlášené uživatele (`/api/upload`)
- Podporované formáty: JPEG, PNG, WebP, GIF, HEIC, HEIF, BMP, TIFF, AVIF
- Automatická konverze HEIC/HEIF na JPEG (přes Pillow + pillow-heif)
- Max velikost: 25 MB

### Adresový našeptávač
- Integrace s OpenStreetMap Nominatim API
- Debounced autocomplete v registraci (400ms)
- Leaflet mapa s markerem po výběru adresy
- Funguje pro všechny adresové pole (trvalý pobyt, skutečná adresa, sídlo, pobočka)

### Stránky webu
- `/` - Homepage s hero sliderem, jak to funguje, ceník, video
- `/prihlaseni` - Přihlášení
- `/registrace` - Multi-step registrace s autocomplete adres a mapou
- `/cenik` - Ceník tarifů
- `/dashboard` - Dashboard (zákazník/dodavatel/admin)
- `/obchodni-podminky` - Obchodní podmínky
- `/kontakt` - Kontaktní stránka
- `/podminky-opakovanych-plateb` - Podmínky opakovaných plateb
- `/platba/uspech` - Úspěšná platba
- `/platba/zruseno` - Zrušená platba

### Promo video
- YouTube embed: https://youtu.be/eR8_-m_mYoE
- Český dabing

---

## Připraveno k aktivaci

### Stripe (produkce)
- Aktuálně testovací klíč
- Pro produkci: nastavit skutečné Stripe API klíče

---

## K otestování uživatelem

Po zprovoznění domény (craftbolt.cz) otestovat:
1. Registrace Zákazník - Nepodnikatel
2. Registrace Zákazník - OSVČ
3. Registrace Zákazník - Firma
4. Registrace Dodavatel - Nepodnikatel
5. Registrace Dodavatel - OSVČ
6. Registrace Dodavatel - Firma
7. Upload profilové fotky během registrace
8. Adresový našeptávač + mapa při registraci
9. Email notifikace při registraci
10. SMS notifikace při akcích

---

## Backlog

### P0 - Bug fixy z uživatelského testování
- Opravy na základě výsledků testování registrace

### P1 - Mobilní aplikace
- Push notifikace (APP)
- iOS + Android aplikace

### P2 - Refaktoring
- server.py (1300+ řádků) rozdělit na moduly

---

## DNS (Wedos)
- **A** @ → 162.159.142.117 (TTL 300)
- **A** @ → 172.66.2.113 (TTL 300)
- **CNAME** www → craftbolt.cz (TTL 300)
- MX, SPF, DKIM, DMARC záznamy pro emaily zachovány

---

## Poznámky z vývoje
- České Twilio čísla nepodporují SMS → použit Alphanumeric Sender ID "CraftBolt"
- GoPay vyžaduje zdlouhavé ověření → zůstáváme u Stripe
- Video na YouTube: veřejné od 12:15
- Doména craftbolt.cz zprovozněna 1. 4. 2026
