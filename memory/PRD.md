# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v Ceske republice.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MongoDB
- **Mobile**: React Native (Expo), react-native-maps, expo-notifications
- **Integrace**: OpenAI GPT-4o (Emergent LLM Key), BulkGate SMS, Stripe (LIVE), Wedos SMTP, Expo Push

## Cenovy model (duben 2026)
- **Zakaznik**: ZDARMA, volitelne overeni poptavky za 49 Kc
- **Dodavatel**: 190 Kc/mesic NEBO 1.890 Kc/rok (uspora 390 Kc)
- **Reklamni banner**: 39 Kc/den NEBO 990 Kc/mesic
- Vsechny ceny vcetne 21% DPH, 14denni trial ZRUSEN
- Registrace pouze 2 role: Zakaznik, Dodavatel (mesicni/rocni)

## Posledni zmeny (12. duben 2026)
- FIX: BulkGate SMS credentials aktualizovany (App ID 37414 -> 37417, novy token)
- FIX: SMS se nyni posila zakaznikovi VZDY kdyz ma telefon (ne jen pri sms_notifications=true)
- FIX: Po prijeti zakazky dodavatelem se UI automaticky prepne na zalozku "Rozdelane"
- FIX: DemandResponse model — pridano `verified` a `verified_at` pole
- FIX: Light/Dark mode — opraveno 5 komponent HomePage (hardcodovane tmave pozadi)
- FIX: Hero karty kategorii — vse stejne velke (aspect-square), grid "Dalsi kategorie" = aspect-[4/3]
- NOVY: Detail neoverenych poptavek pro dodavatele:
  - Skryte info o zakaznikovi, online poloha, mapa, rozpocet
  - Tlacitko "Zakazku bych prijmul, ale poptavka neni overena"
  - Backend endpoint POST /api/demands/{id}/request-verification
  - Odesle zakaznikovi email + SMS s odkazem na Stripe checkout (49 Kc)
  - CustomerDashboard: automaticky redirect na Stripe pri ?verify_demand=ID
- NOVY: Detail overenych poptavek pro dodavatele:
  - Plny detail vcetne info o zakaznikovi, mapy, chat, prijmout/nezavazne prijmout

## Backlog
- P1: QR kody na fakturach a platebnych obrazovkach (vyzaduje navstevu banky pro API klic)
- P1: Nove platebni moznosti pro zakazniky (ceka na ucetni)
- P2: Overit SMS na produkci (BulkGate za WEDOS WAF)
- P3: React Native mobilni app (PAUSED)
