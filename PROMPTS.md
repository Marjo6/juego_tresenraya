# PROMPTS.md — evidencia de los prompts

Proyecto: **Tres en Raya Cuántico** (encargo 10)
Autor: Marjo6 · 3.er año Desarrollo de Software «A»

Este archivo se completa **en el momento** en que se manda cada prompt al agente, no al final.
Cada entrada lleva: el prompt tal como se envió (con los corchetes ya completados), qué hizo el
agente, y —si hubo que corregir— el prompt de corrección.

Orden de los ocho prompts: **P1** arranque · **P2** pruebas · **P3** pantalla · **P4** móvil ·
**P5** revisión · **P6** README · **R1** rescate (diagnóstico) · **R2** rescate (límites).

---

<!-- A partir de acá se pega cada prompt en su turno. -->
# PROMPTS.md — entrada P1

## P1 · ARRANQUE · las reglas
Fecha/hora: 2026-10-09 11:35:58 (reenviado corregido)
Prompt enviado tal cual (con ficha pegada):

`
Creá el archivo src/logica.ts con las reglas de TRES EN RAYA CUÁNTICO,
según la ficha de abajo.

REGLAS TÉCNICAS, obligatorias
- TypeScript. Exportá los tipos y el objeto CONFIG con todos los números
  juntos arriba, cada uno con un comentario que diga su unidad.
- Este archivo NO puede tocar la pantalla: nada de document, window, alert ni
  console.log. Solo datos y funciones sobre el estado.
- Cada función que cambia el estado devuelve true si la acción fue válida y
  false si no se pudo hacer.
- Si hace falta azar, usá un generador con semilla y exportalo, para que la
  misma semilla dé siempre el mismo resultado.
- Código y comentarios en español.

REGLAS DE TRABAJO
- Hacé exactamente lo que dice la ficha. Nada más.
- Si algo es ambiguo o imposible, paralo y preguntame antes de inventar.
- Al terminar, listame qué dejaste fuera y qué decidiste vos donde la ficha
  no decía nada.

FICHA:
- Proyecto: Tres en raya cuántico
- Cada jugada k consiste en marcar DOS casillas distintas con la marca X_k u O_k.
- Cuando una jugada crea un ciclo/bucle entre casillas entrelazadas, se entra
  en estado de RESOLUCIÓN DE COLAPSO: el jugador afectado debe elegir en cuál
  de las dos casillas queda fijada la ficha actual, colapsando en cadena la
  red de fichas entrelazadas a sus valores clásicos.
- Termina cuando un jugador alinea 3 marcas colapsadas clásicas de su símbolo,
  o cuando el tablero se llena y no hay ganador.
- Un uso normal incluye: seleccionar 2 casillas -> colocar marca cuántica ->
  cambiar turno. Si hay ciclo -> resolver colapso -> verificar si 3 en raya ->
  cambiar turno o finalizar.
- Lo que no va: sin animaciones 3D, sin temporizador, sin multijugador en red,
  sin IA.
`

Aclaraciones antes de codificar (el agente frenó y preguntó por lo ambiguo):
- Quién resuelve el colapso: el jugador contrario al que provocó el ciclo.
- Cadena de colapso: propagación por restricciones (no solo la jugada actual).
- Azar: no hace falta; el juego es determinista (sin RNG).
- API de jugada: una sola llamada con las dos casillas.

Respuesta/acción del agente (lo que hizo): reescribió src/logica.ts con la
lógica pura del juego. Detecta ciclos con un grafo de entrelazados (unión-buscar)
que también cubre el doble enlace; al entrar en colapso, el contrario elige una
de las dos casillas y todo el componente se resuelve en cadena (incluidos los
tallos). Verifica el final tras cada colapso: 3 en raya solo con fichas clásicas;
si ambos logran línea, gana la de menor subíndice máximo; empate si no quedan 2
casillas para marcar. No toca pantalla. Verificado con tsc --strict y una
simulación del ejemplo de la Wikipedia.

Decisiones tomadas donde la ficha no decía nada:
- Casilla jugable = sin marca clásica; se pueden apilar fichas cuánticas sin
  límite (no se implementó la regla de "última jugada en una sola casilla").
- El subíndice k de cada jugada se guarda para el desempate por subíndice.
- API: colocarJugadaCuantica(estado, a, b), resolverColapso(estado, casilla),
  reiniciarPartida(estado) + consultas; los parámetros son índices 0..8.
- Quien resuelve el colapso es el que mueve después.

Dejé fuera (según la ficha y por ser determinista): azar/RNG, IA, animaciones,
sonido, tablero mayor a 3x3, online y guardado de partidas.

Corrección: la primera versión de src/logica.ts (importaba crypto de Node, no
detectaba ciclos y no dejaba elegir el colapso) se reemplazó por la versión
final. El prompt de corrección fue el mismo P1
("Creá el archivo src/logica.ts con las reglas de TRES EN RAYA CUÁNTICO,
según la ficha de abajo"), precedido por las aclaraciones de arriba.

---

# PROMPTS.md — entrada P2

## P2 · PRUEBAS · comprobar las reglas
Fecha/hora: 2026-10-09 14:35
Prompt enviado tal cual:

`
Escribí las pruebas de la lógica del juego con Vitest en test/logica.test.ts.
- Nombres de los test en español, en forma de oración.
- Mínimo 5 pruebas: estado inicial, jugada válida con dos índices, jugada
  inválida, fin de partida (tres en raya y empate) y un recorrido completo de
  principio a fin que resuelva un ciclo y llegue a un ganador.
- Comentá cada prueba. No toques src/logica.ts.
- Al final corré npm test y pegame el resultado.
`

Respuesta/acción del agente: reescribió test/logica.test.ts con 7 pruebas
(estado inicial; jugada válida de dos índices; jugada inválida; no jugar en
colapso ni sobre casilla colapsada; fin con 3 en raya y empate; recorrido
completo con dos ciclos hasta ganador; reiniciar). Usa los guiones
deterministas de una partida ganada por X y de una partida empatada.
Resultado: `Test Files 1 passed (1)`, `Tests 7 passed (7)`.

Corrección: la versión previa del archivo usaba la API vieja
(seleccionarCasilla, colapsarSiCorresponde, CONFIG.JUGADOR_X) y no compilaba;
se reemplazó por la API actual (crearPartida(), colocarJugadaCuantica(e,a,b),
resolverColapso(e,c)). También se revirtió un cambio accidental en
src/logica.ts que había puesto `colapso: any` en vez del tipo correcto.

---

# PROMPTS.md — entrada P3

## P3 · PANTALLA · jugar desde el navegador
Fecha/hora: 2026-10-09 14:00
Prompt enviado tal cual:

`
La pantalla no muestra ningún juego. Hacé que se vea y se pueda jugar: tablero
3x3, turno y fase, las fichas cuánticas, elegir casilla al colapsar, mensaje de
victoria o empate y botón de reiniciar. Conectado a src/logica.ts, sin tocar la
lógica.
`

Respuesta/acción del agente: reescribió src/main.ts y creó src/estilos.css con
el tablero 3x3, indicador de turno (X azul / O naranja) y fase, fichas cuánticas
en amarillo, resaltado de las dos casillas al colapsar, mensaje de victoria
(verde) o empate (rojo), contador de movimientos, botón Reiniciar y navegación
con teclado. Solo consume la API de src/logica.ts.
