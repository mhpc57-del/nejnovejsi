# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v Ceske republice.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MongoDB
- **Integrace**: OpenAI GPT-4o (Emergent LLM Key), BulkGate SMS, Stripe (LIVE one-time payments), Wedos SMTP
- **Mapy**: Photon/Nominatim geocoding, Leaflet

## Cenovy model (AKTUALNI - duben 2026)
- **Zakaznik**: ZDARMA (vkladani poptavek), volitelne overeni poptavky za 49 Kc
- **Dodavatel**: Jednorazova platba 190 Kc/mesic NEBO 1.890 Kc/rok (uspora 390 Kc)
- **Reklamni banner**: 39 Kc/den NEBO 990 Kc/mesic
- Vsechny ceny vcetne 21% DPH
- 14denni zkusebni doba ZRUSENA

## Implementovane funkce
- JWT autentizace (admin/customer/supplier/customer_supplier)
- 4-krokovy registracni wizard s emailovou verifikaci (Wedos SMTP)
- Reset hesla
- CRUD poptavek (demands) s fotkami, mapou, kategorii
- Chat/zpravy v poptavkach s prilohami
- Cenove navrhy a potvrzeni
- Workflow rozpoctu -- dodavatel nahraje rozpocet, zakaznik prijme/odmitne
- Fakturace (PDF s ceskymi diakritikami FreeSans, XML/ISDOC, ZIP export)
- Stripe jednorazove platby pro dodavatele (190/1890 CZK)
- Overeni poptavky za 49 Kc (Stripe checkout)
- Promoted Suppliers (reklamni karty, 39 Kc/den nebo 990 Kc/mesic)
- AI Chat asistent (GPT-4o)
- Dark Mode
- Mobile navigace (bottom bar + drawer menu)
- Welcome Modal, FAQ, Cookie consent
- SMS notifikace (BulkGate)
- Weather + Name day widget, Custom SVG logo
- Hero section s vlastnimi fotkami a 3x3 grid kategorii
- "Jak to cele funguje" 6-krokovy hexagon diagram
- "Vyhody pro zakazniky" a "Vyhody pro dodavatele" -- 2x5 karet
- Mobilni aplikace CraftBolt banner (ve vyvoji)
- PDF faktura prilozena k emailum

## Architektura frontendu (po komponentizaci)
HomePage.jsx: 208 radku (orchestrator)
Komponenty v src/components/home/:
- AdvantagesSection.jsx (60)
- HowItWorksSection.jsx (105)
- PromoFormModal.jsx (80)
- PromotedSuppliersSection.jsx (75)
- QuickDemandModal.jsx (78)
- PricingSection.jsx (71)
- HomeFooter.jsx (37)
- CTASection.jsx (26)
- MobileAppBanner.jsx (24)
- VideoSection.jsx (22)
- CookieBanner.jsx (22)
- animations.js (11) - sdilene animacni varianty

## Stav testovani
- Iterace 35: Pricing restructure (Backend 100%, Frontend 100%)

## Backlog
- P3: React Native mobilni app (PAUSED)
