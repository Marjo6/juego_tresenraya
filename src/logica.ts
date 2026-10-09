// src/logica.ts — Tres en Raya Cuántico (lógica pura)
//
// Este archivo NO toca la pantalla: no usa document, window, alert ni
// console.log. Solo define datos del estado y funciones que lo transforman.
//
// Resumen de las reglas:
// - Cada jugada k marca DOS casillas distintas con X_k u O_k (fichas "cuánticas").
// - Si la jugada crea un ciclo entre casillas entrelazadas, se entra en
//   RESOLUCIÓN DE COLAPSO: el jugador contrario al que movió elige en cuál de
//   las dos casillas de la jugada queda fijada, y la red entrelazada colapsa
//   en cadena a valores clásicos (propagación por restricciones).
// - Gana quien alinea 3 fichas CLÁSICAS de su símbolo; si el tablero se llena
//   (o ya no se pueden marcar 2 casillas) sin ganador, es empate.
// - El juego es totalmente determinista: no se usa azar.

// ---------------------------------------------------------------------------
// CONFIGURACIÓN — todos los números del juego juntos, cada uno con su unidad.
export const CONFIG = {
  FILAS: 3, // filas del tablero (casillas)
  COLUMNAS: 3, // columnas del tablero (casillas)
  FICHAS_POR_JUGADA: 2, // casillas marcadas por jugada (casillas)
  META_ALINEACION: 3, // fichas alineadas seguidas para ganar (fichas)
} as const;

// Total de casillas del tablero (casillas).
const CASILLAS = CONFIG.FILAS * CONFIG.COLUMNAS;

// Líneas ganadoras (índices de casillas). Es una tabla estructural derivada de
// la geometría 3x3, no un parámetro ajustable.
const LINEAS_GANADORAS: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
  [0, 4, 8], [2, 4, 6], // diagonales
];

// ---------------------------------------------------------------------------
// TIPOS
export type Jugador = "X" | "O";
export type Fase = "cuantica" | "colapso" | "terminado";

// Ficha ya resuelta (colapsada) con su símbolo y el subíndice de la jugada.
export interface FichaClasica {
  jugador: Jugador;
  jugada: number; // subíndice k de la jugada
}

// Ficha en superposición que aún espera colapso.
export interface FichaCuantica {
  jugador: Jugador;
  jugada: number; // subíndice k de la jugada
}

// Una casilla del tablero.
export interface Casilla {
  indice: number; // posición 0..(CASILLAS-1)
  fila: number; // 0..(FILAS-1)
  columna: number; // 0..(COLUMNAS-1)
  clasica: FichaClasica | null; // marca clásica si ya colapsó; si no, null
  cuanticas: FichaCuantica[]; // fichas en superposición en esta casilla
}

// Una jugada cuántica: entrelaza dos casillas distintas con X_k u O_k.
export interface Movimiento {
  jugada: number; // subíndice k
  jugador: Jugador;
  casillas: [number, number]; // las dos casillas entrelazadas
  resuelto: boolean; // si ya colapsó a una casilla clásica
  casillaFinal: number | null; // casilla donde quedó tras colapsar
}

// Datos de una RESOLUCIÓN DE COLAPSO pendiente.
export interface ColapsoPendiente {
  jugada: number; // jugada que creó el ciclo
  casillas: [number, number]; // sus dos casillas: las dos opciones a elegir
  jugadorMarca: Jugador; // jugador que provocó el ciclo
}

// Estado completo de una partida.
export interface Estado {
  tablero: Casilla[];
  turno: Jugador; // jugador que debe actuar ahora
  fase: Fase;
  ganador: Jugador | null;
  empate: boolean;
  movimientosCuanticos: number; // contador de jugadas cuánticas realizadas
  jugadas: Movimiento[]; // registro de todas las jugadas
  colapso: ColapsoPendiente | null; // no es null durante la fase "colapso"
}

// ---------------------------------------------------------------------------
// UTILIDADES INTERNAS
function contrario(jugador: Jugador): Jugador {
  return jugador === "X" ? "O" : "X";
}

// Convierte fila/columna a índice lineal.
export function indiceDe(fila: number, columna: number): number {
  return fila * CONFIG.COLUMNAS + columna;
}

