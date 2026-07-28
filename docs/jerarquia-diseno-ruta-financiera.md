# Jerarquia de diseno - Ruta Financiera

Fecha de referencia: 2026-07-26

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

La app usa la fuente nativa del sistema: SF Pro en iOS y Roboto en Android. No hay fuente custom instalada actualmente. Esta eleccion es intencional porque mejora la legibilidad, respeta mejor las preferencias del sistema y evita diferencias de carga entre Expo Go, builds nativos y web.

La fuente debe mantenerse consistente usando siempre los tokens de `constants/theme.ts`. Evitar `fontSize`, `fontWeight` y `lineHeight` numericos escritos directamente en pantallas o componentes.

| Uso | Token | Tamano | Line height | Peso recomendado |
| --- | --- | ---: | ---: | --- |
| Hero principal de welcome | `typography.display` | 35 | 41 | `typography.weight.black` |
| Titulos de pantallas finales/resultados | `typography.title` | 30 | 36 | `typography.weight.black` |
| Titulos hero dentro de cards | `typography.heroTitle` | 27 | 32 | `typography.weight.black` |
| Titulos de hero compartido | `typography.cardTitle` | 24 | 29 | `typography.weight.bold` o `black` |
| Marca/header welcome | `typography.brand` | 21 | 26 | `typography.weight.bold` o `black` |
| Titulos de secciones grandes | `typography.sectionTitle` | 20 | 26 | `typography.weight.bold` |
| Preguntas del onboarding | `typography.question` | 17 | 23 | `typography.weight.bold` |
| Botones | `typography.button` | 16 | 22 | `typography.weight.semibold` |
| Subtitulos | `typography.subtitle` | 16 | 24 | regular o medium |
| Opciones/cards seleccionables | `typography.option` | 16 | 22 | `typography.weight.semibold` o `bold` |
| Texto base | `typography.body` | 16 | 24 | regular, medium o semibold segun jerarquia |
| Ayudas, labels, pills | `typography.caption` | 13 | 18 | medium, semibold o bold |
| Badges pequenos | `typography.badge` | 12 | 17 | `typography.weight.bold` |
| Texto compacto y navegacion | `typography.small` | 11 | 15 | medium, semibold o bold |

Pesos disponibles:

| Token | Valor | Uso |
| --- | ---: | --- |
| `typography.weight.regular` | 400 | Parrafos y explicaciones |
| `typography.weight.medium` | 500 | Labels secundarios y datos |
| `typography.weight.semibold` | 600 | Botones y enfasis moderado |
| `typography.weight.bold` | 700 | Titulos de seccion, preguntas y opciones |
| `typography.weight.black` | 800 | Heroes, titulos principales y cifras protagonistas |

Reglas:

- Una pantalla no debe inventar tamanos nuevos si ya existe un token equivalente.
- El texto base, los botones y las opciones importantes deben usar al menos 16.
- Ningun texto funcional de la app puede ser menor de 11. No usar 10 para labels de navegacion.
- Las preguntas del onboarding deben usar `question`.
- Las opciones dentro de cards deben usar `option`, `caption`, `badge` o `small` segun el espacio.
- El texto secundario debe usar `textMuted`.
- El texto de baja jerarquia debe usar `textSubtle`.
- Reservar `weight.black` para heroes, titulos de pantalla y cifras protagonistas. No usarlo por defecto en captions o texto explicativo.
- No usar letter spacing negativo.
- Usar `typography.lineHeight.*` junto con cada tamano para evitar textos apretados o cortados.
- Mantener `allowFontScaling` habilitado. No usar `allowFontScaling={false}` para corregir problemas de layout.
- Evitar `adjustsFontSizeToFit` como solucion a textos largos; el contenido debe hacer wrap o la composicion debe reorganizarse.
- No truncar informacion financiera, acciones o categorias importantes a una sola linea. Si `numberOfLines` es necesario en una zona compacta, permitir al menos dos lineas y comprobar el resultado con texto ampliado.
- Probar cada patron compartido con el tamano de texto normal, ampliado y al 200%.

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
| Soporte/confianza | `colors.support` | `#0F7A4F` |
| Fondo soporte suave | `colors.supportSoft` | `#E8F8EF` |
| Fondo advertencia suave | `colors.warningSoft` | `#FFF5E7` |
| Texto principal | `colors.text` | `#0F172A` |
| Texto secundario | `colors.textMuted` | `#475569` |
| Texto sutil | `colors.textSubtle` | `#5B677A` |
| Bordes | `colors.border` | `#E2E8F0` |
| Sombras | `colors.shadow` | `#1E293B` |

Uso de colores:

- Azul: acciones principales, progreso, seleccion activa, acentos positivos de avance.
- Verde/menta: confianza, privacidad, seguridad, ayuda, informacion tranquilizadora.
- Lila: incertidumbre o "No estoy seguro".
- Amarillo/naranja/rojo: niveles de riesgo, carga o urgencia.
- Gris azulado: informacion secundaria, opciones no seleccionadas, iconos neutros.
- Todo texto normal debe mantener una relacion de contraste minima de 4.5:1 con su fondo.
- No reutilizar un color decorativo para texto pequeno si no supera el contraste minimo. Si se agrega un nuevo color de texto, incluirlo en `tests/theme.test.ts`.

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

