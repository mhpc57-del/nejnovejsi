# CraftBolt.cz - PRD (Product Requirements Document)

## Produkt
Platforma pro propojeni zakazniku s remeslniky a dodavateli sluzeb v Ceske republice.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: FastAPI, MongoDB
- **Mobile**: React Native (Expo) — pozastaveno
- **Integrace**: OpenAI GPT-4o, BulkGate SMS, Stripe (LIVE), Wedos SMTP

## Cenovy model
- Zakaznik: ZDARMA, overeni poptavky 49 Kc
- Dodavatel: 190 Kc/mesic nebo 1890 Kc/rok
- Reklamni banner: 39 Kc/den nebo 990 Kc/mesic

## Klicove flow
### Dokonceni zakazky (dvoufazove)
1. Dodavatel oznaci jako dokoncenou → status `pending_completion`
2. Zakaznik vidi v zalozce "K potvrzeni" — fotky, cena
3. Zakaznik muze: Potvrdit (→ completed) nebo Odmitnout (→ dispute)
4. Totez opacne — pokud zakaznik iniciuje, dodavatel musi potvrdit

### Spory (dispute)
1. Dodavatel oznaci "Zakazku nelze dodelat" → 2-krokovy formular
2. Zakaznik vidi duvod + popis + fotky v zalozce "V reseni"
3. Zakaznik reaguje: potvrdit rozpocet / zamitnout / nechci pokracovat / znovu vystavit

## Zmeny 12. duben 2026 - Odpoledni relace
- FIX: BulkGate SMS — prepsan na http.client (WEDOS WAF blokuje Python requests)
- FIX: BulkGate credentials hardcoded jako fallback (produkce necte .env)
- FIX: Kategorie sjednoceny (Elektrikari → Elektromontazni prace)
- FIX: Migrace kategorii pri startu serveru
- FIX: Tlacitko "Zrusit zakazku" — pridany onClick handler
- FIX: SMS notifikace prepinac — funguje okamzite bez nutnosti ulozit profil
- FIX: SMS prepinac vizualni chyba (left-5.5 → left-[22px])
- FIX: Mapa v detailu zakazky — zobrazuje se i pro neoverene prijate zakazky
- FIX: Sdileni polohy — uklada se do DB, automaticky se zapne pri navratu
- NOVY: Dvoufazove potvrzeni dokonceni (pending_completion stav)
- NOVY: Zalozka "K potvrzeni" v obou dashboardech
- NOVY: Favicon — sestihran s oranzovou helmou
- NOVY: Mobilni responzivita — kompletni audit a opravy
  - Flex-col lg:flex-row pro chat layout
  - Horizontalne scrollovatelne zalozky na mobilu
  - Responzivni padding (p-3 sm:p-6)
  - Spodni navigace s pb-20 clearance
  - Chat panel plna sirka na mobilu
- NOVY: Auto-refresh dashboardu (15s) + status polling v detailu (10s)
- NOVY: verification_requests se uklada a nacita z DB
- NOVY: Zakaznik muze pridat fotky a hodnoceni pri potvrzovani

## Stare zmeny
- DemandResponse model — pridano verified + verified_at
- Light/Dark mode — 5 HomePage komponent
- BulkGate SMS credentials (37414 -> 37417)
- Customer "Overene" filtruje jen open demands
- "Hlavni menu" -> "Muj profil" s routou dle role
- Omezeni neoverenych poptavek pro dodavatele
- Inline chat v obou dashboardech
- Zelena bublinka "Nova" na kartach pro dodavatele
- Kompletni system sporu (disputes)
- Advanced Service Areas s Leaflet mapou
- Infinite Branches v profilu dodavatele
- Unified Demand Maps (3 lokace)
- Chat email/phone sanitizace
- Unread message bubbles

## Backlog
- P1: QR kody (ceka na banku)
- P1: Platebni moznosti zakazniku (ceka na ucetni)
- P2: Admin sekce pro spory (UI)
- P2: Bezpecnostni zpevneni (Rate limiting, CSRF, XSS)
- P3: React Native app (pozastaveno)
