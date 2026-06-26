# Ruta Financiera - contexto de la aplicacion actual

Estado observado: 26 de junio de 2026.

## Resumen

Ruta Financiera es una aplicacion de planificacion financiera personal orientada a ayudar a una persona a entender su situacion actual, elegir una meta financiera y convertir esa informacion en un diagnostico educativo, una simulacion y un plan mensual de acciones simples.

El producto trabaja con rangos aproximados en lugar de exigir cifras exactas desde el inicio. Esto reduce friccion y evita pedir informacion bancaria sensible. La app no conecta bancos, no solicita cedula, claves bancarias, numeros de cuenta ni movimientos bancarios. Sus resultados se presentan como orientacion educativa, no como asesoria financiera profesional ni promesa de resultados.

## Propuesta de valor

La experiencia esta pensada para que el usuario:

- Entienda sus ingresos, gastos, ahorros, deudas y gastos frecuentes sin tener que calcular cada peso.
- Identifique una prioridad financiera inicial.
- Vea indicadores simples de su situacion mensual.
- Compare escenarios educativos para avanzar hacia una meta.
- Reciba un plan mensual con acciones concretas y marcables.
- Ajuste la precision del plan agregando valores manuales cuando tenga mas claridad.
- Gestione varias metas y reparta una bolsa mensual entre ellas.

## Flujo principal de la app

### 1. Bienvenida

La pantalla inicial presenta la marca Ruta Financiera y explica el enfoque general: organizar el dinero, entender gastos, descubrir oportunidades de ahorro y recibir acciones mensuales simples.

Desde esta pantalla el usuario puede:

- Crear su diagnostico.
- Explorar una demo.
- Ir al dashboard si ya tiene sesion y onboarding completo.

### 2. Autenticacion

La app tiene una pantalla de autenticacion con dos modos:

- Entrar con un usuario existente.
- Crear usuario de prueba.

Despues de crear usuario, el flujo continua hacia el onboarding.

### 3. Privacidad y confianza

La pantalla de privacidad explica que el diagnostico usa rangos aproximados para dar una primera orientacion. Tambien comunica explicitamente lo que no se pide:

- Cedula.
- Claves bancarias.
- Numero de cuenta.
- Movimientos bancarios.

Esta pantalla busca generar confianza antes de solicitar informacion financiera.

### 4. Perfil basico

El usuario responde datos generales para personalizar el diagnostico:

- Rango de edad.
- Pais.
- Ciudad opcional.

La ciudad no es obligatoria. El boton de continuar se habilita cuando se completan los datos minimos.

### 5. Ingresos

La pantalla de ingresos solicita:

- Rango de ingresos mensuales.
- Tipo de ingreso: fijo, variable o mixto.
- Frecuencia de ingreso: mensual, quincenal, semanal o irregular.

La app aclara que no necesita conocer el salario exacto y que estos datos se pueden ajustar mas adelante.

### 6. Gastos mensuales

La pantalla de gastos solicita:

- Rango de gastos mensuales.
- Categorias principales de gasto.
- Percepcion del usuario sobre sus gastos.

Las categorias principales pueden incluir vivienda, alimentacion, transporte, servicios publicos, deudas, educacion, salud, familia, entretenimiento, suscripciones, compras y otras.

La percepcion del usuario permite capturar si siente que tiene los gastos bajo control, si gasta mas de lo planeado o si no sabe en que se va el dinero.

### 7. Gastos hormiga

Esta seccion identifica pequenos gastos frecuentes. Primero pregunta si el usuario siente que tiene gastos pequenos frecuentes. Si responde que si, puede seleccionar varias categorias, por ejemplo:

- Cafes o snacks.
- Domicilios.
- Transporte extra.
- Suscripciones.
- Compras pequenas.
- Salidas.
- Juegos o entretenimiento digital.
- Apps o servicios digitales.
- Antojos.
- Otros.

Luego pide una estimacion mensual del gasto y que quiere hacer con esos consumos:

- Mantenerlos como estan.
- Establecer un limite mensual.
- Reducir algunos.
- Redirigir una parte a una meta.
- Primero entenderlos mejor.

La app no plantea estos gastos como algo necesariamente malo. El mensaje central es decidir cuales mantener, limitar o redirigir.

