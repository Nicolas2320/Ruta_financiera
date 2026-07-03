# Experimento de simulación MVP v1.0

Fecha: 2026-07-03  
Branch: `MVP-v1.0`  
App probada: `http://localhost:8081` en OperaGX  
Documentos de referencia:

- `docs/Mapa de pantallas del MVP v0.1.pdf`
- `docs/Product Brief v0.2.pdf`

## Objetivo

Validar si el flujo actual de Ruta Financiera cumple con la promesa descrita en el Product Brief y en el Mapa de Pantallas:

- permitir que una persona registre información financiera aproximada;
- entender su situación actual;
- elegir o descubrir una meta;
- recibir diagnóstico, simulación y plan mensual;
- terminar con claridad sobre qué acciones tomar.

## Condición inicial de la prueba

La prueba se ejecutó desde OperaGX. Al hacer clic en `Crear mi diagnóstico`, la app abrió directamente `/privacy`, lo que indica que ya había una sesión activa en el navegador. Por eso no apareció la pantalla `/auth` durante esta corrida y no fue necesario ingresar manualmente las credenciales provistas.

Sin embargo, al revisar el código de `app/index.tsx`, si no existe sesión activa la app envía al usuario a `/auth` antes de permitir el diagnóstico. Esto contradice la recomendación del mapa de pantallas: permitir crear el diagnóstico sin cuenta y pedir registro solo después, cuando el usuario quiera guardar su plan.

## Datos usados en la simulación

Perfil:

- Nombre: Prueba MVP
- Edad: 25-30
- País: Colombia
- Ciudad: Bogota

Ingresos:

- Rango mensual: `$3.000.000 - $5.000.000`
- Tipo: Fijo
- Frecuencia: Mensual

Gastos:

- Rango mensual: `$2.000.000 - $4.000.000`
- Categorías: Vivienda, Alimentación, Transporte, Servicios públicos, Deudas
- Percepción: Gasto más de lo planeado

Gastos hormiga:

- Presencia: Sí
- Categorías: Cafés, snacks y salidas; Domicilios o comida rápida; Suscripciones y apps
- Rango mensual: `$100.000 - $250.000`
- Intención: Redirigir una parte a una meta

Ahorros, deudas e inversiones:

- Ahorros: `$500.000 - $2.000.000`
- Cobertura de gastos esenciales: 1-3 meses
- Deudas: A veces me cuesta pagarlas
- Peso mensual de deudas: 10%-20%
- Inversiones: No, pero quiero aprender

Meta:

- Meta principal: Crear un fondo de emergencia
- Horizonte: 6-12 meses
- Importancia: Alta
- Cifra aproximada: `$1.000.000 - $5.000.000`

## Recorrido probado

Flujo recorrido:

`Bienvenida -> Privacidad -> Perfil -> Ingresos -> Gastos -> Gastos hormiga -> Ahorros y deudas -> Meta -> Resumen -> Diagnóstico -> Simulación -> Plan mensual -> Dashboard`

El recorrido no tuvo bloqueos ni errores visuales graves. La app permitió avanzar hasta dashboard y mostró navegación inferior.

Después del flujo inicial también se probó la experiencia como usuario recurrente en:

`/dashboard -> /spending -> /goals-overview -> /simulation -> /action-plan -> /improve-plan -> /assistant -> /settings -> /summary?mode=edit`

Se ingresaron datos exactos, montos por categoría, una segunda meta, aportes reales y preguntas al asistente para validar sincronización entre pantallas.

También se ejecutó `npm run typecheck`; terminó correctamente sin errores TypeScript.

## Resultados observados

Diagnóstico generado:

- Prioridad sugerida: Construir fondo de emergencia
- Margen mensual estimado: `$1.000.000 aprox.`
- Gastos frente a ingresos: `75% aprox.`
- Rango de ahorros: `$1.250.000 aprox.`
- Gastos hormiga: `$100.000 - $250.000`
- Peso de deudas: `10% - 20% de ingresos`

Simulación generada:

