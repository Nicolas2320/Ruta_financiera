# Contexto y funcionalidad - pasos 2 al 8

Estado observado: 2 de julio de 2026.

## Alcance

Este documento resume solo los pasos 2 al 8 del onboarding principal de Ruta Financiera. Quedan fuera de este alcance la bienvenida, autenticacion, resumen, diagnostico, simulacion, dashboard, plan mensual y pantallas posteriores.

Los pasos cubiertos son:

1. Paso 2: Privacidad.
2. Paso 3: Perfil basico.
3. Paso 4: Ingresos.
4. Paso 5: Gastos.
5. Paso 6: Gastos hormiga.
6. Paso 7: Ahorros y deudas.
7. Paso 8: Meta financiera.

## Flujo general

El flujo normal avanza asi:

`/privacy` -> `/profile` -> `/income` -> `/expenses` -> `/small-expenses` -> `/savings-debts` -> `/goals` -> `/summary`

La informacion del onboarding se guarda mediante `updateOnboarding` en `OnboardingContext`. Si Supabase esta configurado y hay usuario autenticado, el contexto intenta persistir los datos; si no, conserva la informacion en estado local de la app para la sesion actual.

En los pasos con captura de informacion, el boton principal queda deshabilitado hasta cumplir los campos obligatorios. El patron comun es seleccionar respuestas aproximadas por rango, no cifras exactas, para reducir friccion y evitar pedir datos bancarios sensibles.

## Paso 2 - Privacidad

Ruta: `/privacy`

Objetivo: generar confianza antes de pedir informacion financiera. La pantalla explica que la app usa rangos aproximados y que no pide datos sensibles.

Funcionalidad principal:

- Muestra el progreso como `Paso 2 de 8`.
- Comunica que el diagnostico inicial usa rangos aproximados.
- Lista datos que la app nunca pide en esta etapa: cedula, claves bancarias, numero de cuenta y movimientos bancarios.
- No guarda datos en `OnboardingData`; funciona como paso informativo.

Navegacion:

- Continuar: envia a `/profile`.
- Volver: envia a `/`.
- Boton atras superior: envia a `/`.

Puntos para probar workflow:

- El paso debe permitir avanzar sin completar formularios.
- El boton de continuar debe llevar siempre al perfil basico.
- La pantalla no debe modificar el estado del onboarding.

## Paso 3 - Perfil basico

Ruta: `/profile`

Objetivo: capturar informacion general para personalizar el diagnostico sin pedir datos sensibles.

Datos capturados:

- `ageRange`: rango de edad.
- `country`: pais.
- `city`: ciudad opcional.

Opciones principales:

- Edad: `18-24`, `25-30`, `31-35`, `36-40`, `Mas de 40`.
- Pais: `Colombia`, `Otro`.
- Ciudad: texto libre opcional.

Validacion:

- Para continuar se requiere edad y pais.
- La ciudad no bloquea el avance.
- Al guardar, la ciudad se persiste con `trim()`.

Navegacion:

- Continuar: guarda datos y envia a `/income`.
- Volver: envia a `/privacy`.
- En modo edicion desde perfil, guarda cambios y vuelve a `/summary?mode=edit`.

Puntos para probar workflow:

- El boton continuar debe estar deshabilitado si falta edad o pais.
- La ciudad puede quedar vacia.
- Al volver y regresar al paso, las selecciones previas deben mantenerse desde `OnboardingContext`.

## Paso 4 - Ingresos

Ruta: `/income`

Objetivo: estimar la entrada mensual de dinero del usuario y entender su regularidad.

Datos capturados:

- `incomeRange`: rango de ingresos mensuales.
- `incomeType`: tipo de ingreso.
- `incomeFrequency`: frecuencia de ingreso.

Opciones principales:

- Rango de ingresos: `Menos de $1.500.000`, `$1.500.000 - $3.000.000`, `$3.000.000 - $5.000.000`, `$5.000.000 - $8.000.000`, `Mas de $8.000.000`.
- Tipo: `Fijo`, `Variable`, `Mixto`.
- Frecuencia: `Mensual`, `Quincenal`, `Semanal`, `Irregular`.

Validacion:

- Para continuar se requieren las tres respuestas.
- No se pide salario exacto.

Navegacion:

- Continuar: guarda datos y envia a `/expenses`.
- Volver: envia a `/profile`.
- En modo edicion desde perfil, guarda cambios y vuelve a `/summary?mode=edit`.

Puntos para probar workflow:

- El boton continuar solo debe habilitarse con rango, tipo y frecuencia.
- Cambiar una seleccion debe reemplazar la respuesta anterior del mismo grupo.
- Las respuestas guardadas deben alimentar despues el diagnostico y calculos de margen.

## Paso 5 - Gastos

Ruta: `/expenses`

Objetivo: estimar los gastos mensuales, identificar categorias principales y capturar la percepcion del usuario sobre su control de gastos.

Datos capturados:

