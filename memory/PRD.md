# CraftBolt.cz - PRD

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v CR.

## Tech Stack
- **Web**: React + Tailwind | FastAPI + MongoDB
- **Mobile**: React Native + Expo SDK 54 (Android) — build funguje, app nainstalovana
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
- FIX: DemandResponse duplicitni pole — pricina zmizeni poptavek
- FIX: location_sharing chybelo v user_to_response()
- FIX: sms_notifications chybelo v query projection
- FIX: SMS prepinac zakaznika
- FIX: Faktura font FreeSans zabaleny v /backend/fonts/
- FIX: Adresa sidla mapuje na address (ARES)
- FIX: Platba Stripe agresivni polling
- FIX: Email kontrola pri registraci
- FIX: Tab prepinani po dokonceni/odmitnuti
- FIX: Admin panel error handling
- NOVY: /api/debug/db-check endpoint
- NOVY: /api/auth/check-email endpoint

## Backlog
- P1: Push notifikace mobilni app
- P1: SMS na AC/DC MONT (db-check z produkce)
- P2: Referencni fotky dodavatelu
- P2: Bezpecnostni zpevneni
- P3: QR kody, iOS verze, nove platebni moznosti
