# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v Ceske republice.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MongoDB
- **Mobile**: React Native (Expo), react-native-maps, expo-notifications
- **Integrace**: OpenAI GPT-4o (Emergent LLM Key), BulkGate SMS, Stripe (LIVE one-time payments), Wedos SMTP, Expo Push Notifications

## Cenovy model (AKTUALNI - duben 2026)
- **Zakaznik**: ZDARMA, volitelne overeni poptavky za 49 Kc
- **Dodavatel**: 190 Kc/mesic NEBO 1.890 Kc/rok
- **Reklamni banner**: 39 Kc/den NEBO 990 Kc/mesic
- Vsechny ceny vcetne 21% DPH

## Web - Implementovane
- Kompletni autentizace, registrace, poptavky, chat, fakturace
- Stripe jednorazove platby, overeni poptavky 49 Kc
- Dark mode s opravenymi kontrasty (hero, vyhody, promoted, CTA, footer)
- Komponentizovana HomePage (~200 radku + 11 komponent)
- Mobilni responsivita overena

## Mobile - Implementovane
- Login s cenovym prehledem (190 Kc/mesic)
- 4-krokova registrace s ARES, cenove info
- Customer Dashboard (poptavky, vytvareni, fotky, geolokace)
- Supplier Dashboard (dostupne/probihajici zakazky + paywall)
- Detail poptavky s chatem, soft/hard accept, hodnocenim, verified badge
- Profil s subscription info, hodnocenim, kategoriemi
- Oznameni (soft accepts, prijeti, dokonceni, prijezd)
- Mapa zakazek (react-native-maps s markery, callouts, status filtry)
- Push notifikace (expo-notifications, auto-registrace tokenu)
- Moderni tab bar design

## Opravene bugy (Mobile)
- SupplierDashboard: getAll -> getAvailable
- Push token URL opravena
- customer_supplier role routing
- Verified badge na poptavkach

## Backlog
- Dalsi vylepseni dle pozadavku uzivatele
