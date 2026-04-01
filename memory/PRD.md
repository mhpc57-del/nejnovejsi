# CraftBolt - PRD & Project Status

## Základní informace
- **Projekt:** CraftBolt.cz - Platforma pro propojení zákazníků s řemeslníky
- **Doména:** craftbolt.cz (DNS směřuje na Emergent)
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

## ✅ Implementováno

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
| Registrace úspěšná | ✅ | - |
| Nová poptávka (pro dodavatele) | ✅ | ✅ |
| Nová nabídka (pro zákazníka) | ✅ | ✅ |
| Nová zpráva v chatu | ✅ | ✅ |
| Změna stavu zakázky | ✅ | ✅ |
| Platba úspěšná | ✅ | - |

### Stránky webu
- `/` - Homepage s hero sliderem, jak to funguje, ceník, video
- `/prihlaseni` - Přihlášení
- `/registrace` - Multi-step registrace
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

## ⏳ Připraveno k aktivaci

### Stripe (produkce)
- Aktuálně testovací klíč
- Pro produkci: nastavit skutečné Stripe API klíče

---

## 📋 Backlog (P0)

### Mobilní aplikace
- Push notifikace (APP)
- iOS + Android aplikace

---

## Konfigurace

### Environment Variables (backend/.env)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
STRIPE_API_KEY=sk_test_emergent
TWILIO_ACCOUNT_SID=AC850bb010800d8fda6509294deb7b36eb
TWILIO_AUTH_TOKEN=e239d907c1476057124ec692243b17e6
TWILIO_PHONE_NUMBER=CraftBolt
SMTP_HOST=wes1-smtp.wedos.net
SMTP_PORT=587
SMTP_USER=info@craftbolt.cz
SMTP_PASSWORD=***
SMTP_FROM_EMAIL=info@craftbolt.cz
SMTP_FROM_NAME=CraftBolt
```

### DNS (Wedos)
- ALIAS @ → is-online.preview.emergentagent.com
- CNAME www → is-online.preview.emergentagent.com
- MX, SPF, DKIM, DMARC záznamy pro emaily zachovány

---

## Kontakty
- **Email:** info@craftbolt.cz
- **Provozní doba:** Po-Pá 8:00-16:00

---

## Poznámky z vývoje
- České Twilio čísla nepodporují SMS → použit Alphanumeric Sender ID "CraftBolt"
- GoPay vyžaduje zdlouhavé ověření → zůstáváme u Stripe
- Video na YouTube: veřejné od 12:15