### 8. Ahorros, deudas e inversiones

Esta pantalla busca entender el punto de partida financiero del usuario. Solicita:

- Rango de ahorro actual.
- Cuanto tiempo podria cubrir gastos esenciales sin ingresos.
- Situacion actual de deudas.
- Parte de ingresos mensuales que se va a pagar deudas.
- Situacion frente a inversiones.

Incluye opciones como "Prefiero no responder" para datos que puedan incomodar al usuario.

### 9. Primera meta financiera

El usuario elige una meta inicial. Algunas opciones son:

- Organizar mis gastos.
- Crear un fondo de emergencia.
- Pagar deudas.
- Ahorrar para vivienda.
- Ahorrar para estudiar.
- Ahorrar para viajar.
- Empezar a invertir.
- Ahorrar para un negocio.
- Prepararme para el futuro.
- Otra meta personalizada.

Tambien define:

- Horizonte de tiempo.
- Importancia de la meta.
- Cifra aproximada opcional.

Al completar esta parte, la app crea una meta financiera inicial y permite revisar las respuestas antes de generar el diagnostico.

## Resumen antes del diagnostico

Antes de generar resultados, la app muestra un resumen editable de las respuestas. Desde ahi el usuario puede volver a secciones especificas para ajustar informacion.

El resumen organiza la informacion en bloques:

- Perfil basico.
- Ingresos.
- Gastos.
- Gastos hormiga.
- Ahorros, deudas e inversiones.
- Meta financiera.

Tambien incluye el aviso de que el diagnostico es educativo y no constituye asesoria financiera ni promesa de resultados.

## Diagnostico financiero

El diagnostico convierte las respuestas en una primera lectura financiera. Usa estimaciones basadas en rangos y, cuando existen, datos manuales mas claros.

Los indicadores clave incluyen:

- Margen mensual aproximado.
- Gastos frente a ingresos.
- Rango o valor estimado de ahorros.
- Gastos hormiga estimados.
- Peso de deudas sobre ingresos.

Tambien muestra una prioridad sugerida. Por ejemplo, si el usuario tiene baja cobertura de gastos esenciales, la app puede sugerir construir un fondo de emergencia antes de asumir metas mas grandes.

El diagnostico puede incluir secciones como:

- Lectura del flujo mensual.
- Fondo de emergencia.
- Gastos hormiga.
- Deudas e inversiones.
- Que significa esto.
- Primeras acciones recomendadas.

## Simulacion de escenarios

La simulacion compara caminos posibles para avanzar hacia la meta principal. Presenta los calculos como educativos y aproximados, no como predicciones exactas.

La pantalla muestra:

- Meta simulada.
- Horizonte.
- Monto objetivo estimado.
- Monto restante estimado.
- Tiempo estimado.
- Punto de partida financiero.
- Escenarios educativos.

Los escenarios suelen comparar ritmos como:

- Mantener ritmo actual.
- Ajuste equilibrado.
- Ajuste intensivo.

Cada escenario puede mostrar:

- Aporte mensual estimado.
- Supuesto usado.
- Avance proyectado a 3, 6 y 12 meses.
- Etiquetas de esfuerzo, sostenibilidad o riesgo.

La simulacion tambien puede incluir mensajes preventivos, por ejemplo recomendar fortalecer un fondo de emergencia antes de pensar en invertir.

## Plan mensual

El plan mensual transforma el diagnostico y la simulacion en acciones concretas para el mes.

La pantalla muestra:

- Enfoque del mes.
- Resumen del mes.
- Numero de acciones recomendadas.
- Posible aporte mensual.
- Tres acciones para el mes.
- Progreso del mes.
- Guia breve sobre como usar el plan.

Cada accion mensual incluye:

- Titulo.
- Descripcion.
- Categoria.
- Dificultad.
- Impacto estimado.
- Explicacion de por que importa.
- Checkbox para marcarla como completada.

Cuando el usuario marca acciones como completadas, la app actualiza el progreso. Si completa las tres acciones, el progreso llega a 100% y aparece un mensaje de cierre del plan mensual.

## Dashboard

El dashboard o pantalla de inicio resume el estado actual del usuario.

Puede mostrar:

