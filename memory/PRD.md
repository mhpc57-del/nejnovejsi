# CraftBolt - PRD & Architecture

## Popis
Servisní tržiště CraftBolt.cz - React + FastAPI + MongoDB

## Role
- **customer**: Pouze vytváření poptávek
- **supplier**: Pouze prohlížení/přijímání zakázek
- **customer_supplier**: Obojí
- **admin**: Plný přístup + admin panel

## Implementováno
- JWT autentizace s emailovou verifikací + zapomenuté heslo
- Registrace (OSVČ/Firma/Nepodnikatel), ARES, pobočky, jazyky
- Dark mode
- SMS notifikace (Twilio), SMTP emaily (Wedos)
- Tvorba/editace poptávek s mapou, chat s notifikacemi
- Profily s fotkami, certifikáty (PDF), service area mapou
- Quick Demand (bez registrace)
- Stripe platby (199/299/399 Kč)
- AI Chat podpora (GPT)
- 3-option modal dokončení (Standard, Navýšení, Blacklist)
- Nemohu provést (dodavatel zruší s důvodem)
- Finanční přehled dokončených zakázek
- Fotodokumentace dokončených zakázek (max 20, obě strany, lightbox)
- Přímé odkazy v emailech + badge na dashboardu
- Case-insensitive filtrování
- **Admin Panel** — kompletní správa platformy:
  - Přehled (8 statistik)
  - Správa uživatelů (blokovat/odblokovat, editovat profil, poslat email)
  - Správa zakázek (zrušit s důvodem, špatná kategorie, vylepšit popis, nevhodná slova/vulgarita, vlastní oznámení)
  - Správa navržených kategorií (schválit/zamítnout)
  - Email notifikace do schránky na navrženou kategorii
  - Zablokovaný uživatel se nemůže přihlásit

## Architektura
- Frontend: React + Vite + Tailwind + Leaflet
- Backend: FastAPI + MongoDB + Twilio + Wedos SMTP + OpenAI (emergentintegrations)

## Klíčové soubory
- /app/frontend/src/pages/AdminDashboard.jsx — Admin panel
- /app/frontend/src/pages/DemandDetail.jsx — Detail poptávky
- /app/backend/routes/admin.py — Admin API endpointy
- /app/backend/routes/demands.py — Poptávky
- /app/backend/routes/auth_routes.py — Auth

## Backlog
- P1: Přechod Stripe a Twilio na firemní účty CraftBolt
- P1: Export faktur/přehledů (PDF pro účetní)
- P2: Mobilní aplikace (React Native) - PAUSOVÁNO
