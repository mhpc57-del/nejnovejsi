# CraftBolt - PRD & Architecture

## Popis
Servisni trziste CraftBolt.cz - React + Vite + FastAPI + MongoDB

## Implementovano
- JWT auth + email verifikace + zapomenute heslo
- 3 role + admin, registrace (OSVC/Firma/Nepodnikatel), ARES
- Dark mode, SMS (BulkGate), SMTP (Wedos), Stripe (199/299/399 Kc)
- Poptavky s mapou, chat s read tracking, profily, certifikaty, service area
- AI Chat (GPT), Quick Demand, Weather widget
- 3-option dokonceni, Nemohu provest, Financni prehled, Fotodokumentace
- Potvrzeni ceny dodavatelem, Prijmy dodavatele
- Admin Panel: uzivatele, zakazky, kategorie, faktury, REKLAMA
- Fakturacni system (PDF/XML/ZIP)
- Persistentni upload do MongoDB
- Rozsireny registracni formular: Oblast pusobeni + Portfolio
- Seskupene kategorie: Remesla (46) + Sluzby (78) = 124
- Zabraneni prekladu prohlizecem: lang=cs, notranslate
- Kompletni UI/UX Redesign
- Homepage: "Jednoduše,"+spolehlive oranzove, rocni cenovy prepinac, 8 karet TOPOVANI DODAVATELE
- Admin Reklama tab: statistiky, tabulka, akce (prodlouzit/deaktivovat/smazat)
- Zakaznicky dashboard: Prepracovany seznam poptavek se jmenem/mistem/datem
- **SMS notifikacni toggle (2026-04-11)**:
  - Prepinac "Chci dostavat notifikacni SMS" v registraci i editaci profilu
  - Backend kontroluje flag pred odeslanim SMS (notify_new_demand, notify_new_offer, notify_new_message, notify_status_change, notify_soft_accept, notify_cannot_complete)
  - Testovano: iterace 31 (16/16, 100%)
- **Migrace z Twilio na BulkGate (2026-04-11)**:
  - Twilio kompletne odstranen (vcetne pip balicku)
  - BulkGate HTTP API integrace - BULKGATE_APP_ID + BULKGATE_APP_TOKEN v .env
  - Ceka na schvaleni registrace uzivatelem (do 48 hod)

## Architektura
- Frontend: React + Vite + Tailwind CSS + Framer Motion (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)
- Mobile: React Native Expo (/app/mobile) - PAUSOVANO

## Backlog
- P0: BulkGate SMS - ceka na schvaleni registrace (48 hod)
- P0: Stripe reklamni karty - nastavit spravny Stripe klic
- P1: Stripe Live finalizace (ceka na ucetni)
- P2: Sledovani rychlosti dorucovani e-mailu pres Wedos SMTP
- P2: Mobilni aplikace - PAUSOVANO
