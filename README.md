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
- Supabase Auth, Postgres y Edge Functions
- Vitest y pgTAP

## Requisitos

- Node.js `>=22.23.1`
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
npm run check
npm run test:coverage
npm run test:edge
npx expo install --check
npx expo-doctor
```

`npm run check` ejecuta TypeScript, las pruebas unitarias y el export estatico web.

Las pruebas de base de datos requieren Docker y usan un PostgreSQL local aislado:

```bash
npx supabase start -x edge-runtime,gotrue,imgproxy,kong,logflare,mailpit,postgres-meta,postgrest,realtime,storage-api,studio,supavisor,vector --yes
npx supabase test db --local
npx supabase stop --no-backup
```

Los casos pgTAP se ejecutan dentro de una transaccion y revierten sus datos al finalizar.

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
2. Vincula el proyecto y aplica las migraciones versionadas de `supabase/migrations/`:

```bash
npx supabase link
npx supabase db push
```

3. Copia `.env.example` a `.env` y completa:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

La Edge Function `assistant` mantiene `OPENAI_API_KEY`, `OPENAI_MODEL`,
`ASSISTANT_DAILY_LIMIT` y `ASSISTANT_USAGE_TIME_ZONE` como secrets del servidor.
Las llaves internas de Supabase son proporcionadas automaticamente por la plataforma;
no deben copiarse al cliente ni guardarse en el repositorio.

Para pruebas, puedes crear un usuario desde `/auth`. Si Supabase exige confirmacion por correo, confirma el email o desactiva temporalmente esa opcion en el proyecto de pruebas.

### Naming convention

- Technical structure uses English: files, functions, database tables, columns, policies, and environment variables.
- User-facing copy stays in Spanish.
- Values selected by the user can stay in Spanish because they are product/content data, not schema.

## Pantallas actuales

- `/` y `/privacy`: bienvenida, privacidad y entrada al recorrido.
- `/auth`: registro e inicio de sesion.
- `/dashboard`: resumen financiero principal.
- `/spending`, `/expenses` y `/debts`: gastos y deudas.
- `/goals-overview`, `/action-plan` y `/simulation`: metas, plan y escenarios.
- `/assistant`: asistente financiero educativo.
- `/settings`: ajustes y gestion de datos.

## Estructura principal

```text
app/
  _layout.tsx
  assistant.tsx
  dashboard.tsx
  index.tsx
  privacy.tsx
components/
  navigation/
  ui/
constants/
  theme.ts
context/
lib/
supabase/
tests/
utils/
```

## Notas del MVP

El MVP implementa autenticacion, persistencia del perfil financiero, calculos y planes
educativos. No implementa pagos, movimientos de dinero ni conexion bancaria. El
asistente explica resultados calculados por la app y no reemplaza asesoria financiera
profesional.
