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
- Mobilni navigace: Domu/Prehled/+/Profil/Vice drawer (Faktury/Prijmy/AI Chat/Rezim/Zrusit ucet/Odhlasit)
- Hero Slider: 13 profesionalnich fotek remeslniku
- **Welcome Modal (2026-04-11)**:
  - Vyskakovaci okno pro nove uzivatele po prvni registraci
  - Text: Vitejte na CraftBolt + info o prvnich uzivatelich + prosba o strpeni
  - Tlacitko "Rozumim, pokracovat" nastavi welcome_seen=true v DB
  - Zobrazi se POUZE jednou — pri druhem prihlaseni uz ne
  - Backend: POST /api/users/welcome-seen + welcome_seen pole v UserResponse
  - Frontend: WelcomeModal komponenta v CustomerDashboard + SupplierDashboard
  - Testovano: manualne overeno (1. login modal OK, 2. login bez modalu OK)

## Architektura
- Frontend: React + Vite + Tailwind CSS + Framer Motion (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)
- Mobile: React Native Expo (/app/mobile) - PAUSOVANO

## Backlog
- P0: BulkGate SMS - ceka na schvaleni registrace (48 hod)
- P0: Stripe reklamni karty - nastavit spravny Stripe klic
- P0: Hero slider fotky - uzivatel doda vlastni zitra
- P1: Stripe Live finalizace (ceka na ucetni)
- P2: Wedos SMTP monitoring
- P2: Mobilni aplikace - PAUSOVANO
