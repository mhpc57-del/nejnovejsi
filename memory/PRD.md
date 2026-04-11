# CraftBolt - PRD & Architecture

## Popis
Servisni trziste CraftBolt.cz - React + Vite + FastAPI + MongoDB

## Implementovano
- JWT auth + email verifikace + zapomenute heslo
- 3 role + admin, registrace (OSVC/Firma/Nepodnikatel), ARES
- Dark mode, SMS (BulkGate), SMTP (Wedos), Stripe (199/299/399 Kc)
- Poptavky s mapou, chat s read tracking, profily, certifikaty, service area
- AI Chat (GPT), Quick Demand, Weather widget
- Admin Panel: uzivatele, zakazky, kategorie, faktury, REKLAMA
- Fakturacni system, Persistentni upload, SMS toggle
- Kompletni UI/UX Redesign + Framer Motion
- Homepage: oranzove slova, rocni cenovy prepinac, 8 karet TOPOVANI DODAVATELE
- Mobilni navigace: Domu/Prehled/+/Profil/Vice drawer
- Hero Slider: 13 profesionalnich fotek (uzivatel doda vlastni)
- Welcome Modal pro nove uzivatele
- YouTube embed: modestbranding, skryte anotace
- **FAQ stranka (2026-04-11)**:
  - /caste-dotazy — 5 castych dotazu s odrazkami (accordion)
  - Odkaz v paticce homepage
  - Dotazy: zpoplatneni, responzivita, email, poloha, neaktivni dodavatel

## Architektura
- Frontend: React + Vite + Tailwind CSS + Framer Motion (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)

## Backlog
- P0: BulkGate SMS - ceka na schvaleni registrace
- P0: Stripe reklamni karty - nastavit klic
- P0: Hero slider fotky - uzivatel doda vlastni
- P1: Stripe Live finalizace (ucetni)
- P2: Wedos SMTP, Mobilni app
