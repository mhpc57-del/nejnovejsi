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

## Implementováno
- JWT autentizace s emailovou verifikací
- **Zapomenuté heslo** — email s reset odkazem, nastavení nového hesla
- 3 role: customer, supplier, customer_supplier
- Registrace s Mám IČ / Nemám IČ, ARES, pobočky, preferované jazyky
- Ceník 3 sloupce na HP a /cenik: 199/299/399 Kč
- **Dark mode** — toggle na každé stránce
- SMS notifikace (Twilio) s normalizací tel. čísla
- SMTP emaily přes Wedos
- Tvorba/editace poptávek s mapou
- Chat s toast notifikacemi
- Profily s fotkami (upload)
- Zkušební doba 14 dní (sidebar)
- Quick Demand (rychlá poptávka bez registrace)
- Notifikace na dashboardu (nepřečtené zprávy)
- Mapy na dashboardech s barevnými markery
- **Stripe platby** — 3 plány, checkout, webhook, status
- Re-registrace po deaktivaci účtu
- Weather & Name Day widget na HomePage
- **AI Chat podpora** — plovoucí widget, GPT-powered, česky
- Našeptávač adresy pobočky při registraci
- Email normalizace na lowercase
- **3-option modal dokončení zakázky** (Standard, Navýšení ceny, Blacklist)
- **Nemohu provést** — dodavatel může zrušit zakázku s důvodem
- **Finanční přehled** u dokončených poptávek (dohodnutá cena, navýšení, konečná cena, blacklist důvod) — DONE 7.4.2026
- **Fotodokumentace** u dokončených zakázek — obě strany mohou nahrávat fotky při dokončení i dodatečně, max 20, lightbox, mazání vlastních fotek — DONE 7.4.2026
- Přímé odkazy v emailech na konkrétní poptávku + badge na dashboardu
- Case-insensitive filtrování kategorií a emailů
- Service Area mapa pro všechny role s read-only zobrazením

## Fotodokumentace
- Backend: POST /api/demands/{demand_id}/completion-photos (přidání), DELETE (smazání)
- Fotky se ukládají při dokončení zakázky (v modalu) i dodatečně (na detailu)
- Obě strany (zákazník i dodavatel) mohou nahrávat
- Max 20 fotek na zakázku, bez limitu MB
- Lightbox pro zobrazení plné velikosti s informací o nahrávajícím a datem
- Mazání: pouze vlastní fotky nebo admin

## AI Chat
- Backend: /api/ai/chat (POST), /api/ai/chat/history/{session_id} (GET)
- Model: OpenAI GPT přes Emergent LLM Key
- Session ID v localStorage prohlížeče

## Architektura
- Frontend: React + Vite + Tailwind + Leaflet mapy
- Backend: FastAPI + MongoDB + Twilio + SMTP Wedos + OpenAI (emergentintegrations)
- Dark mode: CSS global overrides v App.css + ThemeContext

## Stripe integrace
- Klíč: STRIPE_API_KEY v backend/.env
- Plány: zakaznik (199), dodavatel (299), zakaznik_dodavatel (399)
- Checkout: /api/subscription/checkout
- Webhook: /api/webhook/stripe

## Klíčové soubory
- /app/frontend/src/pages/DemandDetail.jsx — Detail poptávky + finanční přehled + fotodokumentace
- /app/frontend/src/components/AiChatWidget.jsx — AI chat widget
- /app/backend/routes/demands.py — Poptávky + dokončení + fotky
- /app/backend/routes/auth_routes.py — Auth
- /app/backend/routes/payments.py — Stripe platby

## Backlog
- P1: Přechod Stripe a Twilio na firemní účty CraftBolt
- P1: Export faktur/přehledů (PDF souhrn dokončených zakázek pro účetní)
- P2: Mobilní aplikace (React Native) - PAUSOVÁNO
