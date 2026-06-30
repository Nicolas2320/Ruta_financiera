# Jerarquia de diseno - Ruta Financiera

Fecha de referencia: 2026-06-21

Este documento resume la direccion visual y la jerarquia de diseno que estamos usando en Ruta Financiera. Debe servir como guia para futuros ajustes de UI sin romper la consistencia entre pantallas.

## Direccion visual

Ruta Financiera debe sentirse como un coach financiero calido: confiable, humano, moderno, claro y amable.

La interfaz no debe parecer banco tradicional, hoja de calculo ni formulario basico. La experiencia debe sentirse como una ruta guiada, con pasos claros, tarjetas visuales, ayudas suaves y decisiones faciles de tomar.

Principios:

- Mobile-first.
- Fondo claro ligeramente azulado.
- Texto principal navy oscuro.
- Azul intenso para accion, seleccion y progreso.
- Verde/menta para confianza, ayuda y seguridad.
- Estados de alerta con amarillo, naranja y rojo solo cuando aportan significado.
- Cards blancas con bordes redondeados grandes.
- Sombras sutiles, nunca pesadas.
- Espaciado generoso.
- Iconos simples dentro de circulos o fondos suaves cuando representan categorias, estados o acciones.
- Rangos monetarios deben priorizar legibilidad: texto claro, sin iconos decorativos innecesarios.

## Fuente y jerarquia tipografica

La app usa la fuente nativa del sistema. No hay fuente custom instalada actualmente.

La fuente debe mantenerse consistente usando siempre los tokens de `constants/theme.ts`. Evitar `fontSize`, `fontWeight` y `lineHeight` numericos escritos directamente en pantallas o componentes.

| Uso | Token | Tamano | Line height | Peso recomendado |
| --- | --- | ---: | ---: | --- |
| Hero principal de welcome | `typography.display` | 35 | 41 | `typography.weight.black` |
| Titulos de pantallas finales/resultados | `typography.title` | 30 | 36 | `typography.weight.black` |
| Titulos hero dentro de cards | `typography.heroTitle` | 27 | 32 | `typography.weight.black` |
| Titulos de hero compartido | `typography.cardTitle` | 24 | 29 | `typography.weight.black` |
| Marca/header welcome | `typography.brand` | 21 | 26 | `typography.weight.black` |
| Titulos de secciones grandes | `typography.sectionTitle` | 20 | 26 | `typography.weight.black` |
| Preguntas del onboarding | `typography.question` | 17 | 23 | `typography.weight.black` |
| Botones | `typography.button` | 16 | 22 | `typography.weight.semibold` |
| Subtitulos | `typography.subtitle` | 16 | 24 | regular o medium |
| Opciones/cards seleccionables | `typography.option` | 15 | 20 | `typography.weight.bold` o `black` |
| Texto base | `typography.body` | 15 | 22 | regular, semibold o bold segun jerarquia |
| Ayudas, labels, pills | `typography.caption` | 13 | 18 | semibold, bold o black |
| Badges pequenos | `typography.badge` | 12 | 17 | `typography.weight.black` |
| Texto compacto | `typography.small` | 11 | 15 | semibold o bold |

Reglas:

- Una pantalla no debe inventar tamanos nuevos si ya existe un token equivalente.
- Las preguntas del onboarding deben usar `question`.
- Las opciones dentro de cards deben usar `option`, `caption`, `badge` o `small` segun el espacio.
- El texto secundario debe usar `textMuted`.
- El texto de baja jerarquia debe usar `textSubtle`.
- No usar letter spacing negativo.
- Usar `typography.lineHeight.*` junto con cada tamano para evitar textos apretados o cortados.

## Colores

Los colores base viven en `constants/theme.ts`.

