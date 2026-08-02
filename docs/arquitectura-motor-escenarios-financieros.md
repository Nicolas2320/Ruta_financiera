# Arquitectura del motor de escenarios financieros

## Objetivo

Construir escenarios mensuales sin volver a pedir datos que la persona ya registró y sin permitir que cada pantalla calcule una versión distinta de su situación financiera.

La base y la primera integración en `/simulation` ya están implementadas. La pantalla consume una única entrada financiera, separa hechos de decisiones y compara estrategias sin declarar una alternativa universalmente óptima.

## Principios

1. Cada dato se registra y edita en una sola sección propietaria.
2. Simulación consume datos guardados; solo solicita completar los que falten en su sección de origen.
3. Los valores hipotéticos viven dentro del escenario y no reemplazan los datos reales.
4. Los pagos reales recalibran las proyecciones, pero no se supone que todo pago reduce capital.
5. Un resultado debe diferenciar obligaciones, acuerdos, decisiones voluntarias y datos desconocidos.
6. El motor no declara un único plan óptimo: compara estrategias y explica el intercambio entre plazo, liquidez e intereses.

## Propiedad de los datos

| Dato | Fuente de verdad | Edición | Uso futuro |
| --- | --- | --- | --- |
| Ingreso mensual | `exactValues.monthlyIncome` o rango | `/income` y `/improve-plan` | Entrada de caja mensual |
| Gastos principales al mes | `exactValues.monthlyExpenses` o rango | `/expenses` y `/improve-plan` | Gastos habituales sin deudas ni gastos pequeños |
| Gastos pequeños | `exactValues.smallExpenses` o rango | `/small-expenses` y `/improve-plan` | Componente separado del flujo mensual |
| Ahorro disponible general | `exactValues.currentSavings` o rango | `/savings-debts` y `/improve-plan` | Respaldo actual no asignado a metas |
| Categorías de gasto | `onboarding.expenseCategories` | `/expenses` | Distribución de los gastos principales |
| Saldo, tasa, estado y día de pago | `onboarding.debts` | `/debts` | Evolución de cada obligación |
| Pago mensual planeado | `DebtRecord.monthlyPayment` | `/debts` | Escenario que conserva la decisión actual |
| Naturaleza del pago | `DebtRecord.monthlyPaymentType` | `/debts` | Distinguir mínimo, acuerdo, decisión propia o dato desconocido |
| Pago requerido calculado | Tipo del pago y `DebtRecord.monthlyPayment` | `/debts` | Piso que no puede reasignarse sin incumplir; el campo separado anterior queda solo por compatibilidad |
| Flexibilidad de un acuerdo | `DebtRecord.paymentFlexibility` | `/debts` | Identificar valores potencialmente negociables |
| Pagos reales y saldo reportado | `DebtRecord.payments` y `remainingAmount` | `/debts` | Recalibrar el siguiente período |
| Monto que quiere reunir y ahorro actual | `FinancialGoal` | `/goals` y `/goals-overview` | Brecha y progreso real sin suponer la parte que será financiada |
| Mes objetivo | `FinancialGoal.targetMonth` | `/goals` y `/goals-overview` | Única referencia temporal para calcular los períodos disponibles |
| Margen libre mensual deseado | Supuesto visible de `/simulation` | `/simulation`; persistencia pendiente | Dinero que la persona decide no comprometer ese mes; nunca usa un monto fijo global |
| Fondo de emergencia acumulado | Ahorro general o meta de emergencia | Ahorros / metas | Saldo acumulado disponible para imprevistos |
| Crédito aún no contratado | Borrador del escenario | `/simulation` | Hipótesis que no se convierte en deuda hasta ser aceptada |

## Semántica de los pagos mensuales

`monthlyPayment` conserva el monto que la persona planea pagar. No se interpreta automáticamente como cuota obligatoria.

`monthlyPaymentType` define su significado:

- `minimum_required`: cuota mínima o pactada contractualmente; si no existe otro valor, `monthlyPayment` es el piso obligatorio.
- `agreed`: compromiso acordado con una persona o entidad; se considera en el plan base y puede estar marcado como negociable.
- `self_selected`: valor voluntario elegido por la persona y sin cuota mensual fija; el motor usa `$0` como piso requerido y conserva `monthlyPayment` únicamente en “Así estás hoy”. Si existe un mínimo bancario, debe elegirse `minimum_required`.
- `unknown`: existe únicamente para perfiles anteriores. Ya no se ofrece al crear o editar; la persona debe clasificar el pago para guardar la deuda.

`paymentFlexibility` puede ser `fixed`, `negotiable` o `unknown`. `unknown` se conserva solo para perfiles anteriores y ya no se ofrece en el formulario. La flexibilidad describe la posibilidad de cambiar un acuerdo; no lo modifica automáticamente.

## Entrada canónica

