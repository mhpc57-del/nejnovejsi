# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v Ceske republice.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MongoDB
- **Integrace**: OpenAI GPT-4o (Emergent LLM Key), BulkGate SMS, Stripe (LIVE subscriptions), Wedos SMTP
- **Mapy**: Photon/Nominatim geocoding, Leaflet

## Implementovane funkce
- JWT autentizace (admin/customer/supplier/customer_supplier)
- 4-krokovy registracni wizard s emailovou verifikaci (Wedos SMTP)
- Reset hesla
- CRUD poptavek (demands) s fotkami, mapou, kategorii
- Chat/zpravy v poptavkach s prilohami
- Cenove navrhy a potvrzeni
- Workflow rozpoctu -- dodavatel nahraje rozpocet (PDF/DOC/XLS/JPG/PNG), zakaznik prijme nebo odmitne s povinnym duvodem
- Fakturace (PDF s ceskymi diakritikami pomoci FreeSans, XML/ISDOC, ZIP export)
- Stripe recurring subscriptions (99/199/299 CZK/mesic, rocni sleva 10%)
- Stripe webhooks (invoice.payment_failed, customer.subscription.deleted)
- Promoted Suppliers (reklamni karty, 363 CZK/rok vcetne DPH) s admin dashboardem
- AI Chat asistent (GPT-4o)
- Dark Mode
- Mobile navigace (bottom bar + drawer menu)
- Welcome Modal pro nove uzivatele
- FAQ stranka
- Cookie consent
- SMS notifikace (BulkGate)
- Weather + Name day widget
- Custom SVG logo
- Hero section s vlastnimi fotkami a 3x3 grid kategorii
- "Jak to cele funguje" 6-krokovy hexagon diagram
- "Vyhody pro zakazniky" a "Vyhody pro dodavatele" -- dve oddelene sekce po 5 kartach (dle wireframu)
- Mobilni aplikace CraftBolt banner (ve vyvoji)
- PDF faktura prilozena k potvrzovacim emailum
- Paywall/expired trial banner v SupplierDashboard

## Stav testovani
- Iterace 33: Kompletni audit (Backend 97%, Frontend 95%)
- Iterace 34: Quote workflow (Backend 100%, Frontend 100%)

## Blokovano
- P1: Platby pro zakazniky (ceka na pokyny od ucetni)

## Backlog
- P2: Komponentizace HomePage.jsx (~870 radku)
- P3: React Native mobilni app (PAUSED)