| Uso | Token | Color |
| --- | --- | --- |
| Fondo general | `colors.background` | `#F6F9FC` |
| Superficies/cards | `colors.surface` | `#FFFFFF` |
| Superficie azul suave | `colors.surfaceMuted` | `#EEF5FF` |
| Primario/accion | `colors.primary` | `#155EEF` |
| Primario oscuro | `colors.primaryDark` | `#0F3EA8` |
| Fondo primario suave | `colors.primarySoft` | `#E7F0FF` |
| Soporte/confianza | `colors.support` | `#14905D` |
| Fondo soporte suave | `colors.supportSoft` | `#E8F8EF` |
| Fondo advertencia suave | `colors.warningSoft` | `#FFF5E7` |
| Texto principal | `colors.text` | `#0F172A` |
| Texto secundario | `colors.textMuted` | `#475569` |
| Texto sutil | `colors.textSubtle` | `#64748B` |
| Bordes | `colors.border` | `#E2E8F0` |
| Sombras | `colors.shadow` | `#1E293B` |

Uso de colores:

- Azul: acciones principales, progreso, seleccion activa, acentos positivos de avance.
- Verde/menta: confianza, privacidad, seguridad, ayuda, informacion tranquilizadora.
- Lila: incertidumbre o "No estoy seguro".
- Amarillo/naranja/rojo: niveles de riesgo, carga o urgencia.
- Gris azulado: informacion secundaria, opciones no seleccionadas, iconos neutros.

Ejemplo de escala contextual para deudas:

- No pago deudas: verde oscuro.
- Menos del 10%: verde claro.
- 10% - 20%: amarillo.
- 20% - 40%: naranja.
- Mas del 40%: rojo.
- No estoy seguro: lila.

## Espaciado

Usar `spacing` desde `constants/theme.ts`.

| Token | Valor | Uso |
| --- | ---: | --- |
| `spacing.xs` | 6 | Separaciones internas pequenas |
| `spacing.sm` | 10 | Separacion entre elementos cercanos |
| `spacing.md` | 16 | Padding/card gap principal |
| `spacing.lg` | 24 | Separacion de bloques grandes |
| `spacing.xl` | 32 | Espacio amplio, heroes o layouts especiales |

Reglas:

- Las pantallas deben usar `gap` y padding consistentes.
- El contenido debe tener `maxWidth` en web para mantener lectura mobile-first.
- Mantener `ScrollView` cuando el contenido pueda crecer.
- Evitar que el boton principal quede pegado al borde inferior.

## Radios y cards

| Token | Valor | Uso |
| --- | ---: | --- |
| `radius.sm` | 10 | Icon wrappers pequenos |
| `radius.md` | 14 | Inputs, botones secundarios, chips grandes |
| `radius.lg` | 22 | Cards principales |
| `radius.pill` | 999 | Pills, badges circulares, indicadores |

Cards:

- Cards principales: fondo blanco, borde azul-gris sutil, radio grande, sombra suave.
- Cards seleccionables: borde azul y fondo azul muy claro al seleccionar.
- No anidar cards dentro de cards salvo herramientas o contenido realmente agrupado.
- Evitar sombras fuertes. Usar `shadows.card`.

## Botones

Boton primario:

- Fondo azul `colors.primary`.
- Texto blanco.
- Altura minima cercana a 54-56.
- Radio 17 o `radius.md`, segun contexto.
- Flecha a la derecha cuando indique avance.

Boton secundario:

- Fondo claro o blanco.
- Texto azul.
- Borde azul suave.
- Misma altura tactil que el primario.

Reglas:

- Mantener `PrimaryButton`.
- No crear estilos de boton aislados si el comportamiento ya existe.
- El boton principal debe estar al final de la pantalla y ser facil de tocar.

## Headers de pasos

Usar `StepHeader` en pantallas de onboarding.

Estructura:

- Boton volver a la izquierda.
- Pill centrado: `Paso X de 8`.
- Titulo de seccion a la derecha.
- Barra de progreso con puntos/checkpoints debajo.

Reglas:

- Mantener coherencia entre pasos 2 a 8.
- La linea azul no debe pasarse del punto activo.
- El punto activo puede ser mas grande que los anteriores.
- El texto del titulo debe usar `caption` con peso fuerte.

