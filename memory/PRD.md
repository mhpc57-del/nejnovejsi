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

## Registrace — Nový flow
1. Email + Heslo
2. Výběr role (customer / supplier / customer_supplier)
3. Mám IČO / Nemám IČO
4. (Pokud Mám IČO) OSVČ / Firma
5. Detaily:
   - Nemám IČO: jméno(povinné), trvalý pobyt(opt), skutečná adresa(opt), telefon(povinné), email(povinné), web(opt), jazyky
   - Mám IČO: IČO+ARES(povinné), DIČ(opt), jméno(opt), sídlo(povinné), pobočky(opt, více), telefon(povinné), email(povinné), web(opt), jazyky
6. Kategorie (pouze supplier / customer_supplier)

## Implementováno
- JWT autentizace s emailovou verifikací
- 3 role: customer, supplier, customer_supplier
- Registrace s Mám IČO / Nemám IČO, ARES, pobočky, preferované jazyky
- Ceník 3 sloupce na HP: 199/299/399 Kč
- SMS notifikace (Twilio) — token aktualizován
- SMTP emaily přes Wedos (denní limit 400)
- Tvorba/editace poptávek s mapou
- Chat s toast notifikacemi
- Profily s fotkami (upload)
- Zkušební doba 14 dní (sidebar)
- Quick Demand (rychlá poptávka bez registrace)
- Notifikace na dashboardu (nepřečtené zprávy badges + banner)
- Mapy na dashboardech (zákazník i dodavatel) s barevnými markery
- Claim quick demand po registraci
- Dashboard přepínač pro customer_supplier (zákazník ↔ dodavatel)

## Architektura
- Frontend: React + Vite + Tailwind + Leaflet mapy
- Backend: FastAPI + MongoDB + Twilio + SMTP Wedos
- Komponenty: /app/frontend/src/components/ui/ (Shadcn)

## Klíčové endpointy
- POST /api/auth/register (podporuje customer_supplier role)
- POST /api/demands/quick (bez auth)
- POST /api/demands/claim (po registraci)
- GET /api/messages/unread-summary
- POST /api/messages
- POST /api/demands/{id}/soft-accept

## Databáze
- users: role, is_verified, account_type, preferred_languages, branch_addresses
- demands: customer_name, status, is_quick, customer_email, customer_phone
- messages: demand_id, sender_id, sender_name, content

## Mocked: Stripe (platby)

## Backlog
- P2: Dark mode (bylo funkční, ztratilo se)
- P2: Mobilní aplikace (React Native) - PAUSOVÁNO
- P3: Stripe platby (aktuálně MOCKED)