## Responsive y dispositivos

Los breakpoints y el padding horizontal viven en `utils/responsiveLayout.ts` y se consumen mediante `useResponsiveLayout`.

| Composicion | Ancho disponible | Padding horizontal | Regla principal |
| --- | ---: | ---: | --- |
| Telefono pequeno | Menos de 360 | 12 | Una columna para opciones largas y heroes apilados |
| Telefono | 360 a 599 | 16 | Una columna principal; dos columnas solo para tiles compactos |
| Tablet | 600 a 899 | 24 | Dos columnas cuando mejoren la lectura |
| Desktop/web | 900 o mas | 24 | Grids amplios respetando el `maxWidth` de cada flujo |

Reglas:

- Adaptar por ancho disponible, no por modelo de dispositivo.
- Un iPhone 13 de 390 puntos siempre usa composicion de telefono.
- Las columnas secundarias solo se activan desde 600 cuando contienen formularios o texto largo.
- El aumento del tamano de texto tiene prioridad sobre conservar una grilla. Si el contenido deja de caber, reducir columnas o apilar.
- Conservar `SafeAreaView` en pantallas nativas y no compensar notch o indicador inferior con valores manuales.
- Validar como minimo 320, 390, 430, 768 y 1024 puntos.

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

## Modales y ayudas contextuales

Todos los modales deben construirse con `AppModal`. No se deben crear overlays,
cards, encabezados o botones de modal directamente dentro de una pantalla.

Anatomia comun:

- Overlay oscuro suave.
- Card blanca con `radius.lg`, borde sutil y `shadows.card`.
- Icono contextual opcional dentro de un cuadro azul suave.
- Titulo y subtitulo alineados a la izquierda.
- Boton circular `X` en la esquina superior derecha.
- Cuerpo con `ScrollView` cuando el contenido pueda crecer.
- Pie separado por un borde superior cuando existan acciones.
- En telefono se presenta como panel inferior; en tablet y web aparece centrado.

Variantes:

| Variante | Cierre | Acciones |
| --- | --- | --- |
| Educativa simple | `X` disponible siempre | Puede no tener pie |
| Educativa con pasos | `X` disponible siempre | `Anterior`, indicador central y `Siguiente` o `Cerrar` |
| Formulario | `X` y `Cancelar` | Accion principal a la derecha |
| Confirmacion | `X` equivale a cancelar | `Cancelar` y confirmar |
| Destructiva | `X` equivale a cancelar | Accion destructiva en rojo |

Reglas:

- No usar botones de texto como `Cerrar` dentro del encabezado.
- No mezclar radios o alturas diferentes entre acciones del mismo modal.
- El encabezado y el pie deben permanecer visibles cuando el cuerpo se desplaza.
- Usar `AppModalAction` para mantener altura, radio, color y estados deshabilitados.
- El contenido puede cambiar segun la variante; el contenedor visual no.
- El tirador del panel inferior en telefono siempre debe ser interactivo, nunca
  decorativo.
- Al arrastrar el tirador hacia abajo, el panel debe seguir el gesto. Un arrastre
  corto vuelve suavemente a su posicion; uno suficientemente largo o rapido cierra
  el panel.
- El gesto de cierre se inicia desde el tirador para no interferir con el
  desplazamiento vertical de formularios y explicaciones.
- Cerrar un editor con `X`, el fondo o el tirador descarta el borrador sin
  guardarlo y sin mostrar una confirmacion adicional.
- Reservar las confirmaciones para decisiones que si cambian la estructura del
  plan, como sustituir el tipo de la meta principal.

Ayudas financieras:

- Usar `FinancialEducationModal` para conceptos, formulas o datos que admitan
  varias interpretaciones.
- Ubicar el boton de ayuda en el encabezado de una card cuando explique el
  bloque completo.
- Usar el trigger compacto junto a la etiqueta cuando explique un solo campo.
- No agregar ayuda a cada cifra. Priorizar terminos financieros, resultados
  calculados y datos que puedan duplicarse o registrarse de forma incorrecta.
- Una explicacion puntual usa una pagina. Un resultado con formula, lectura y
  contexto puede usar carrusel.
- La preferencia `Breve (Recomendado)` debe ser el modo predeterminado.

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
- El texto base y las acciones principales usan al menos 16.
- Ningun label funcional baja de 11.
- `allowFontScaling` no esta deshabilitado.
- La interfaz sigue siendo util con texto ampliado al 200%.
- Los textos importantes hacen wrap y no se truncan a una sola linea.
- Los colores de texto mantienen contraste minimo de 4.5:1.
- Los textos no se cortan en mobile.
- Los botones son comodos de tocar.
- Los iconos tienen color/fondo consistente cuando representan categorias o estados.
- Se revisaron 320, 390, 430, 768 y 1024 puntos cuando el cambio afecta layout.
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

Para responsive, revisar tambien:

- `utils/responsiveLayout.ts`
- `hooks/useResponsiveLayout.ts`

Las pruebas de regresion para tamanos, pesos y contraste viven en:

- `tests/theme.test.ts`

Si una pantalla necesita una variacion nueva, primero agregarla al tema y luego usarla desde la pantalla o componente.