// ---------------------------------------------------------------------------
// CREAR / REINICIAR
export function crearPartida(): Estado {
  const tablero: Casilla[] = [];
  for (let indice = 0; indice < CASILLAS; indice++) {
    const fila = Math.floor(indice / CONFIG.COLUMNAS);
    const columna = indice % CONFIG.COLUMNAS;
    tablero.push({ indice, fila, columna, clasica: null, cuanticas: [] });
  }
  return {
    tablero,
    turno: "X", // X siempre empieza
    fase: "cuantica",
    ganador: null,
    empate: false,
    movimientosCuanticos: 0,
    jugadas: [],
    colapso: null,
  };
}

// Reinicia el estado en el mismo objeto. Devuelve true (acción válida).
export function reiniciarPartida(estado: Estado): boolean {
  Object.assign(estado, crearPartida());
  return true;
}

// ---------------------------------------------------------------------------
// CONSULTAS
// Casillas sin marca clásica (todavía jugables), en orden de índice.
export function casillasAbiertas(estado: Estado): number[] {
  const abiertas: number[] = [];
  for (const celda of estado.tablero) {
    if (celda.clasica === null) abiertas.push(celda.indice);
  }
  return abiertas;
}

// ¿Se puede marcar esta casilla en este momento?
export function esCasillaJugable(estado: Estado, indice: number): boolean {
  return (
    estado.fase === "cuantica" &&
    indice >= 0 &&
    indice < CASILLAS &&
    estado.tablero[indice].clasica === null
  );
}

// ¿Sería válida una jugada con estas dos casillas ahora mismo?
export function puedeColocar(estado: Estado, a: number, b: number): boolean {
  if (estado.fase !== "cuantica") return false;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || a >= CASILLAS || b < 0 || b >= CASILLAS) return false;
  if (a === b) return false;
  if (estado.tablero[a].clasica !== null) return false;
  if (estado.tablero[b].clasica !== null) return false;
  return true;
}

// Mejor (menor) subíndice máximo entre las líneas completas de un jugador.
// Devuelve null si el jugador no tiene ninguna línea clásica completa.
function mejorMaxSubindice(estado: Estado, jugador: Jugador): number | null {
  let mejor: number | null = null;
  for (const linea of LINEAS_GANADORAS) {
    let completa = true;
    let maxSub = 0;
    for (const indice of linea) {
      const clasica = estado.tablero[indice].clasica;
      if (clasica === null || clasica.jugador !== jugador) {
        completa = false;
        break;
      }
      if (clasica.jugada > maxSub) maxSub = clasica.jugada;
    }
    if (completa && (mejor === null || maxSub < mejor)) mejor = maxSub;
  }
  return mejor;
}

// ¿El jugador tiene 3 fichas colapsadas seguidas?
export function hayTresEnRaya(estado: Estado, jugador: Jugador): boolean {
  return mejorMaxSubindice(estado, jugador) !== null;
}

export function partidaTerminada(estado: Estado): boolean {
  return estado.fase === "terminado";
}

// ---------------------------------------------------------------------------
// DETECCIÓN DE CICLO
// El estado nunca guarda ciclos: cada ciclo se resuelve antes de seguir, así
// que las jugadas pendientes forman siempre un bosque. Por eso alcanza con
// unir los extremos de cada jugada y ver si las dos casillas nuevas ya estaban
// conectadas (ahí se cierra el ciclo).
function creariaCiclo(estado: Estado, a: number, b: number): boolean {
  const padre = new Map<number, number>();

  const encontrar = (x: number): number => {
    let raiz = x;
    while (padre.get(raiz) !== raiz) raiz = padre.get(raiz) as number;
    while (padre.get(x) !== raiz) {
      const siguiente = padre.get(x) as number;
      padre.set(x, raiz);
      x = siguiente;
    }
    return raiz;
  };

  const unir = (x: number, y: number): void => {
    const rx = encontrar(x);
    const ry = encontrar(y);
    if (rx !== ry) padre.set(rx, ry);
  };

  const nodos = new Set<number>([a, b]);
  for (const mov of estado.jugadas) {
    if (mov.resuelto) continue;
    nodos.add(mov.casillas[0]);
    nodos.add(mov.casillas[1]);
  }
  for (const nodo of nodos) padre.set(nodo, nodo);
  for (const mov of estado.jugadas) {
    if (mov.resuelto) continue;
    unir(mov.casillas[0], mov.casillas[1]);
  }
  return encontrar(a) === encontrar(b);
}

