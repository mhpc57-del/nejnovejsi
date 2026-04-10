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
- Rozsireny registracni formular + SMS toggle
- Seskupene kategorie: Remesla (46) + Sluzby (78) = 124
- Kompletni UI/UX Redesign + Framer Motion
- Homepage: Jednoduše+spolehlive oranzove, rocni cenovy prepinac, 8 karet TOPOVANI DODAVATELE
- Admin Reklama tab: statistiky, tabulka, akce
- Zakaznicky dashboard: Prepracovany seznam poptavek
- Migrace Twilio -> BulkGate (ceka na schvaleni registrace)
- SMS notifikacni toggle v registraci i editaci profilu
- **Mobilni navigace (2026-04-11)**:
  - Nahrazeno "Odhlasit" za "Vice" bottom drawer
  - Customer: Domu, Prehled, + Nova poptavka, Profil, Vice
  - Supplier: Domu, Prehled, Profil, Vice
  - Drawer: Faktury, Prijmy (supplier), AI Chat, Rezim (dark/light), Prepnout roli, Zkusebni doba, Zrusit ucet, Odhlasit
  - AI chat floating button skryt na mobilu (hidden lg:flex)
  - AI chat fullscreen na mobilu
  - Testovano: iterace 32 (8/8, 100%)

## Architektura
- Frontend: React + Vite + Tailwind CSS + Framer Motion (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)
- Mobile: React Native Expo (/app/mobile) - PAUSOVANO

## Backlog
- P0: BulkGate SMS - ceka na schvaleni registrace (48 hod)
- P0: Stripe reklamni karty - nastavit spravny Stripe klic
- P1: Stripe Live finalizace (ceka na ucetni)
- P2: Wedos SMTP monitoring
- P2: Mobilni aplikace - PAUSOVANO