`buildFinancialProjectionInput` es el límite entre los datos persistidos y el futuro motor. Entrega:

- ingresos y gastos base con su nivel de precisión;
- pagos de deuda planeados y mínimos conocidos por separado;
- dinero disponible después del plan actual;
- dinero disponible después de obligaciones solo cuando todos los mínimos son conocidos;
- metas con un único monto que la persona quiere reunir y un mes objetivo;
- faltantes con una ruta de origen para completarlos.

La simulación no debe leer directamente campos dispersos de `onboarding`. Debe consumir esta entrada o una evolución compatible de ella.

## Cálculo del margen actual

`monthlyExpenses` representa únicamente gastos principales. Las cuotas activas se obtienen desde las deudas y los gastos pequeños desde su propia respuesta. La cifra deja de depender de que el usuario recuerde corregirla cuando una deuda termina.

Las preguntas monetarias de ingreso, gastos principales, gastos pequeños y ahorro permiten elegir un rango o ingresar una cifra exacta. Si se ingresa una cifra, la app guarda también el rango compatible para conservar una estimación de respaldo y completa automáticamente el mismo valor que aparece en `/improve-plan`.

El motor usará como mínimo:

`disponible planeado = ingreso - gastos principales - gastos pequeños - pagos de deuda planeados`

`disponible obligatorio = ingreso - gastos principales - gastos pequeños - pagos mínimos o acordados`

El segundo valor queda sin calcular si falta algún mínimo. Así se evita presentar dinero potencialmente comprometido como disponible.

## Persistencia en Supabase

Los datos de metas y deudas siguen dentro de `financial_profiles.onboarding`, que es JSONB, mientras los valores exactos continúan en `financial_profiles.exact_values`. Los campos nuevos son opcionales y se normalizan al cargar:

- no se necesita agregar columnas; una migración de datos limpia las claves temporales heredadas dentro del JSONB;
- los perfiles existentes siguen funcionando;
- las deudas antiguas se clasifican como `unknown` hasta que la persona las confirme;
- una fecha con día se convierte a mes y año, descartando el día;
- un horizonte aproximado antiguo se convierte una sola vez a un mes objetivo determinista;
- al normalizar y volver a guardar el perfil, `FinancialGoal.targetMonth` queda como única fecha de la meta y los campos de horizonte heredados dejan de persistirse.
- el campo anterior `minimumInitialAmount` se descarta al normalizar. La parte que la persona ya sabe que financiará no se registra como ahorro ni como deuda hasta que el crédito exista.

## Margen libre mensual y fondo de emergencia

No son el mismo dato:

- el **margen libre mensual** es parte del ingreso del mes que no se asigna todavía a gastos, cuotas o metas;
- el **fondo de emergencia** es un saldo acumulado de meses anteriores.

Pueden relacionarse: al cerrar el mes, una parte del margen libre puede alimentar el fondo. La aplicación no debe asumir `$300.000` ni otro monto universal; la persona elegirá el margen o comparará escenarios con distintos valores.

Si el historial o la edición concurrente crecen, se evaluará normalizar pagos y escenarios guardados en tablas propias. Eso no es necesario para construir el primer motor.

## Reglas comunes de distribución

Todas las comparaciones deben partir del mismo orden. Una estrategia solo puede decidir sobre el dinero que queda después de respetar estas capas:

1. Ingreso mensual disponible.
2. Gastos principales y gastos pequeños.
3. Cuotas obligatorias, acuerdos fijos y mínimos exigidos de las deudas.
4. Monto mensual que la persona decide dejar sin comprometer.
5. Dinero distribuible entre pagos voluntarios de deuda y metas.

`dinero distribuible = máximo(0, ingreso - gastos principales - gastos pequeños - obligaciones de deuda - margen protegido)`

El dinero distribuible no es dinero adicional. Se desglosa en el margen que aún no tenía destino, pagos voluntarios de deuda que pueden reasignarse y aportes voluntarios a metas. Un pago `self_selected` mantiene su valor en “Así estás hoy”, pero su piso obligatorio continúa siendo `$0`; convertirlo en obligación impediría que los escenarios compararan otras decisiones.

El margen protegido no usa un valor universal. Será un supuesto visible del escenario hasta que la persona decida guardarlo como preferencia. Si falta el mínimo de alguna deuda, el motor puede mostrar la referencia actual, pero no debe afirmar cuánto dinero es redistribuible.

Cuando la persona no tiene una cifra en mente, el modo **automático** protege el 10% del excedente positivo después de gastos y obligaciones. Es una heurística operativa visible y ajustable, no una recomendación financiera universal. Los otros modos son **usar todo**, que debe elegirse de forma explícita, y **monto personalizado**.

