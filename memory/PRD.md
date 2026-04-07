# CraftBolt - PRD & Architecture

## Popis
Servisní tržiště CraftBolt.cz - React + FastAPI + MongoDB

## Ceník
- Zákazník: 199 Kč/měsíc
- Dodavatel: 299 Kč/měsíc
- Zákazník i dodavatel: 399 Kč/měsíc
- 14 dní zkušební doba zdarma

## Role
- **customer**: Pouze vytváření poptávek
- **supplier**: Pouze prohlížení/přijímání zakázek
- **customer_supplier**: Obojí — vytváření i přijímání
- **admin**: Plný přístup

## Registrace — Flow
1. Email + Heslo
2. Výběr role (customer / supplier / customer_supplier)
3. Mám IČO / Nemám IČO
4. (Pokud Mám IČO) OSVČ / Firma
5. Detaily s preferred_languages, branch_addresses
6. Kategorie (pouze supplier / customer_supplier)

## Implementováno
- JWT autentizace s emailovou verifikací
- 3 role: customer, supplier, customer_supplier
- Registrace s Mám IČO / Nemám IČO, ARES, pobočky, preferované jazyky
- Ceník 3 sloupce na HP: 199/299/399 Kč
- **Dark mode** — toggle na každé stránce, persistence v localStorage
- SMS notifikace (Twilio)
- SMTP emaily přes Wedos (denní limit 400)
- Tvorba/editace poptávek s mapou
- Chat s toast notifikacemi
- Profily s fotkami (upload)
- Zkušební doba 14 dní (sidebar)
- Quick Demand (rychlá poptávka bez registrace)
- Notifikace na dashboardu (nepřečtené zprávy badges + banner)
- Mapy na dashboardech s barevnými markery
- Claim quick demand po registraci
- Dashboard přepínač pro customer_supplier
- **Stripe platby** — plně funkční integrace (3 plány: 199/299/399 Kč), checkout, webhook, status polling
- Re-registrace po deaktivaci účtu
- Hláška o deaktivaci s admin emailem (info@craftbolt.cz)
- Normalizace telefonního čísla pro SMS (odstranění mezer, pomlček)
- Weather & Name Day widget na HomePage

## Architektura
- Frontend: React + Vite + Tailwind + Leaflet mapy
- Backend: FastAPI + MongoDB + Twilio + SMTP Wedos
- Dark mode: CSS global overrides v App.css + ThemeContext
- Platby: Stripe via emergentintegrations library

## Stripe integrace
- Klíč: STRIPE_API_KEY v backend/.env
- Plány: zakaznik (199), dodavatel (299), zakaznik_dodavatel (399)
- Checkout URL: /api/subscription/checkout
- Status: /api/subscription/status/{session_id}
- Webhook: /api/webhook/stripe
- Ceníková stránka: /cenik

## Backlog
- P2: Mobilní aplikace (React Native) - PAUSOVÁNO