- Meta: Crear un fondo de emergencia
- Objetivo simulado: `$3.000.000 aprox.`
- Aporte mensual asignado: `$350.000 aprox.`
- Tiempo estimado: `9 meses aprox.`
- Escenarios observados: Aporte mínimo, Aporte equilibrado, Aporte intensivo

Plan mensual generado:

- Foco: Construir fondo de emergencia
- Progreso inicial: `0 de 3 acciones completadas`
- Acciones:
  - Separar un aporte inicial para fondo de emergencia
  - Guardar ese dinero en un lugar separado
  - Evitar usarlo para gastos no urgentes
- Estado inicial de acciones: Pendiente

Dashboard:

- Muestra saludo personalizado.
- Muestra meta principal.
- Muestra progreso mensual.
- Muestra resumen financiero estimado.
- Muestra fondo de emergencia.
- Muestra gastos pequeños.
- Muestra accesos rápidos a Diagnóstico, Simulación, Plan mensual y Editar respuestas.
- Muestra barra inferior con Inicio, Gastos, Metas, Simulación y Asistente.

## Cosas que sí se cumplen

- La pantalla de bienvenida comunica claramente la propuesta de valor.
- Se muestra confianza desde el inicio: no conexión bancaria, no datos bancarios sensibles.
- La pantalla de privacidad lista datos que no se piden: cédula, claves, cuenta, movimientos.
- El onboarding usa rangos en lugar de datos exactos.
- Se cubren ingresos, gastos, gastos hormiga, ahorros, deudas, inversiones y meta.
- El tono de gastos hormiga es cuidadoso y no juzga al usuario.
- Existe resumen antes del diagnóstico con opción de editar respuestas.
- El diagnóstico usa cálculos determinísticos desde utilidades locales, no IA.
- El diagnóstico explica margen, gastos/ingresos, ahorros, gastos hormiga, deuda e inversiones.
- La simulación calcula meta, aporte mensual, margen, relación gastos/ingresos y tiempo estimado.
- El plan mensual entrega tres acciones concretas.
- Las acciones tienen estados y permiten registrar avance.
- El dashboard posterior al diagnóstico existe y concentra progreso, meta, resumen financiero y accesos rápidos.
- La navegación inferior propuesta existe: Inicio, Gastos, Metas, Simulación, Asistente.
- El asistente existe como pantalla y declara límites educativos: no productos específicos, no promesas, no reemplazo de asesoría.
- La pantalla de gastos recurrentes permite ingresar montos por categoría, calcula porcentajes y avisa si la suma supera el gasto mensual.
- `Mejorar mi plan financiero` acepta datos exactos opcionales y recalcula dashboard, gastos y simulación.
- `Mis metas` permite ajustar bolsa mensual, agregar una segunda meta y registrar aportes reales.
- El plan mensual permite registrar avance con monto, marca la acción como completada y actualiza dashboard.
- El asistente respondió preguntas reales usando parte del contexto financiero del usuario.
- Configuración muestra usuario, estado de sincronización y accesos para editar datos.
- El typecheck del proyecto pasa sin errores.

## Cosas que no se cumplen o están pendientes

- El diagnóstico sin cuenta no está soportado si no hay sesión activa. El flujo actual manda a `/auth` antes de `/privacy`.
- Falta pedir registro solo al final para guardar el plan, como recomienda el mapa de pantallas.
- No existe una opción real de meta tipo `No sé todavía, ayúdame a elegir`. La app ofrece `Otro`, pero eso no equivale a descubrir una meta sugerida.
- No se observa una pregunta de perfil de riesgo simple como la descrita en el mapa.
- La simulación no replica los tres escenarios del brief: `Solo ahorro`, `Ahorro + inversión conservadora`, `Ahorro + inversión moderada`.
- La simulación actual no muestra nivel de riesgo por escenario.
- No se observó el mensaje obligatorio en simulación: `Estas simulaciones son estimaciones educativas. No garantizan resultados futuros.`
- La simulación no permite editar variables desde esa pantalla en el flujo probado.
- La pantalla de educación financiera completa no existe como sección dedicada, aunque sí hay microeducación integrada en textos.
- La experiencia pide más datos que el mapa base, por ejemplo nombre, percepción de gastos, cobertura de emergencia, peso de deuda y monto de meta. Esto puede mejorar el cálculo, pero amenaza el objetivo de completar el flujo en menos de 10 minutos.
- Las pantallas de metas, plan mensual, simulación y asistente no comparten una única fuente clara para el aporte mensual recomendado.
- Los aportes registrados en `Mis metas` no se reflejan en `Plan mensual`; los avances del plan sí se reflejan en dashboard y simulación.
- La simulación no muestra una vista agregada de varias metas. Después de agregar `Ahorrar para viajar`, sigue simulando sólo la meta principal.
- El asistente puede responder con cifras distintas a las visibles en simulación/plan. En la prueba usó `$580.000` mensuales, mientras la UI mostraba `$320.000`, `$380.000` y una bolsa manual de `$500.000`.
- Hay textos con problema de codificación visible: `pequeÃ±os` en `/improve-plan`.

