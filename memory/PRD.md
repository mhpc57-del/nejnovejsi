# CraftBolt - PRD & Architecture

## Popis
Servisni trziste CraftBolt.cz - React + Vite + FastAPI + MongoDB

## Implementovano
- JWT auth + email verifikace + zapomenute heslo
- 3 role + admin, registrace (OSVC/Firma/Nepodnikatel), ARES
- Dark mode, SMS (Twilio), SMTP (Wedos), Stripe (199/299/399 Kc)
- Poptavky s mapou, chat s read tracking, profily, certifikaty, service area
- AI Chat (GPT), Quick Demand, Weather widget
- 3-option dokonceni (Standard/Navyseni/Blacklist), Nemohu provest
- Financni prehled + Fotodokumentace (max 20, lightbox)
- Potvrzeni ceny dodavatelem, Prijmy dodavatele
- Admin Panel: uzivatele, zakazky, kategorie
- Fakturacni system (PDF/XML/ZIP)
- Persistentni upload do MongoDB
- **Rozsireny registracni formular (2026-04-09)**: 2 nove kroky (Oblast pusobeni + Portfolio)
- **Seskupene kategorie (2026-04-10)**:
  - Kategorie rozdeleny do 2 skupin: Remesla (46) a Sluzby (78) = 124 celkem
  - Backend `/api/categories` vraci flat i grouped data
  - Registrace, Profil, Poptavky - vsude seskupene s hlavickami
  - Filtr funguje pres obe skupiny
  - Testovano: 11/11 testu proslo (100%)
- **Zabraneni prekladu prohlizecem (2026-04-10)**:
  - `lang="cs"` misto `lang="en"` v index.html
  - `translate="no"`, `class="notranslate"`, `<meta name="google" content="notranslate">`
  - `<meta http-equiv="Content-Language" content="cs">`

## Architektura
- Frontend: React + Vite + Tailwind CSS (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)
- Mobile: React Native Expo (/app/mobile) - PAUSOVANO

## Backlog
- P1: Overeni Twilio SMS doruceni (ceka na potvrzeni uzivatele)
- P1: Stripe Live finalizace (ceka na uzivatele + ucetni)
- P2: Sledovani rychlosti dorucovani e-mailu pres Wedos SMTP
- P2: UI/UX redesign podle design_guidelines.json (odlozeno)
- P2: Mobilni aplikace - PAUSOVANO
