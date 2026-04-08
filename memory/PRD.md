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
- **Potvrzeni ceny dodavatelem** -- zakaznik nastavi cenu, dodavatel potvrdi/nesouhlasi, email notifikace
- **Prijmy dodavatele** -- sidebar: potvrzene prijmy vs cekajici na potvrzeni
- **Admin Panel**: uzivatele (blok/edit/zprava/overeni/reaktivace/ARES), zakazky (zrusit/oznameni/vulgarita), kategorie (schvalit/zamitnout s duvodem)
- Kategorie s vyhledavanim (profil + poptavky)
- Read tracking zprav (badge zmizi po precteni)
- Homepage: "24/7 NON-STOP"
- **Fakturacni system (2026-04-08)**:
  - Backend: PDF generovani (ReportLab), XML ISDOC pro POHODA, ZIP hromadny export
  - Frontend: /faktury stranka pro uzivatele (prehled, stahovani PDF/XML)
  - Admin: tab Faktury v Admin Panelu (filtrace mesic, Zobrazit, ZIP export, PDF/XML per faktura)
  - Navigace: odkaz "Faktury" v sidebaru Dodavatele i Zakaznika
  - Automaticke generovani faktur po uspesne platbe Stripe
  - Email notifikace s cislem faktury po platbe
  - Firma: AC/DC MONT s.r.o., IC 09744550, DIC CZ09744550, Sportovni 7, 789 63 Ruda nad Moravou

## Architektura
- Frontend: React + Vite + Tailwind CSS (/app/frontend)
- Backend: FastAPI + MongoDB (/app/backend)
- Mobile: React Native Expo (/app/mobile) - PAUSOVANO
- Invoicing: /app/backend/invoicing.py (PDF + XML gen), /app/backend/routes/invoices.py

## Backlog
- P1: Konfigurace Stripe webhooku pro live mod
- P1: Prechod Twilio na firemni ucet (navod jiz poslan uzivateli)
- P1: Nove kategorie (ceka seznam)
- P2: Mobilni aplikace - PAUSOVANO (az bude web 100%)
