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

## Zmeny 12. duben 2026
- FIX: BulkGate SMS token (1m → lm na pozici 39-40)
- FIX: BulkGate sender_id z gProfile/18254 na gText/CraftBolt
- FIX: Tlacitko "Zrusit zakazku" — chybel onClick handler
- FIX: verification_requests se nyni uklada a nacita z DB
- FIX: Auto-refresh dashboardu (polling 15s) pro synchronizaci
- FIX: Status polling v detailu (10s) pro real-time aktualizace
- NOVY: Dvoufazove potvrzeni dokonceni (pending_completion stav)
- NOVY: Zalozka "K potvrzeni" v obou dashboardech
- NOVY: Favicon — sestihran s oranzovou helmou
- NOVY: Zakaznik muze pridat fotky a hodnoceni pri potvrzovani
- NOVY: Email notifikace pro pending_completion

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
- P1: Mobilni responzivita dashboardu
- P2: Admin sekce pro spory (UI)
- P2: Bezpecnostni zpevneni (Rate limiting, CSRF, XSS)
- P3: React Native app (pozastaveno)
