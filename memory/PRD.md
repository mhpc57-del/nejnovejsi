# CraftBolt - PRD & Project Status

## Základní informace
- **Projekt:** CraftBolt.cz - Platforma pro propojení zákazníků s řemeslníky
- **Doména:** craftbolt.cz
- **Poslední aktualizace:** 1. 4. 2026

## Architektura
- **Web Frontend:** React.js + Tailwind CSS + Leaflet (`/app/frontend/`)
- **Mobile App:** React Native / Expo (`/app/mobile/`)
- **Backend:** FastAPI - modulární routes (`/app/backend/`)
- **Databáze:** MongoDB
- **Integrace:** Stripe (MOCKED), Twilio, Wedos SMTP

## Mobilní aplikace (Fáze 1) — NOVÉ 1.4.2026

### Vytvořené obrazovky
- **LoginScreen** — přihlášení s validací
- **RegisterScreen** — 3-kroková registrace (údaje → role → osobní info + kategorie)
- **CustomerDashboard** — stat karty, seznam poptávek, FAB "Nová poptávka", modal s formulářem
- **SupplierDashboard** — 4 taby (Dostupné/Rozdělané/Dokončené/Nedokončené), earnings bar
- **DemandDetailScreen** — info karta, Závazně/Nezávazně přijmout, chat (polling 5s), Dorazil jsem, Dokončit
- **ProfileScreen** — avatar, hodnocení, dochvilnost, editace údajů, kategorie

### Technická architektura
- React Navigation (Stack + Bottom Tabs)
- AsyncStorage pro persistentní přihlášení
- Axios API klient s JWT interceptorem
- Připojeno na stávající backend API

### Spuštění
1. `cd mobile && npm install && npx expo start`
2. Expo Go na telefonu → naskenovat QR kód

## Web — implementováno

### Dashboardy
- Zákazník: stat karty → modal popup, nová poptávka s termínem realizace
- Dodavatel: 4 kategorie, mapa (h-80, scroll zoom), finanční přehled
- Mobilní bottom navigation bar, deaktivace účtu

### Systém přijímání zakázek
- Závazně přijmout / Nezávazně přijmout (5 důvodů + email+SMS notifikace)
- Chat se zobrazí po kliknutí "Spustit chat"

### Core
- JWT auth, 3 role, ARES, 61 kategorií, chat polling, hodnocení + dochvilnost
- Větší a černé texty, fotomenu Vyfotit/Galerie, klikatelné profily

## Backlog
- Fáze 2 mobilní app: Profil s fotoaparátem, hodnocení, upload fotek
- Fáze 3 mobilní app: Admin panel, platby, plný feature parity
- Push notifikace (Firebase Cloud Messaging)
