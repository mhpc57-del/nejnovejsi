# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v Ceske republice.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MongoDB
- **Mobile**: React Native (Expo)
- **Integrace**: OpenAI GPT-4o (Emergent LLM Key), BulkGate SMS, Stripe (LIVE one-time payments), Wedos SMTP, Expo Push Notifications
- **Mapy**: Photon/Nominatim geocoding, Leaflet

## Cenovy model (AKTUALNI - duben 2026)
- **Zakaznik**: ZDARMA (vkladani poptavek), volitelne overeni poptavky za 49 Kc
- **Dodavatel**: Jednorazova platba 190 Kc/mesic NEBO 1.890 Kc/rok (uspora 390 Kc)
- **Reklamni banner**: 39 Kc/den NEBO 990 Kc/mesic
- Vsechny ceny vcetne 21% DPH
- 14denni zkusebni doba ZRUSENA

## Implementovane funkce (Web)
- JWT autentizace (admin/customer/supplier/customer_supplier)
- 4-krokovy registracni wizard s emailovou verifikaci
- CRUD poptavek s fotkami, mapou, kategorii
- Chat/zpravy s prilohami
- Cenove navrhy, workflow rozpoctu
- Fakturace (PDF s ceskymi diakritikami, XML/ISDOC)
- Stripe jednorazove platby + overeni poptavky (49 Kc)
- Promoted Suppliers (39 Kc/den, 990 Kc/mesic)
- AI Chat asistent, Dark Mode, Mobile navigace
- Push notifikace (Expo), SMS (BulkGate), Email (Wedos SMTP)
- Hero section, Hexagon diagram, Vyhody 2x5 karet
- Komponentizovana HomePage (~200 radku + 11 komponent)
- YouTube video sekce ODSTRANENA

## Implementovane funkce (Mobile)
- Login s cenovym prehledem
- 4-krokova registrace s ARES vyhledavanim
- Customer Dashboard (seznam poptavek, vytvareni, fotky, geolokace)
- Supplier Dashboard (dostupne/probihajici/dokoncene zakazky + paywall)
- Detail poptavky s chatem, soft/hard accept, hodnocenim
- Profil (editace, fotka, recenze)
- Oznameni, Mapa zakazek
- Push notifikace (Expo)
- Verified badge na poptavkach

## Opravene bugy (Mobile - duben 2026)
- SupplierDashboard: opraveno API volani (getAll -> getAvailable pro dostupne zakazky)
- Pridan paywall banner pro dodavatele bez zaplaceni
- Opravena URL pro push token registraci
- Pridana cenova informace do registrace
- Pridan verified badge do karet poptavek a detailu
- customer_supplier role spravne smerovana na SupplierTabs

## Stav testovani
- Iterace 35: Web pricing restructure (Backend 100%, Frontend 100%)

## Backlog
- Dalsi vylepseni mobile app dle pozadavku uzivatele
