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
- Rozsireny registracni formular: Oblast pusobeni + Portfolio
- **Seskupene kategorie (2026-04-10)**: Remesla (46) + Sluzby (78) = 124
- **Zabraneni prekladu prohlizecem (2026-04-10)**: lang=cs, notranslate
- **UI/UX Redesign (2026-04-10)**:
  - HomePage: Swiss & High-Contrast archetype, Framer Motion animace, glassmorphism header, tinted neutrals (stone-50, zinc-*), Outfit + Manrope fonty, stagger reveal, lepsi spacing, asymetricky layout
  - LoginPage: Konzistentni redesign s zinc paletou a backdrop-blur headerem
  - RegisterPage: Aktualizovany header a form wrapper
  - Testovano: 18/18 testu proslo (100%)

## Architektura
- Frontend: React + Vite + Tailwind CSS + Framer Motion (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)
- Mobile: React Native Expo (/app/mobile) - PAUSOVANO

## Backlog
- P1: Overeni Twilio SMS doruceni (ceka na potvrzeni uzivatele)
- P1: Stripe Live finalizace (ceka na uzivatele + ucetni)
- P2: Redesign dalsich stranek (dashboardy, profil, admin) - pokracovani
- P2: Sledovani rychlosti dorucovani e-mailu pres Wedos SMTP
- P2: Mobilni aplikace - PAUSOVANO