- Enfoque del mes.
- Estado del plan mensual.
- Resumen financiero estimado.
- Tarjeta para mejorar el plan financiero.
- Accesos a gastos, metas, diagnostico, simulacion, plan mensual y resumen.
- Navegacion inferior.

El resumen financiero muestra valores como:

- Ingreso mensual.
- Gasto mensual.
- Margen mensual.
- Gastos / ingresos.

La tarjeta "Mejorar mi plan financiero" invita a agregar datos opcionales para mejorar la precision de los calculos.

## Mejorar mi plan financiero

Esta pantalla permite reemplazar rangos aproximados por datos manuales. Los cuatro datos opcionales son:

- Ingreso mensual.
- Gasto mensual.
- Ahorro actual.
- Monto objetivo de la meta.

El usuario puede guardar uno, varios o los cuatro datos. La app muestra el avance como "0 de 4", "1 de 4", etc. A medida que se agregan datos, el plan pasa de estimado a mejorado o mas claro.

Despues de guardar, el dashboard recalcula metricas como ingreso, margen mensual y relacion gastos / ingresos.

## Metas

La seccion de metas permite gestionar objetivos financieros activos.

La pantalla muestra:

- Bolsa mensual para metas.
- Numero de metas activas.
- Monto invertido o guardado en metas.
- Total asignado de la bolsa.
- Campo para fijar una bolsa mensual manual.
- Lista de metas.

Cada meta puede mostrar:

- Tipo de meta.
- Etiquetas como principal, seguridad, bienestar o estado de ritmo.
- Progreso individual.
- Monto restante.
- Objetivo.
- Horizonte.
- Aporte necesario por mes.
- Tiempo estimado.
- Registro de aportes.
- Aporte mensual asignado.

El usuario puede:

- Registrar aportes.
- Ajustar el aporte mensual con controles de suma y resta.
- Pausar una meta.
- Editar una meta.
- Crear una nueva meta.
- Marcar una meta como principal.
- Completar una meta.
- Eliminar metas secundarias.

Cuando hay varias metas, la app reparte la bolsa mensual entre ellas segun importancia, horizonte y viabilidad. La meta principal recibe una etiqueta especial y puede influir en la simulacion.

## Pantallas en construccion

La app incluye algunas rutas que actualmente funcionan como pantallas "proximamente":

- Gastos: indica que en el futuro se podran revisar y actualizar gastos mensuales.
- Asistente: indica que en el futuro se podran hacer preguntas sobre diagnostico, simulacion y plan mensual.
- Demo: existe como entrada para explorar un ejemplo, aunque su alcance actual es limitado.

Estas pantallas sirven como marcadores de funcionalidad futura dentro del mapa de producto.

## Datos y persistencia

La app puede persistir informacion del usuario con Supabase cuando esta configurado. La informacion persistida incluye:

- Datos del onboarding.
- Metas financieras.
- Acciones completadas del plan mensual.
- Valores exactos agregados en "Mejorar mi plan financiero".

Cuando Supabase no esta configurado o durante pruebas locales, la experiencia puede funcionar con estado de la aplicacion, segun el entorno de ejecucion.

## Enfoque de producto

Ruta Financiera prioriza una experiencia progresiva:

1. Primero pide rangos aproximados.
2. Luego genera una lectura educativa.
3. Despues propone escenarios.
4. Finalmente convierte el resultado en acciones mensuales.
5. Mas adelante permite mejorar la precision con datos manuales.

La app intenta evitar lenguaje culpabilizador. En vez de decirle al usuario que elimine todos sus gastos pequenos, lo invita a decidir que conservar, limitar o redirigir hacia sus metas.

## Para explicar la app a otra persona

Una forma corta de describirla:

Ruta Financiera es una app de planificacion financiera personal que guia al usuario por un diagnostico simple usando rangos aproximados. Con esa informacion calcula indicadores como ingresos, gastos, margen mensual, gastos hormiga, deuda y ahorro disponible. Luego sugiere una prioridad financiera, simula escenarios para avanzar hacia una meta y crea un plan mensual con acciones concretas que el usuario puede marcar como completadas. Tambien permite mejorar la precision agregando valores manuales y administrar varias metas con aportes y progreso.
