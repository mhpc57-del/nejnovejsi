# CraftBolt - PRD & Project Status

## Popis projektu
CraftBolt.cz — webová a mobilní platforma propojující řemeslníky/dodavatele se zákazníky v ČR.

## Architektura
- **Frontend Web:** React, Tailwind CSS, Vite
- **Frontend Mobilní:** React Native, Expo SDK 54
- **Backend:** FastAPI, MongoDB
- **Integrace:** Wedos SMTP, Twilio SMS, ARES, OpenStreetMap Geocoding, Stripe (MOCKED)

## Implementováno

### Web
- Registrace (4-5 kroků) + email verifikace + SMS notifikace
- Login s ověřením emailu (admin bypass)
- Dashboard zákazníka/dodavatele/admina
- Detail zakázky s editací a chatem
- Chat: zákazník vidí chat jakmile dodavatel napíše zprávu (i na otevřených)
- Chat notifikace: zvuk + toast bublinka + email + SMS
- Jména: zákazník zobrazen jménem (ne emailem) v chatu i v sidebar
- Soft-accept workflow, Geocoding + ARES, Mapa, Hodnocení
- Upload fotek s robustním getImageUrl()
- Emergent badge + PostHog kompletně odstraněny

### Klíčové opravy (2026-04-04)
- Chat viditelný pro zákazníka když dodavatel napíše (i na open demands)
- Chat notifikace: zvuk + vyskakovací toast + email + SMS
- Jméno zákazníka místo emailu (demands.customer_name + sender_name)
- Migrace 29 existujících demands s emailem -> jméno
- getImageUrl() pro správné zobrazení fotek
- Email verifikace, SMS při registraci
- Úprava zakázky zákazníkem

## Testování
- Iteration 8-12: Všechny testy 100%

## Zbývající úkoly
### P1
- Mobilní app synchronizace
- Push notifikace pro APK

### P2
- Dark mode, Date picker

## Mocked: Stripe (platby)
