# CraftBolt - PRD & Architecture

## Popis
Servisni trziste CraftBolt.cz - React + Vite + FastAPI + MongoDB

## Implementovano
- JWT auth + email verifikace + zapomenute heslo
- 3 role + admin, registrace (OSVC/Firma/Nepodnikatel), ARES
- Dark mode, SMS (Twilio), SMTP (Wedos), Stripe (199/299/399 Kc)
- Poptavky s mapou, chat s read tracking, profily, certifikaty, service area
- AI Chat (GPT), Quick Demand, Weather widget
- 3-option dokonceni, Nemohu provest, Financni prehled, Fotodokumentace
- Potvrzeni ceny dodavatelem, Prijmy dodavatele
- Admin Panel: uzivatele, zakazky, kategorie, faktury, REKLAMA
- Fakturacni system (PDF/XML/ZIP)
- Persistentni upload do MongoDB
- Rozsireny registracni formular: Oblast pusobeni + Portfolio (2026-04-09)
- Seskupene kategorie: Remesla (46) + Sluzby (78) = 124 (2026-04-10)
- Zabraneni prekladu prohlizecem: lang=cs, notranslate (2026-04-10)
- Kompletni UI/UX Redesign (2026-04-10)
- Homepage: "Jednoduše," + "spolehlivě." oranzove, rocni cenovy prepinac, 8 karet TOPOVANI DODAVATELE (2026-04-11)
- Bug fixy (2026-04-11): Chat dark mode, Promoted suppliers API (STRIPE_API_KEY, FRONTEND_URL, Plus import)
- Admin Reklama tab (2026-04-11): statistiky, tabulka, akce (prodlouzit/deaktivovat/smazat)
- Zakaznicky dashboard: Prepracovany seznam poptavek se jmenem/mistem/datem (2026-04-11)

## Architektura
- Frontend: React + Vite + Tailwind CSS + Framer Motion (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)
- Mobile: React Native Expo (/app/mobile) - PAUSOVANO

## SMS Status
- Twilio ucet ma 2 ceska cisla, ale obe jsou POUZE pro hovory (ne SMS)
- Alpha Sender ID "CraftBolt" neni podporovano v CR pro SMS
- Messaging Service SID nastaveno v .env, ale bez SMS-schopneho cisla nebude fungovat
- Uzivatel jde koupit SMS-schopne cislo, po zakoupeni pridat do Messaging Service

## Backlog
- P0: SMS - ceka na zakoupeni SMS-schopneho cisla uzivatelem
- P0: Stripe reklamni karty - nastavit spravny Stripe klic (ceka na uzivatele)
- P1: Stripe Live finalizace (ceka na uzivatele + ucetni)
- P2: Sledovani rychlosti dorucovani e-mailu pres Wedos SMTP
- P2: Mobilni aplikace - PAUSOVANO
