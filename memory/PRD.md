# CraftBolt - PRD & Architecture

## Popis
Servisní tržiště CraftBolt.cz - React + FastAPI + MongoDB

## Role
- **customer**, **supplier**, **customer_supplier**, **admin**

## Implementováno
- JWT autentizace + email verifikace + zapomenuté heslo
- Registrace (OSVČ/Firma/Nepodnikatel), ARES, pobočky, jazyky
- Dark mode, SMS (Twilio), SMTP (Wedos)
- Poptávky s mapou, chat, profily, certifikáty (PDF), service area
- Quick Demand, Stripe platby (199/299/399 Kč), AI Chat (GPT)
- 3-option dokončení (Standard/Navýšení/Blacklist), Nemohu provést
- Finanční přehled + Fotodokumentace (max 20, obě strany, lightbox)
- **Admin Panel** — kompletní:
  - Přehled (8 statistik)
  - Uživatelé: blokovat/odblokovat, reaktivovat deaktivované, editovat ALL pole (email, IČ, DIČ, adresy, role...), ARES lookup, zpráva emailem, připomenout ověření neověřeným
  - Zakázky: zrušit, špatná kategorie, vylepšit popis, nevhodná slova/vulgarita, vlastní oznámení
  - Kategorie: schválit/zamítnout s důvodem (email navrhovateli), auto-přidání do seznamu
  - Důvěryhodnost hvězdami pro VŠECHNY role
- Homepage: "Naši administrátoři pracují 24/7 NON-STOP"

## Backlog
- P1: Přechod Stripe/Twilio na firemní účty CraftBolt
- P1: Export faktur/přehledů (PDF pro účetní)
- P1: Nové kategorie od uživatele (čeká na seznam do pátku)
- P2: Mobilní aplikace (React Native) - PAUSOVÁNO