## Posibles problemas o errores detectados

- Posible desalineación de progreso de meta: el diagnóstico reconoce ahorros estimados por `$1.250.000`, pero la simulación y el dashboard muestran la meta de emergencia con restante completo de `$3.000.000` y avance `0%`. Para una meta de fondo de emergencia esto puede confundir, porque el usuario sí declaró ahorros actuales.
- La lectura de deuda es correcta pero algo genérica. En el caso probado, el usuario marcó que a veces le cuesta pagar deudas y que usa 10%-20% de ingresos; el diagnóstico dice que las deudas deben considerarse dentro del plan, pero podría sugerir una acción más concreta.
- Hay código inalcanzable después de retornos tempranos en funciones como `getMainPriority`, `getMonthlyFocus` y `getMonthlyActions`. No rompió la prueba, pero puede ocultar lógica anterior o ramas esperadas.
- La simulación habla de aporte mínimo/equilibrado/intensivo, lo cual es útil, pero cambia la promesa del Product Brief. Hay que decidir si se actualiza el producto o el brief.
- El uso de sesión/Supabase parece guardar datos durante el onboarding si hay usuario activo. Para pruebas de UX sin cuenta, esto debe separarse mejor.
- Inconsistencia de avance real: se registró `$100.000` en `Mis metas` y luego `$50.000` en `Plan mensual`. Dashboard y simulación reconocieron sólo el avance del plan mensual, mientras `Mis metas` mantuvo su contador propio. Esto puede confundir al usuario sobre cuánto avanzó realmente.
- Inconsistencia de aporte sugerido: después de ajustar bolsa a `$500.000`, la meta principal recibió `$320.000` y la segunda meta `$180.000`. Sin embargo, la simulación siguió mostrando escenarios de `$350.000`, `$380.000` y `$490.000`, y el asistente habló de `$580.000`.
- El botón/ruta de `Plan mensual` no está en la navegación inferior principal. Existe como pantalla, pero se accede por dashboard, simulación o URL directa.
- No se ejecutaron pruebas destructivas de borrado de metas, cuenta o datos. Sólo se observó un icono de eliminar en la segunda meta; no se presionó para evitar una acción destructiva sin confirmación específica.

## Prueba exploratoria de pantallas recurrentes

### `/spending`

Datos ingresados por categoría:

- Vivienda: `$1.200.000`
- Alimentación: `$800.000`
- Transporte: `$350.000`
- Servicios públicos: `$250.000`
- Deudas: `$450.000`

Resultados:

- La pantalla calculó un total categorizado de `$3.050.000`.
- Antes de mejorar el plan, comparó contra gasto mensual estimado de `$3.000.000` y avisó exceso de `$50.000`.
- Después de guardar datos exactos en `/improve-plan`, actualizó gasto mensual a `$2.900.000` y el exceso pasó a `$150.000`.
- Cambió la mayor oportunidad del mes a `Revisar Vivienda`, con impacto de `$60.000` al mes y `$720.000` al año.
- Los campos funcionan, pero inicialmente los montos en `$0` pueden parecer métricas de sólo lectura. Conviene reforzar el affordance de edición.

