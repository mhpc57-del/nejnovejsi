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
- Registrace s Mám IČ / Nemám IČ (opraveno z IČO), ARES, pobočky, preferované jazyky
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
- Hláška o deaktivaci s admin emailem (info@craftbolt.cz)
- Weather & Name Day widget na HomePage
- **AI Chat podpora** — plovoucí widget na všech stránkách, GPT-powered, odpovídá česky na dotazy o platformě
- Našeptávač adresy pobočky při registraci
- Email normalizace na lowercase (registrace + login)

## AI Chat
- Backend: /api/ai/chat (POST), /api/ai/chat/history/{session_id} (GET)
- Model: OpenAI GPT přes Emergent LLM Key
- System message s plnou znalostí o CraftBolt (tarify, registrace, funkce)
- Historie uložena v MongoDB kolekci ai_chat_history
- Session ID v localStorage prohlížeče
- Quick questions: "Jak se zaregistruji?", "Jaké jsou tarify?", "Jak funguje poptávka?"

## Architektura
- Frontend: React + Vite + Tailwind + Leaflet mapy
- Backend: FastAPI + MongoDB + Twilio + SMTP Wedos + OpenAI (emergentintegrations)
- Dark mode: CSS global overrides v App.css + ThemeContext

## Stripe integrace
- Klíč: STRIPE_API_KEY v backend/.env
- Plány: zakaznik (199), dodavatel (299), zakaznik_dodavatel (399)
- Checkout: /api/subscription/checkout
- Status: /api/subscription/status/{session_id}
- Webhook: /api/webhook/stripe
- Ceníková stránka: /cenik

## Klíčové soubory
- /app/frontend/src/components/AiChatWidget.jsx — AI chat widget
- /app/frontend/src/pages/PasswordResetPage.jsx — Zapomenuté heslo + reset
- /app/backend/routes/ai_chat.py — AI chat backend
- /app/backend/routes/auth_routes.py — Auth (login, register, verify, reset)
- /app/backend/routes/payments.py — Stripe platby

## Backlog
- P2: Mobilní aplikace (React Native) - PAUSOVÁNO
