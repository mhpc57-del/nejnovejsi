# CraftBolt - Mobilní aplikace (React Native / Expo)

## Spuštění na vašem telefonu

### Předpoklady
1. **Node.js** — stáhněte z https://nodejs.org (verze 18+)
2. Na telefonu nainstalujte **Expo Go** z Google Play Store

### Instalace a spuštění

```bash
# 1. Otevřete příkazový řádek (CMD/PowerShell) a přejděte do složky mobile
cd mobile

# 2. Nainstalujte závislosti
npm install

# 3. Spusťte vývojový server
npx expo start
```

### Testování na telefonu
1. Po spuštění `npx expo start` se v příkazovém řádku zobrazí **QR kód**
2. Na Android telefonu otevřete appku **Expo Go**
3. Naskenujte QR kód — appka se okamžitě spustí na vašem telefonu!

### Sestavení .apk pro Google Play

```bash
# Nainstalujte EAS CLI
npm install -g eas-cli

# Přihlaste se do Expo účtu (zdarma)
eas login

# Sestavte APK pro Android
eas build -p android --profile preview
```

APK soubor si poté stáhnete z Expo dashboardu a nahrajete do Google Play Console.

## Struktura projektu

```
mobile/
├── App.js                      # Vstupní bod aplikace
├── app.json                    # Expo konfigurace
├── package.json                # Závislosti
├── assets/                     # Ikony a splash screen
└── src/
    ├── navigation/
    │   └── AppNavigator.js     # Routing (React Navigation)
    ├── screens/
    │   ├── LoginScreen.js      # Přihlášení
    │   ├── RegisterScreen.js   # Registrace (3 kroky)
    │   ├── CustomerDashboard.js # Dashboard zákazníka
    │   ├── SupplierDashboard.js # Dashboard dodavatele (4 taby)
    │   ├── DemandDetailScreen.js # Detail zakázky + chat
    │   └── ProfileScreen.js    # Profil uživatele
    ├── services/
    │   └── api.js              # API klient (axios)
    └── utils/
        ├── AuthContext.js      # Autentizace (Context API)
        └── theme.js            # Barvy a styly
```

## Funkce (Fáze 1)
- Přihlášení a registrace (zákazník / dodavatel)
- Dashboard zákazníka — poptávky, stat karty, nová poptávka
- Dashboard dodavatele — 4 kategorie (Dostupné/Rozdělané/Dokončené/Nedokončené)
- Detail zakázky — závazné/nezávazné přijetí, chat v reálném čase
- Profil — zobrazení a úprava údajů
- Automatické obnovení přihlášení (token v AsyncStorage)

## API
Aplikace se připojuje k backendovému API na `https://craftbolt.cz/api`