La heurística no se presenta como una regla oficial: el [CFPB indica que el monto de protección depende de la situación de cada persona](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) y la [Superintendencia Financiera de Colombia recomienda presupuestar y crear protección para imprevistos](https://www.superfinanciera.gov.co/publicaciones/10115048/sfc-adelanta-campana-de-educacion-financiera-a-estudiantes-de-soacha/), sin fijar un porcentaje mensual único.

Los acuerdos marcados como negociables no se reducen automáticamente. Una comparación puede mostrar el efecto de negociarlos, pero debe identificarlo como una acción pendiente de confirmación.

## Comparaciones v1

### Referencia: Así estás hoy

No es una recomendación. Sirve como punto de comparación y conserva:

- el pago mensual planeado de cada deuda;
- los aportes de meta definidos manualmente por la persona;
- el resto del margen como dinero sin asignar.

Si una meta solo tiene un aporte sugerido por la aplicación, ese valor no se presenta como parte del plan actual. Debe quedar claro qué fue decidido por la persona y qué fue calculado por el sistema.

### Estrategia: Reducir intereses

Después de pagar todas las obligaciones y proteger el margen elegido, dirige el dinero distribuible a la deuda activa con mayor tasa efectiva anual. Cuando termina, redirige el monto completo a la siguiente deuda más costosa.

- Las deudas con tasa desconocida generan una advertencia y no se ordenan como si tuvieran tasa cero.
- Las deudas al 0% conservan sus acuerdos, pero no reciben pagos adicionales mientras exista una deuda con interés mayor.
- Un atraso se muestra como riesgo separado; no se inventa el valor necesario para ponerse al día.

Nombre visible recomendado: **Reducir intereses**.

### Estrategia: Acelerar una meta

Después de cubrir obligaciones y margen protegido, dirige el dinero distribuible a una meta activa elegida por la persona.

- El hito es el único monto que la persona indicó que quiere reunir. Si una parte será financiada, esa parte no se suma a la meta de ahorro.
- La estrategia no supone que el dinero restante será financiado ni que la meta generará una deuda.
- Si existen varias metas, la persona elige cuál acelerar; la aplicación no cambia silenciosamente la meta principal.

Nombre visible recomendado: **Acelerar una meta**.

### Estrategia: Avanzar en deuda y meta

Después de cubrir obligaciones y margen protegido, divide el dinero distribuible en dos partes visibles y ajustables:

- una proporción para el pago adicional a la deuda con mayor tasa conocida;
- la proporción restante para la meta seleccionada.

El reparto comienza en 50/50 como punto de comparación, no como regla óptima. La persona puede moverlo entre 10/90 y 90/10 en pasos de cinco puntos porcentuales. La comparación solo se habilita cuando existen tanto una deuda con interés conocido como una meta con monto definido; cuando falta alguno, se muestra como “No aplica” junto con el dato que debe completarse. Si uno de los dos objetivos termina durante la proyección, su parte pasa al otro.

Nombre visible recomendado: **Avanzar en deuda y meta**. Evita el nombre genérico “Plan equilibrado”, que no explica qué se está repartiendo.

## Financiación como hipótesis

**Probar financiación** no es una estrategia de distribución independiente. Es un supuesto opcional que puede aplicarse, por ejemplo, sobre “Acelerar una meta”.

Para compararla responsablemente se necesita al menos:

- monto recibido;
- mes de inicio;
- cuota mensual, o tasa y plazo suficientes para calcularla;
- seguros y comisiones cuando existan.

La hipótesis crea una deuda temporal únicamente dentro del escenario y muestra cómo cambian el margen mensual, el total pagado, los intereses y la fecha de la meta. No se guarda como deuda real hasta que la persona confirme que contrató el crédito.

Si la cuota y el plazo todavía no están claros, la aplicación puede guardar el borrador, pero debe mostrar “Faltan condiciones” en lugar de calificar la financiación como viable.

## Estado y etapas siguientes

Completado:

1. Entrada financiera canónica con rutas propietarias para los datos faltantes.
2. Margen protegido automático, uso explícito de todo el margen y monto personalizado.
3. Motor puro para la referencia actual y las estrategias “Reducir intereses”, “Acelerar una meta” y “Avanzar en deuda y meta”.
4. Integración de `/simulation` con una base mensual común, estados incompletos y proyección de la meta hasta su mes objetivo.
5. Proyección mes a mes que calcula intereses con la tasa E.A. registrada, libera cuotas cuando una deuda termina y redistribuye el dinero desde el período siguiente.
6. Desglose visible del origen de “Para repartir”, separando margen sin destino, pagos voluntarios de deuda y aportes voluntarios a metas.

Siguiente:

1. Añadir la financiación como hipótesis temporal sobre esa proyección, con sus condiciones incompletas claramente visibles.
2. Permitir guardar un escenario como referencia del plan mensual sin alterar los hechos originales.
3. Comparar lo planeado con pagos y aportes reales para recalibrar el mes siguiente.
