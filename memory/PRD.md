# CraftBolt - PRD & Project Status

## Popis projektu
CraftBolt.cz — webová a mobilní platforma propojující řemeslníky/dodavatele se zákazníky v České republice.

## Architektura
- **Frontend Web:** React, Tailwind CSS, Vite
- **Frontend Mobilní:** React Native, Expo SDK 54
- **Backend:** FastAPI, MongoDB
- **Integrace:** Wedos SMTP, Twilio SMS, Expo Push Notifications, Stripe (MOCKED), ARES

## Co je implementováno

### Web (HOTOVO)
- Registrace/přihlášení (zákazník, dodavatel, admin)
- Dashboard zákazníka s poptávkami, stat kartami
- Dashboard dodavatele s filtry
- Detail zakázky s chatem, závazným/nezávazným přijetím
- Soft-accept workflow (5 důvodů)
- Geocoding + ARES integrace
- Mapa s lokacemi
- Systém hodnocení
- Skóre dochvilnosti dodavatelů
- Upload dokumentů a fotek
- Deaktivace účtu s admin restore
- Emailové + SMS notifikace s rate limitem

### Mobilní aplikace (HOTOVO - 2026-04-02)
- **Login/Register:** Ionicons, 3-krokový registrační proces
- **Dashboard zákazníka:** Stat karty, FAB, nová poptávka s fotkami (kamera + galerie)
- **Dashboard dodavatele:** 4 taby, badge počty, celkové příjmy
- **Mapa zakázek:** react-native-maps, filtrování podle stavu, GPS lokace uživatele, callout s detailem
- **Detail zakázky:** Závazné/nezávazné přijetí, chat, dorazil jsem, dokončit, zrušit, fotky, hodnocení
- **Oznámení:** Soft-accepty, přijaté zakázky, dokončené, příjezdy
- **Profil:** Upload fotky → backend, editace, hodnocení, dochvilnost, kategorie, recenze
- **Push notifikace:** Expo Push API, registrace tokenu na backendu, notifikace při nové zprávě/nabídce/změně stavu
- **Navigace:** 4 bottom taby (Přehled, Mapa, Oznámení, Profil)
- **EAS Build:** Konfigurace pro preview APK a production AAB

### Backend push notifications (HOTOVO - 2026-04-02)
- Endpoint `POST /api/users/push-token` pro ukládání push tokenů
- `push_notifications.py` — Expo Push API sender
- Integrace do všech notification metod (new_demand, new_offer, message, status_change, soft_accept)
- Chat push notifikace procházejí i při email throttlingu

### Email rate limiting (HOTOVO - 2026-04-01)
- Chat notifikace: max 1 email za 15 min na konverzaci
- Nové poptávky: max 20 dodavatelů
- Denní limit: 400 emailů

## Zbývající úkoly

### P1 (Důležité)
- Uživatel otestuje novou verzi mobilní app na telefonu
- Google Maps API klíč pro mapu na Androidu (nutné pro produkci)
- EAS build: uživatel musí vytvořit Expo účet a spustit `eas build`
- Firebase project pro production push notifikace (optional, Expo Push funguje i bez)

### P2 (Nice to have)
- Offline podpora v mobilní app
- Dark mode
- Biometrické přihlášení

## Mocked integrace
- Stripe (platby) — MOCKED
