# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v Ceske republice.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MongoDB
- **Mobile**: React Native (Expo)
- **Integrace**: OpenAI GPT-4o, BulkGate SMS, Stripe (LIVE), Wedos SMTP

## Cenovy model
- Zakaznik: ZDARMA, overeni poptavky 49 Kc
- Dodavatel: 190 Kc/mesic nebo 1890 Kc/rok
- Reklamni banner: 39 Kc/den nebo 990 Kc/mesic

## Zmeny 12. duben 2026
- FIX: DemandResponse model — pridano verified + verified_at
- FIX: Light/Dark mode — 5 HomePage komponent
- FIX: BulkGate SMS credentials (37414 -> 37417, novy token)
- FIX: SMS zakaznikovi posila VZDY kdyz ma telefon
- FIX: Po prijeti zakazky UI prepne na "Rozdelane"
- FIX: Hero karty stejne velke (aspect-square), grid 4/3
- FIX: Hero sloupce 6:6 (zmenseni obrazku)
- FIX: Customer "Overene" filtruje jen open demands
- FIX: "Hlavni menu" -> "Muj profil" s routou dle role
- FIX: "Poptavky:" -> "Moje poptavky:" v customer sidebar
- FIX: Lepsi chybova hlaska pri nedostupnem serveru
- NOVY: Omezeni neoverenych poptavek pro dodavatele (skryte info, tlacitko vyzadat overeni)
- NOVY: Tlacitko "Overit zakazku za 49 Kc" v customer detailu neoverenych
- NOVY: Cervene upozorneni u neoverenych poptavek pro zakaznika
- NOVY: Inline chat v CustomerDashboard i SupplierDashboard (bez nutnosti "Otevrit detail")
- NOVY: CustomerDemandDetail a SupplierDemandDetail komponenty
- NOVY: Zelena bublinka "Nova" na kartach pro dodavatele (ulozeno v DB, sync across devices)
- NOVY: Backend GET/POST /api/demands/viewed — stav "videnno" v MongoDB
- NOVY: Kompletni system sporu (disputes):
  - Dodavatel: "Zakazku nelze dodelat" → 2-krokovy formular (popis+fotky, vyber duvodu a/b/c/d)
  - Moznost a: upload rozpoctu na vice praci (Excel/PDF/foto)
  - Backend: POST /api/demands/{id}/dispute, POST .../dispute/respond
  - Zakaznik: odpoved (potvrdit rozpocet, zamitnout, nechci pokracovat, znovu vystavit)
  - Zalozka "V reseni" v obou dashboardech
  - Vse logovano v DB (disputes kolekce s history)
  - Admin endpoint GET /api/admin/disputes

## Backlog
- P1: QR kody (ceka na banku)
- P1: Platebni moznosti zakazniku (ceka na ucetni)
- P2: Admin sekce pro spory (UI)
- P3: React Native app (pozastaveno)