### `/goals-overview`

Pruebas realizadas:

- Se ajustó la bolsa mensual manual de `$350.000` a `$500.000`.
- La pantalla recalculó la bolsa como 50% del margen mensual estimado.
- Se agregó una segunda meta: `Ahorrar para viajar`, horizonte `1-3 años`, prioridad `Media`, monto `$5.000.000 - $20.000.000`.
- Las metas activas subieron de 1 a 2.
- La bolsa se distribuyó en `$320.000` para fondo de emergencia y `$180.000` para viaje.
- Se registró un aporte de `$100.000` al fondo de emergencia.

Resultados:

- `Mis metas` actualizó progreso de la meta principal a 3%.
- El restante bajó de `$3.000.000` a `$2.900.000`.
- `Invertido en metas` y `Registrado este mes` subieron a `$100.000`.
- La segunda meta quedó en 0%, con `$12.500.000 restantes` y aporte sugerido de `$180.000`.

Observación: esta pantalla funciona bien de forma aislada, pero su aporte real no se sincronizó con `Plan mensual`.

### `/action-plan`

Pruebas realizadas:

- Se abrió el plan mensual después de registrar `$100.000` en metas.
- El plan seguía en `0 de 3 acciones completadas` y `Avance real $0`.
- Se registró un avance propio del plan por `$50.000`.

Resultados:

- El plan pasó a `1 de 3 acciones completadas`.
- `Avance real` pasó a `$50.000`.
- La acción quedó como `Completada`.
- Dashboard reflejó el avance del plan: 33% y `$50.000`.

Problema: los aportes de metas y los avances del plan mensual parecen ser estados distintos, aunque para el usuario representan avances hacia la misma meta.

### `/improve-plan`

Datos exactos ingresados:

- Ingreso mensual: `$4.200.000`
- Gasto mensual: `$2.900.000`
- Ahorro disponible general: `$1.600.000`
- Gastos pequeños mensuales: `$180.000`

Resultados:

- Dashboard actualizó ingreso, gasto, margen y relación gastos/ingresos.
- Margen pasó a `$1.300.000`.
- Relación gastos/ingresos pasó a `69%`.
- El módulo quedó como `4 de 4 datos agregados`.
- `/spending` y `/simulation` tomaron los nuevos datos.

Problema visual: en el encabezado apareció `gastos pequeÃ±os`, lo que indica un error de codificación.

### `/simulation`

Resultados después de datos exactos y avances:

- Margen actualizado: `$1.300.000`.
- Relación actualizada: `69%`.
- Meta principal: fondo de emergencia.
- Aporte asignado a meta principal: `$320.000`.
- Restante: `$2.900.000`.
- Tiempo: `10 meses aprox.`
- Escenario nuevo: `Aporte registrado`, `$50.000 aprox.`, cerca del 4% del margen mensual.

Problemas:

- La simulación no incluye la segunda meta en la vista principal.
- Los escenarios siguen usando referencias que no se explican bien frente a la bolsa manual de `$500.000`.
- No aparece el disclaimer obligatorio de estimaciones educativas y no garantía de resultados.

### `/assistant`

Preguntas realizadas:

- `Explícame mi diagnóstico en 3 puntos y dime si debo priorizar el fondo de emergencia o el viaje.`
- `Si aporto $100.000 más al mes al fondo, ¿en cuánto cambia el tiempo para completar la meta?`

Resultados:

- El contador bajó de `5 restantes` a `3 restantes`.
- El asistente usó los datos exactos de ingreso y gasto.
- Recomendó priorizar fondo de emergencia antes que viaje.
- Calculó que faltan `$7.100.000` para llegar a 3 meses de respaldo, consistente con gasto mensual de `$2.900.000` y ahorro general de `$1.600.000`.
- Mantuvo tono educativo y no recomendó productos financieros concretos.

Problema:

- El asistente dijo que la app sugiere `$580.000` mensuales y que la meta tomaría cerca de 6 meses. Esta cifra no coincidía con la simulación visible ni con la bolsa/manual distribuida entre metas.