// ---------------------------------------------------------------------------
// JUGAR — colocar una jugada cuántica en dos casillas distintas.
export function colocarJugadaCuantica(estado: Estado, a: number, b: number): boolean {
  if (!puedeColocar(estado, a, b)) return false;

  const hayCiclo = creariaCiclo(estado, a, b);
  const jugada = estado.movimientosCuanticos + 1;
  const jugador = estado.turno;

  estado.jugadas.push({
    jugada,
    jugador,
    casillas: [a, b],
    resuelto: false,
    casillaFinal: null,
  });
  estado.tablero[a].cuanticas.push({ jugador, jugada });
  estado.tablero[b].cuanticas.push({ jugador, jugada });
  estado.movimientosCuanticos = jugada;

  if (hayCiclo) {
    // RESOLUCIÓN DE COLAPSO: decide el contrario al que movió.
    estado.fase = "colapso";
    estado.colapso = { jugada, casillas: [a, b], jugadorMarca: jugador };
    estado.turno = contrario(jugador);
    return true;
  }

  estado.turno = contrario(jugador);
  return true;
}

// ---------------------------------------------------------------------------
// COLAPSAR — propagación por restricciones.
// Devuelve la asignación casilla -> jugada, o null si hubiera un conflicto
// (imposible en un componente con exactamente un ciclo, pero se contempla).
function asignarColapso(
  estado: Estado,
  jugadaDisparadora: number,
  casillaElegida: number
): Map<number, number> | null {
  const asignacion = new Map<number, number>(); // casilla -> jugada
  const usados = new Set<number>(); // jugadas ya asignadas
  const cola: number[] = [];

  const ocupar = (casilla: number, jugada: number): boolean => {
    if (asignacion.has(casilla)) return false;
    asignacion.set(casilla, jugada);
    usados.add(jugada);
    cola.push(casilla);
    return true;
  };

  if (!ocupar(casillaElegida, jugadaDisparadora)) return null;

  while (cola.length > 0) {
    const casilla = cola.shift() as number;
    for (const ficha of estado.tablero[casilla].cuanticas) {
      if (usados.has(ficha.jugada)) continue; // ya resuelta en otra casilla
      const mov = estado.jugadas.find((m) => m.jugada === ficha.jugada);
      if (!mov) continue;
      // La jugada queda forzada a su OTRA casilla.
      const destino = mov.casillas[0] === casilla ? mov.casillas[1] : mov.casillas[0];
      if (!ocupar(destino, ficha.jugada)) return null;
    }
  }
  return asignacion;
}

// Verifica fin de partida y actualiza ganador/empate/fase.
function verificarFin(estado: Estado): void {
  const maxX = mejorMaxSubindice(estado, "X");
  const maxO = mejorMaxSubindice(estado, "O");

  if (maxX !== null || maxO !== null) {
    if (maxX !== null && maxO !== null) {
      // Ambas líneas en el mismo colapso: gana la formada antes (menor subíndice).
      estado.ganador = maxX <= maxO ? "X" : "O";
    } else {
      estado.ganador = maxX !== null ? "X" : "O";
    }
    estado.empate = false;
    estado.fase = "terminado";
    return;
  }

  // Sin ganador: empate si no quedan al menos 2 casillas para marcar
  // (tablero lleno, o una sola casilla abierta sin jugada legal posible).
  if (casillasAbiertas(estado).length < CONFIG.FICHAS_POR_JUGADA) {
    estado.empate = true;
    estado.fase = "terminado";
  }
}

// Resuelve el colapso eligiendo una de las dos casillas de la jugada que creó
// el ciclo. Colapsa en cadena toda la red entrelazada.
export function resolverColapso(estado: Estado, casillaElegida: number): boolean {
  if (estado.fase !== "colapso" || estado.colapso === null) return false;
  const { jugada, casillas, jugadorMarca } = estado.colapso;
  if (casillaElegida !== casillas[0] && casillaElegida !== casillas[1]) return false;

  const asignacion = asignarColapso(estado, jugada, casillaElegida);
  if (asignacion === null) return false;

  for (const [casilla, numeroJugada] of asignacion) {
    const mov = estado.jugadas.find((m) => m.jugada === numeroJugada);
    const celda = estado.tablero[casilla];
    celda.clasica = { jugador: mov ? mov.jugador : jugadorMarca, jugada: numeroJugada };
    celda.cuanticas = [];
    if (mov) {
      mov.resuelto = true;
      mov.casillaFinal = casilla;
    }
  }

  estado.colapso = null;
  estado.fase = "cuantica";
  verificarFin(estado);
  return true;
}
