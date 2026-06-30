# Ruta Financiera

Aplicacion movil de planificacion financiera personal para colombianos entre 20 y 40 anos.

El MVP busca ayudar al usuario a ingresar informacion financiera aproximada, entender su situacion actual, elegir una meta y recibir un diagnostico financiero simple.

## Stack

- Expo SDK 54
- React Native
- TypeScript
- Expo Router
- React Native StyleSheet
- Lucide React Native

## Requisitos

- Node.js `>=20.19.4`
- npm
- Expo Go compatible con SDK 54

Si Expo Go muestra un error de incompatibilidad de SDK, confirma que el proyecto use Expo SDK 54 y vuelve a iniciar Metro con cache limpia.

## Instalacion

```bash
npm install
```

## Desarrollo

```bash
npx expo start --clear
```

Tambien puedes usar:

```bash
npm run ios
npm run android
npm run web
```

## Validacion

```bash
npm run typecheck
npx expo install --check
```

## Web y GitHub Pages

La app se puede exportar como sitio estatico con Expo:

```bash
npm run export:web
```

El workflow `.github/workflows/deploy-web.yml` publica `dist/` en GitHub Pages cuando hay cambios en `main` o cuando se ejecuta manualmente desde GitHub Actions.

Para publicar en GitHub Pages:

1. En GitHub, ve a `Settings > Pages`.
2. En `Build and deployment`, selecciona `GitHub Actions`.
3. Configura estos secretos del repositorio si quieres que Supabase funcione en la web publicada:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

El build usa `EXPO_BASE_URL=/Ruta_financiera` para que los assets y rutas funcionen bajo:

```text
https://Nicolas2320.github.io/Ruta_financiera/
```

## Supabase

La app puede persistir el onboarding y el progreso del plan mensual en Supabase.

1. Crea un proyecto en Supabase.
2. Ejecuta el SQL de `docs/supabase-schema.sql` en el SQL Editor.
3. Copia `.env.example` a `.env` y completa:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Para pruebas, puedes crear un usuario desde `/auth`. Si Supabase exige confirmacion por correo, confirma el email o desactiva temporalmente esa opcion en el proyecto de pruebas.

### Naming convention

- Technical structure uses English: files, functions, database tables, columns, policies, and environment variables.
- User-facing copy stays in Spanish.
- Values selected by the user can stay in Spanish because they are product/content data, not schema.

## Pantallas actuales

- `/`: Pantalla de bienvenida.
- `/privacy`: Placeholder de privacidad y confianza.
- `/demo`: Placeholder de demo.

## Estructura principal

```text
app/
  _layout.tsx
  index.tsx
  privacy.tsx
  demo.tsx
components/
  BenefitCard.tsx
  PrimaryButton.tsx
constants/
  theme.ts
```

## Notas del MVP

La pantalla de bienvenida no solicita datos reales, no implementa login, backend, pagos ni conexion bancaria. El CTA principal navega a `/privacy` para continuar con la Pantalla 2 del flujo.
