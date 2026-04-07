# CraftBolt - PRD & Architecture

## Popis
Servisní tržiště CraftBolt.cz - React + FastAPI + MongoDB

## Implementováno
- JWT auth + email verifikace + zapomenuté heslo
- 3 role + admin, registrace (OSVČ/Firma/Nepodnikatel), ARES
- Dark mode, SMS (Twilio), SMTP (Wedos), Stripe (199/299/399 Kč)
- Poptávky s mapou, chat s read tracking, profily, certifikáty, service area
- AI Chat (GPT), Quick Demand, Weather widget
- 3-option dokončení (Standard/Navýšení/Blacklist), Nemohu provést
- Finanční přehled + Fotodokumentace (max 20, lightbox)
- **Potvrzení ceny dodavatelem** — zákazník nastaví cenu, dodavatel potvrdí/nesouhlasí, email notifikace
- **Příjmy dodavatele** — sidebar: potvrzené příjmy vs čekající na potvrzení
- **Admin Panel**: uživatelé (blok/edit/zpráva/ověření/reaktivace/ARES), zakázky (zrušit/oznámení/vulgarita), kategorie (schválit/zamítnout s důvodem)
- Kategorie s vyhledáváním (profil + poptávky)
- Read tracking zpráv (badge zmizí po přečtení)
- Homepage: "24/7 NON-STOP"

## Backlog
- P1: Přechod Stripe/Twilio na firemní účty
- P1: Export faktur/přehledů (PDF pro účetní)
- P1: Nové kategorie (čeká seznam do pátku)
- P2: Mobilní aplikace - PAUSOVÁNO
