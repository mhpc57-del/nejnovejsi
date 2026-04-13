# CraftBolt.cz - PRD

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v CR.

## Tech Stack
- **Web**: React + Tailwind | FastAPI + MongoDB
- **Mobile**: React Native + Expo (Android first)
- **Integrace**: BulkGate SMS (http.client), Stripe LIVE, Wedos SMTP, OpenAI GPT-4o

## Mobilni aplikace — stav
### Hotove obrazovky
- LoginScreen, RegisterScreen (6-krokova, ARES, email check)
- CustomerDashboard (7 zalozek, FAB, auto-refresh)
- SupplierDashboard (7 zalozek, earnings, paywall)
- DemandDetailScreen (chat, dokonceni, spory, poloha, hodnoceni)
- ProfileScreen (SMS toggle, avatar, editace, odhlaseni)
- NotificationsScreen (neprecetne zpravy)
- SharedComponents (DemandCard, TabBar, StatusBadge, EmptyState)

### Chybi
- Push notifikace (Expo Notifications)
- MapView v detailu zakazky
- Referencni fotky dodavatele
- Deep linking

## Web opravy 13. duben 2026
- FIX: DemandResponse duplicitni pole (completion_photos List[dict] vs List[str]) — pricina zmizeni poptavek
- FIX: SMS prepinac zakaznika (left-5.5 bug)
- FIX: Faktura font FreeSans zabaleny v /backend/fonts/
- FIX: Adresa sidla — mapuje na address (z ARES)
- FIX: Platba Stripe — agresivni polling 3s po navratu
- FIX: Email kontrola pri registraci v 1. kroku
- FIX: Tab prepinani po dokonceni/odmitnuti zakazky
- FIX: Admin panel error handling pro vadne uzivatele
- NOVY: /api/debug/db-check diagnosticky endpoint

## Backlog
- P1: SMS na AC/DC MONT (potreba db-check z produkce)
- P1: Push notifikace v mobilni app
- P2: Referencni fotky dodavatelu
- P2: Bezpecnostni zpevneni (Rate limiting, CSRF, XSS)
- P3: QR kody, nove platebni moznosti
- P3: iOS verze (potreba Apple Developer ucet)
