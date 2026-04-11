# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojení zákazníků s řemeslníky a dodavateli služeb v České republice.

## Tech Stack
- **Frontend**: React (CRA), Tailwind CSS, Vite-compatible
- **Backend**: FastAPI, MongoDB
- **Integrace**: OpenAI GPT-4o (Emergent LLM Key), BulkGate SMS (klíče nastaveny), Stripe (test mode), Wedos SMTP
- **Mapy**: Photon/Nominatim geocoding, Leaflet

## Implementované funkce
- JWT autentizace (admin/customer/supplier/customer_supplier)
- 4-krokový registrační wizard s emailovou verifikací (Wedos SMTP)
- Reset hesla
- CRUD poptávek (demands) s fotkami, mapou, kategorií
- Chat/zprávy v poptávkách s přílohami
- Cenové návrhy a potvrzení
- **NOVÉ: Workflow rozpočtů** — dodavatel nahraje rozpočet (PDF/DOC/XLS/JPG/PNG), zákazník přijme nebo odmítne s povinným důvodem
- Fakturace (PDF/XML/ISDOC, ZIP export)
- Stripe platby (test mode, 199/299/399 Kč – čeká na finální nastavení)
- Promoted Suppliers (reklamní karty) s admin dashboardem
- AI Chat asistent (GPT-4o)
- Dark Mode
- Mobile navigace (bottom bar + drawer menu)
- Welcome Modal pro nové uživatele
- FAQ stránka
- Cookie consent
- SMS notifikace (BulkGate – klíče nastaveny, čeká na dobití kreditu)
- Weather + Name day widget
- Custom SVG logo (šestihranný šroub + oranžová přilba) na všech stránkách
- Kompletní marketingový balíček loga
- Hero slider s 13 vlastními fotkami

## Stav testování
- Iterace 33: Kompletní audit (Backend 97%, Frontend 95%)
- Iterace 34: Quote workflow (Backend 100%, Frontend 100%)

## Blokováno
- P0: Stripe pricing restrukturalizace (čeká na uživatele — je u účetního)

## Backlog
- P2: Wedos SMTP monitoring
- P2: React Native mobilní app (PAUSED)
- P3: HomePage.jsx refaktoring (~900 řádků)