- `expensesRange`: rango de gastos mensuales.
- `expenseCategories`: categorias principales seleccionadas.
- `expenseCategoryAmounts`: montos manuales por categoria, filtrados para conservar solo categorias aun seleccionadas.
- `expensesFeeling`: percepcion sobre los gastos.

Opciones principales:

- Rango de gastos: `Menos de $1.000.000`, `$1.000.000 - $2.000.000`, `$2.000.000 - $4.000.000`, `$4.000.000 - $6.000.000`, `Mas de $6.000.000`.
- Categorias: vivienda, alimentacion, transporte, servicios publicos, deudas, educacion, salud, familia, entretenimiento, suscripciones, compras y otros.
- Percepcion: `Los tengo bajo control`, `Gasto mas de lo planeado`, `No se en que se va mi dinero`.

Validacion:

- Para continuar se requiere rango de gastos.
- Se requiere al menos una categoria principal.
- Se requiere una percepcion de gastos.
- Las categorias son multiseleccion.

Navegacion:

- Continuar: guarda datos y envia a `/small-expenses`.
- Volver: envia a `/income`.
- En modo edicion desde gastos, vuelve a `/spending`.
- En modo edicion desde perfil, vuelve a `/summary?mode=edit`.

Puntos para probar workflow:

- Seleccionar y deseleccionar categorias debe actualizar el estado sin duplicados.
- Si se quita una categoria, `expenseCategoryAmounts` debe limpiarse para no conservar montos de categorias ya no seleccionadas.
- El boton continuar debe bloquearse si no hay categoria seleccionada.

## Paso 6 - Gastos hormiga

Ruta: `/small-expenses`

Objetivo: entender pequenos consumos frecuentes sin tratarlos como algo necesariamente negativo. La pantalla busca que el usuario decida si quiere mantenerlos, limitarlos, reducirlos o redirigirlos a una meta.

Datos capturados:

- `hasSmallExpenses`: percepcion sobre si existen gastos pequenos frecuentes.
- `smallExpenseCategories`: categorias seleccionadas.
- `smallExpensesRange`: rango mensual estimado de esos consumos.
- `smallExpensesIntention`: intencion del usuario frente a esos gastos.

Opciones principales:

- Presencia: `Si`, `No`, `No estoy seguro`.
- Categorias: cafes, snacks y salidas; domicilios o comida rapida; transporte extra; suscripciones y apps; pequenas compras; entretenimiento digital; comisiones o recargos; otros.
- Rango mensual: `Menos de $100.000`, `$100.000 - $250.000`, `$250.000 - $500.000`, `Mas de $500.000`.
- Intencion: `Mantenerlos como estan`, `Establecer un limite mensual`, `Reducir algunos`, `Redirigir una parte a una meta`, `Primero quiero entenderlos mejor`.

Reglas de comportamiento:

- Si el usuario responde `No`, las categorias se limpian y la pregunta de categorias se reemplaza por un mensaje informativo.
- Si responde `Si`, debe seleccionar al menos una categoria.
- Si responde `No estoy seguro`, la pantalla muestra categorias, pero no exige seleccionar una.
- El codigo normaliza categorias antiguas hacia nombres actuales para mantener compatibilidad.

Validacion:

- Para continuar se requiere presencia, rango mensual e intencion.
- Las categorias solo son obligatorias cuando `hasSmallExpenses` es `Si`.

Navegacion:

- Continuar: guarda datos y envia a `/savings-debts`.
- Volver: envia a `/expenses`.
- En modo edicion desde gastos, vuelve a `/spending`.
- En modo edicion desde dashboard, vuelve a `/dashboard`.
- En modo edicion desde perfil, vuelve a `/summary?mode=edit`.

Puntos para probar workflow:

- Al cambiar de `Si` a `No`, las categorias deben quedar vacias.
- `No estoy seguro` debe permitir continuar sin categorias si rango e intencion estan completos.
- Las categorias seleccionadas deben persistir si el usuario vuelve al paso.

## Paso 7 - Ahorros y deudas

Ruta: `/savings-debts`

Objetivo: entender el punto de partida financiero del usuario: ahorro disponible, cobertura ante emergencias, peso de deudas e inversion.

Datos capturados:

- `savingsRange`: rango de ahorro actual.
- `emergencyCoverage`: tiempo de cobertura de gastos esenciales sin ingresos.
- `debtSituation`: situacion general de deudas.
- `debtPaymentShare`: parte de ingresos destinada a pagar deudas.
- `investmentSituation`: situacion frente a inversiones.

Opciones principales:

- Ahorro actual: `No tengo ahorros`, `Menos de $500.000`, `$500.000 - $2.000.000`, `$2.000.000 - $5.000.000`, `$5.000.000 - $10.000.000`, `Mas de $10.000.000`, `Prefiero no responder`.
- Cobertura de emergencia: `No podria cubrirlos`, `Menos de 1 mes`, `1 - 3 meses`, `3 - 6 meses`, `Mas de 6 meses`, `No estoy seguro`.
- Deudas: `No tengo deudas`, `Tengo deudas, pero las pago sin problema`, `A veces me cuesta pagarlas`, `Son una preocupacion importante`, `Prefiero no responder`.
- Pago de deudas: `No pago deudas`, `Menos del 10%`, `10% - 20%`, `20% - 40%`, `Mas del 40%`, `No estoy seguro`, `Prefiero no responder`.
- Inversiones: `No tengo inversiones`, `No, pero quiero aprender`, `Si, pero no entiendo bien como funcionan`, `Si, y las entiendo`, `Prefiero no responder`.

