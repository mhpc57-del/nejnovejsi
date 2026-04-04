# CraftBolt - PRD & Architecture

## Popis
Servisní tržiště CraftBolt.cz - React + FastAPI + MongoDB

## Implementováno
- JWT autentizace s emailovou verifikací
- Registrace (podnikatel/nepodnikatel, zákazník/dodavatel)
- SMS notifikace při registraci (Twilio)
- SMTP emaily přes Wedos (denní limit 400)
- Tvorba/editace poptávek s mapou
- Real-time chat s toast notifikacemi
- Profily s fotkami (upload, conditional fields)
- Zkušební doba 14 dní (sidebar)
- Quick Demand (rychlá poptávka bez registrace)
- Notifikace na dashboardu (nepřečtené zprávy badges + banner)
- Mapy na dashboardech (zákazník i dodavatel) s barevnými markery
- Claim quick demand po registraci (automatické propojení)
- Notifikace dodavatele reagujícího na quick demand → email s registračním odkazem
- Soft-accept quick demands s notifikací zákazníkovi

## Architektura
- Frontend: React + Vite + Tailwind + Leaflet mapy
- Backend: FastAPI + MongoDB + Twilio + SMTP Wedos
- Komponenty: /app/frontend/src/components/ui/ (Shadcn)

## Klíčové endpointy
- POST /api/demands/quick (bez auth)
- POST /api/demands/claim (po registraci)
- GET /api/messages/unread-summary
- POST /api/messages
- POST /api/demands/{id}/soft-accept

## Databáze
- users: role, is_verified, account_type, push_token
- demands: customer_name, status, is_quick, customer_email, customer_phone
- messages: demand_id, sender_id, sender_name, content

## Mocked: Stripe (platby)

## Známé problémy
- Twilio SMS: 401 auth error (neplatný token - uživatel musí aktualizovat)
- Wedos email limit: 500/den (safety limit 400/den v kódu)

## Backlog
- P1: Opravit Twilio SMS (nový auth token)
- P1: Řešení emailového limitu (alternativní provider?)
- P2: Mobilní aplikace (React Native) - PAUSOVÁNO
- P3: Dark mode, date picker
- P3: Stripe platby (aktuálně MOCKED)
