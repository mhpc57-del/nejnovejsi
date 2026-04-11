# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojení zákazníků s řemeslníky a dodavateli služeb v České republice.

## Tech Stack
- **Frontend**: React (CRA), Tailwind CSS, Vite-compatible
- **Backend**: FastAPI, MongoDB
- **Integrace**: OpenAI GPT-4o (Emergent LLM Key), BulkGate SMS (čeká na klíče), Stripe (test mode), Wedos SMTP
- **Mapy**: Photon/Nominatim geocoding, Leaflet

## Implementované funkce
- JWT autentizace (admin/customer/supplier/customer_supplier)
- 4-krokový registrační wizard s emailovou verifikací (Wedos SMTP)
- Reset hesla
- CRUD poptávek (demands) s fotkami, mapou, kategorií
- Chat/zprávy v poptávkách s přílohami
- Cenové návrhy a potvrzení
- Fakturace (PDF/XML/ISDOC, ZIP export)
- Stripe platby (test mode, 199/299/399 Kč – čeká na finální nastavení)
- Promoted Suppliers (reklamní karty) s admin dashboardem
- AI Chat asistent (GPT-4o)
- Dark Mode
- Mobile navigace (bottom bar + drawer menu)
- Welcome Modal pro nové uživatele
- FAQ stránka
- Cookie consent
- SMS notifikace toggle (BulkGate – kód hotový, čeká na klíče)
- Weather + Name day widget v headeru
- **NOVÉ: Custom SVG logo (šestihranný šroub + oranžová přilba)** nasazeno na všech stránkách
- **NOVÉ: Kompletní marketingový balíček loga** (SVG, PNG, JPG, social media profily, FB cover, favicon, print varianty)

## Stav testování (Iterace 33)
- Backend: 97% (35/36 testů)
- Frontend: 95% (všechny hlavní toky funkční)
- Bezpečnostní oprava: JWT klíč prodloužen na 32+ bajtů

## Blokováno
- P0: Stripe pricing restrukturalizace (čeká na uživatele)
- P1: Hero slider fotky (uživatel připravuje)
- P1: BulkGate SMS klíče (čeká na schválení)

## Backlog
- P2: Wedos SMTP monitoring
- P2: React Native mobilní app (PAUSED)
- P3: HomePage.jsx refaktoring (~900 řádků)
