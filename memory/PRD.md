# CraftBolt - PRD & Architecture

## Popis
Servisni trziste CraftBolt.cz - React + Vite + FastAPI + MongoDB

## Implementovano
- JWT auth + email verifikace + zapomenute heslo
- 3 role + admin, registrace (OSVC/Firma/Nepodnikatel), ARES
- Dark mode, SMS (BulkGate), SMTP (Wedos), Stripe (199/299/399 Kc)
- Poptavky s mapou, chat s read tracking, profily, certifikaty, service area
- AI Chat (GPT), Quick Demand, Weather widget
- Admin Panel: uzivatele, zakazky, kategorie, faktury, REKLAMA
- Fakturacni system, Persistentni upload, SMS toggle
- Kompletni UI/UX Redesign + Framer Motion
- Homepage: oranzove slova, rocni cenovy prepinac, 8 karet TOPOVANI DODAVATELE
- Mobilni navigace: Domu/Prehled/+/Profil/Vice drawer
- **Hero Slider (2026-04-11)**: 13 profesionalnich fotek remeslniku
  - Predani zakazky, elektrikar, klimatizace, zednik, instalater, topenar
  - Hromosvod, sadrokartonar, uklid, hodinovy manzel, rekonstrukce RD
  - Rucni vykopove prace, strojni vykopove prace (bagr)

## Backlog
- P0: BulkGate SMS - ceka na schvaleni registrace (48 hod)
- P0: Stripe reklamni karty - nastavit spravny Stripe klic
- P1: Stripe Live finalizace (ceka na ucetni)
- P2: Wedos SMTP monitoring
- P2: Mobilni aplikace - PAUSOVANO
