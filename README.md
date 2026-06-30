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