Reglas de comportamiento:

- Si el usuario selecciona `No tengo deudas`, el paso marca automaticamente `No pago deudas`.
- Si luego cambia desde `No tengo deudas` hacia otra situacion y el pago seguia en `No pago deudas`, ese campo se limpia para pedir una respuesta coherente.
- Se permite usar `Prefiero no responder` en preguntas sensibles.

Validacion:

- Para continuar se requieren las cinco respuestas.

Navegacion:

- Continuar: guarda datos y envia a `/goals`.
- Volver: envia a `/small-expenses`.
- En modo edicion desde perfil, vuelve a `/summary?mode=edit`.

Puntos para probar workflow:

- La autoseleccion de `No pago deudas` debe activarse al elegir `No tengo deudas`.
- Al cambiar a una situacion con deudas, el usuario debe volver a elegir porcentaje de pago.
- Las opciones `Prefiero no responder` deben contar como respuestas validas.

## Paso 8 - Meta financiera

Ruta: `/goals`

Objetivo: crear la meta financiera principal del usuario para orientar el diagnostico, la simulacion y el plan mensual.

Datos capturados:

- `goals`: arreglo de metas financieras.
- `financialGoal`: campo legado con el titulo de la meta principal.
- `goalHorizon`: campo legado con horizonte de la meta principal.
- `goalPriority`: campo legado con prioridad de la meta principal.
- `goalAmountRange`: campo legado con rango de monto si aplica.

Opciones principales:

- Meta: `Organizar mis gastos`, `Crear un fondo de emergencia`, `Pagar deudas`, `Ahorrar para vivienda`, `Ahorrar para estudiar`, `Ahorrar para viajar`, `Empezar a invertir`, `Ahorrar para un negocio`, `Prepararme para el futuro`, `Otro`.
- Si elige `Otro`, el usuario escribe el nombre de la meta y elige un icono.
- Horizonte: `Menos de 6 meses`, `6 - 12 meses`, `1 - 3 anos`, `3 - 5 anos`, `Mas de 5 anos`, `No estoy seguro`.
- Prioridad: `Baja`, `Media`, `Alta`, `Muy alta`.
- Monto aproximado opcional: rangos predefinidos o `Ingresar cifra`.

Reglas de comportamiento:

- Elegir una meta predefinida asigna un `iconKey` asociado.
- Elegir `Otro` exige nombre personalizado y permite seleccionar icono.
- La cifra aproximada es opcional.
- Si el usuario elige `Ingresar cifra`, entonces si debe ingresar un monto numerico mayor que cero.
- Al guardar, se crea una meta principal con `createFinancialGoal`.
- Si ya existia una meta principal, se reemplaza conservando algunos datos como `id`, `manualMonthlyContribution` y `createdAt`.
- Tambien se actualizan campos legados para compatibilidad con pantallas que aun leen `financialGoal`, `goalHorizon`, `goalPriority` y `goalAmountRange`.

Validacion:

- Para continuar se requiere titulo de meta, horizonte y prioridad.
- Si el modo de monto manual esta activo, se requiere monto valido mayor que cero.
- No se requiere seleccionar rango de monto si el usuario no quiere dar cifra aproximada.

Navegacion:

- Continuar: guarda la meta principal y envia a `/summary`.
- Volver: envia a `/savings-debts`.
- La misma pantalla soporta `mode=add` para crear metas adicionales desde `/goals-overview`, pero ese modo no forma parte del onboarding inicial cubierto por este documento.

Puntos para probar workflow:

- El boton debe habilitarse con meta, horizonte y prioridad aunque no haya monto aproximado.
- En meta personalizada, un nombre vacio debe bloquear el avance.
- En monto manual, `$0` o texto invalido debe bloquear el avance.
- Al completar el paso, debe existir al menos una meta principal en `goals`.

## Criterios generales para pruebas de workflow

- El indicador visual debe mostrar el numero correcto entre pasos 2 y 8.
- Los botones de continuar deben respetar las validaciones de cada paso.
- Los botones de volver deben regresar al paso anterior esperado.
- Las respuestas deben mantenerse al navegar hacia atras y adelante dentro del flujo.
- El estado completo del onboarding debe tener los campos necesarios para que `hasCompletedOnboarding` sea verdadero despues del paso 8.
- Los modos de edicion no deben romper el flujo principal: cuando `source=profile`, varias pantallas vuelven a `/summary?mode=edit`; cuando `source=spending`, los pasos de gastos vuelven a `/spending`; cuando `source=dashboard`, gastos hormiga vuelve a `/dashboard`.

