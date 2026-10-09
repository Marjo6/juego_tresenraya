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
Fecha/hora: 2026-10-09 11:35:58
Prompt enviado tal cual (con ficha pegada):

`
Creá el archivo src/logica.ts con las reglas de Tres en Raya Cuántico,
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
FICHA - TRES EN RAYA CUÁNTICO
...
`

Respuesta/acción del agente (lo que hice): Generé src/logica.ts con lógica pura del Tres en Raya Cuántico (fase cuántica: cada jugada coloca ficha cuántica en dos casillas distintas; colapso cuando hay conflicto; detección de victoria con fichas COLAPSADAS; empate al tablero lleno sin victoria). Separé tipos, CONFIG, RNG con semilla, crearPartida, colocarJugadaCuantica, colapsarSiCorresponde, terminarTurno/chequeos, consultas. Sin DOM. Todo según ficha.

Decisiones tomadas donde no decía: definí estados de fase (cuántica/colapso), modelo de superposición (set de casillas pendientes por turno), colapso al producirse alineación o al llenarse el espacio relevante (simplificado y determinista). Dejé fuera IA, sonidos, animaciones, tablero >3x3, online.

Corrección: (ninguna)