## Heroes e ilustraciones

Usar `HeroInfoCard` cuando una pantalla necesita contexto visual.

Estructura:

- Imagen local a la izquierda o como elemento visual destacado.
- Titulo fuerte.
- Texto corto, claro y humano.
- Badge verde de confianza o ayuda.

Reglas:

- No usar imagenes remotas.
- No usar mockups completos como assets.
- Las imagenes deben reforzar la idea de ruta, seguridad, progreso o tranquilidad.
- El badge debe ser tranquilizador, no legalista.

## Opciones y seleccion

Usar `SelectableCard` para opciones de una sola seleccion.

Estados:

- Normal: fondo blanco, borde suave.
- Seleccionado: borde azul, fondo azul muy claro, texto azul si ayuda a reforzar estado.
- Control: check o circulo de seleccion alineado y consistente.

Reglas:

- Rangos monetarios: texto + radio/check, sin iconos.
- Categorias: cards/chips con iconos dentro de circulos de color suave.
- Acciones o estados emocionales: pueden usar iconos y color contextual.
- "No estoy seguro" debe usar lila cuando se represente con icono.
- Textos largos deben permitir salto de linea, nunca cortarse.

## Chips e iconos

Usar `CategoryChip` para categorias multi-seleccion.

Reglas:

- Icono dentro de circulo/fondo suave.
- Label centrado y compacto.
- Seleccion con borde azul y check.
- Usar colores equivalentes al significado de la categoria.
- Mantener buen wrapping en pantallas pequenas.

## Tono de microcopy

La voz debe ser:

- Clara.
- Calida.
- Sin juicio.
- Practica.
- Tranquilizadora.

Evitar:

- Lenguaje bancario frio.
- Mensajes que hagan sentir culpa.
- Frases demasiado tecnicas.
- Copy largo dentro de cards pequenas.

Preferir:

- "No necesitas dar cifras exactas."
- "Puedes ajustar esta informacion mas adelante."
- "No todos los gastos pequenos son malos."
- "Tú decides que gastos conservar y cuales ajustar."

## Pantallas y patrones actuales

Welcome:

- Hero emocional.
- Headline grande con acento azul.
- Card visual de ruta.
- Beneficios en cards.
- CTA principal + demo.

Privacy:

- Header con progreso.
- Card de confianza.
- Lista visual de datos que nunca se piden.

Profile, Income, Expenses:

- Header de paso.
- Hero card con ilustracion.
- Preguntas en cards.
- Opciones compactas, visuales y mobile-first.

Small Expenses, Savings Debts, Goals:

- Mantener el estilo de ruta guiada.
- Usar colores contextuales cuando el icono representa estado.
- Mantener rangos monetarios limpios.
- Usar grids solo cuando no sacrifiquen lectura.

Summary, Diagnosis, Simulation:

- Usar `title` para titulo de pantalla.
- Usar `sectionTitle` para bloques principales.
- Usar `body/caption` para explicaciones.
- Mantener cards y notices en la misma paleta.

## Checklist antes de cerrar cambios visuales

- No hay `fontSize` numericos hardcodeados en `app/` o `components/`.
- No hay `fontWeight` escrito como string fuera de `constants/theme.ts`.
- No hay `lineHeight` numerico hardcodeado en pantallas/componentes.
- Los textos no se cortan en mobile.
- Los botones son comodos de tocar.
- Los iconos tienen color/fondo consistente cuando representan categorias o estados.
- Las rutas compilan.
- `npm run typecheck` pasa limpio.

## Fuente de verdad

La fuente principal para tokens visuales es:

```ts
constants/theme.ts
```

Antes de crear un nuevo estilo, revisar si ya existe un token equivalente en:

- `colors`
- `spacing`
- `radius`
- `typography`
- `shadows`

Si una pantalla necesita una variacion nueva, primero agregarla al tema y luego usarla desde la pantalla o componente.