### `/settings` y edición de perfil

Resultados:

- Muestra usuario `prueba15@test.com`.
- Muestra `Supabase Configurado`, `Onboarding saved` y `Plan saved`.
- Permite ir a `Mejorar mi plan financiero`.
- Permite ir a `Editar perfil financiero`, que abre `/summary?mode=edit`.
- En edición de perfil se muestran bloques editables y una advertencia clara de que diagnóstico, simulación y plan mensual pueden recalcularse.
- No se observó opción visible de borrar cuenta o datos en esta pantalla.

## Evaluación por pantalla prioritaria

| Pantalla / requisito | Estado | Observación |
| --- | --- | --- |
| Bienvenida | Cumple | Mensaje claro, valor y confianza visibles. |
| Privacidad y confianza | Cumple | Explica datos sensibles no requeridos. |
| Perfil básico | Cumple con extensión | Agrega nombre y apellido. |
| Ingresos | Cumple | Rango, tipo y frecuencia. |
| Gastos | Cumple con extensión | Rango, categorías y percepción. |
| Gastos hormiga | Cumple | Buen tono, categorías, rango e intención. |
| Ahorros, deudas e inversiones | Cumple con extensión | Más completo que el mapa. |
| Meta financiera | Parcial | Falta `No sé, ayúdame a elegir`. |
| Horizonte y prioridad | Cumple | Integrado dentro de metas. |
| Perfil de riesgo simple | No cumple | No se observó pregunta específica. |
| Resumen antes del diagnóstico | Cumple | Con edición por bloque. |
| Diagnóstico financiero | Cumple | Muestra prioridad, margen, gastos, ahorro, deuda y gastos hormiga. |
| Simulación de escenarios | Parcial | Calcula escenarios, pero no los escenarios de ahorro/inversión ni riesgo. |
| Plan de acción mensual | Cumple | Genera tres acciones con estados. |
| Dashboard principal | Cumple | Tiene progreso, meta, resumen, gastos pequeños y accesos rápidos. |
| Gastos recurrentes | Cumple con observación | Calcula categorías y alerta exceso; los campos podrían verse más editables. |
| Metas recurrentes | Parcial | Agrega metas, bolsa y aportes; falta sincronización con plan mensual. |
| Mejorar plan | Cumple con bug visual | Recalcula con datos exactos; hay texto con codificación rota. |
| Asistente IA | Parcial | Responde con contexto y límites educativos, pero usa cifras inconsistentes frente a simulación/plan. |
| Configuración | Cumple | Muestra usuario, estados de guardado y accesos de edición. |
| Educación financiera | Parcial | Hay microeducación contextual, no pantalla completa. |

## Recomendación

No pasaría todavía a una siguiente etapa grande sin ajustar primero algunas pantallas actuales. El flujo principal ya existe y es bastante sólido, pero hay brechas justo en promesas centrales del MVP.

Recomiendo un ciclo corto de ajuste antes de avanzar:

1. Unificar la fuente de cálculo de aporte recomendado entre metas, plan mensual, simulación y asistente.
2. Sincronizar aportes de `Mis metas` con `Plan mensual`, o explicar claramente que son registros diferentes.
3. Permitir diagnóstico sin cuenta y pedir registro sólo al guardar.
4. Agregar opción `No sé todavía, ayúdame a elegir` y una regla simple de meta sugerida.
5. Agregar perfil de riesgo simple.
6. Ajustar simulación para cumplir el brief o actualizar formalmente el brief.
7. Incluir disclaimer obligatorio de simulación.
8. Aclarar avance de meta frente a ahorros existentes.
9. Corregir textos con codificación rota.
10. Reducir fricción del onboarding o volver opcionales algunos campos extendidos.
11. Limpiar código inalcanzable en cálculo/priorización/plan mensual.

Conclusión: la base del MVP está lista para iterar, pero no recomendaría cerrar esta fase aún. La app ya demuestra el valor central, aunque necesita alinear autenticación, descubrimiento de meta, riesgo y simulaciones antes de pasar a construir funcionalidades más avanzadas.
