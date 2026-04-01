# CraftBolt - Mobilní aplikace (React Native / Expo)

## Spuštění na vašem telefonu

### Předpoklady
1. **Node.js** — stáhněte z https://nodejs.org (verze 20+)
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
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

APK soubor si poté stáhnete z Expo dashboardu a nahrajete do Google Play Console.

## Struktura projektu

```
mobile/
├── App.js                      # Vstupní bod aplikace
├── app.json                    # Expo konfigurace (SDK 54)
├── package.json                # Závislosti
├── assets/                     # Ikony a splash screen
└── src/
    ├── navigation/
    │   └── AppNavigator.js     # Routing (React Navigation + Bottom Tabs)
    ├── screens/
    │   ├── LoginScreen.js      # Přihlášení (s ikonami)
    │   ├── RegisterScreen.js   # Registrace (3 kroky, progress bar)
    │   ├── CustomerDashboard.js # Dashboard zákazníka (ikony, statistiky)
    │   ├── SupplierDashboard.js # Dashboard dodavatele (4 taby s ikonami)
    │   ├── DemandDetailScreen.js # Detail zakázky + chat
    │   └── ProfileScreen.js    # Profil (fotoaparát/galerie, hodnocení)
    ├── services/
    │   └── api.js              # API klient (axios)
    └── utils/
        ├── AuthContext.js      # Autentizace (Context API + AsyncStorage)
        └── theme.js            # Barvy a styly
```

## Funkce
- Přihlášení a registrace (zákazník / dodavatel)
- Dashboard zákazníka — poptávky, stat karty, nová poptávka
- Dashboard dodavatele — 4 kategorie (Dostupné/Rozdělané/Dokončené/Nedokončené)
- Detail zakázky — závazné/nezávazné přijetí, chat v reálném čase
- Profil — profilová fotka (fotoaparát/galerie), hodnocení, dochvilnost, editace
- Ionicons ikony pro profesionální vzhled
- Safe Area podpora pro všechny typy telefonů
- Automatické obnovení přihlášení (token v AsyncStorage)

## API
Aplikace se připojuje k backendovému API na `https://craftbolt.cz/api`
