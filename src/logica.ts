// src/logica.ts â€” Tres en Raya CuÃ¡ntico (lÃ³gica pura)
// Solo datos y funciones sobre el estado. No toca pantalla.

import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// CONFIGURACIÃ“N (todos los nÃºmeros juntos, con unidad)
export const CONFIG = {
  FILAS: 3, // casillas en filas
  COLUMNAS: 3, // casillas en columnas
  JUGADOR_X: "X" as const, // sÃ­mbolo jugador X
  JUGADOR_O: "O" as const, // sÃ­mbolo jugador O
  META_ALINEACION: 3, // fichas alineadas para ganar
} as const;

export type Jugador = typeof CONFIG.JUGADOR_X | typeof CONFIG.JUGADOR_O;
export type Fase = "cuantica" | "colapsando" | "terminado";
export type Marca = Jugador | null; // ficha colapsada visible

export interface Casilla {
  fila: number; // 0-2
  columna: number; // 0-2
  colapsada: boolean; // si ya tiene ficha definitiva
  marca: Marca; // X, O o null si vacÃ­a
  superposicion: Set<string>; // ids "X" o "O" que esperan colapso
}

export interface Estado {
  tablero: Casilla[][]; // 3x3
  turno: Jugador; // quiÃ©n coloca jugada cuÃ¡ntica ahora
  fase: Fase;
  semilla: string; // semilla usada para crear partida
  ganador: Marca;
  empate: boolean;
  movimientosCuanticos: number;
  jugadasPendientes: number; // cuÃ¡ntas selecciones faltan en fase cuÃ¡ntica (2 por turno)
  primerSeleccion: { fila: number; col: number } | null;
  historial: string[]; // registro simplificado
}

// ---------------------------------------------------------------------------
// GENERADOR CON SEMILLA (determinista)
export function crearRng(semilla: number | string): () => number {
  let a = typeof semilla === "number" ? (semilla >>> 0) : hashToUint(semilla);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashToUint(s: string): number {
  const h = createHash("sha256").update(s).digest();
  return h.readUInt32BE(0);
}

// ---------------------------------------------------------------------------
// CREAR PARTIDA
export function crearPartida(semilla: string = new Date().toISOString()): Estado {
  const tablero: Casilla[][] = Array.from({ length: CONFIG.FILAS }, (_, f) =>
    Array.from({ length: CONFIG.COLUMNAS }, (_, c) => ({
      fila: f,
      columna: c,
      colapsada: false,
      marca: null,
      superposicion: new Set<string>(),
    }))
  );
  return {
    tablero,
    turno: CONFIG.JUGADOR_X,
    fase: "cuantica",
    semilla,
    ganador: null,
    empate: false,
    movimientosCuanticos: 0,
    jugadasPendientes: 2,
    primerSeleccion: null,
    historial: ["partida_creada"],
  };
}

// ---------------------------------------------------------------------------
// AUXILIARES
function casilla(estado: Estado, f: number, c: number): Casilla | null {
  if (f < 0 || f >= CONFIG.FILAS || c < 0 || c >= CONFIG.COLUMNAS) return null;
  return estado.tablero[f][c];
}

function tableroLlenoColapsado(estado: Estado): boolean {
  for (const fila of estado.tablero) {
    for (const cel of fila) {
      if (!cel.colapsada) return false;
    }
  }
  return true;
}

function hayAlineacion(estado: Estado, jugador: Jugador): boolean {
  const g = CONFIG.META_ALINEACION;
  // filas
  for (let f = 0; f < CONFIG.FILAS; f++) {
    let cnt = 0;
    for (let c = 0; c < CONFIG.COLUMNAS; c++) {
      if (estado.tablero[f][c].colapsada && estado.tablero[f][c].marca === jugador) cnt++;
      else cnt = 0;
      if (cnt >= g) return true;
    }
  }
  // columnas
  for (let c = 0; c < CONFIG.COLUMNAS; c++) {
    let cnt = 0;
    for (let f = 0; f < CONFIG.FILAS; f++) {
      if (estado.tablero[f][c].colapsada && estado.tablero[f][c].marca === jugador) cnt++;
      else cnt = 0;
      if (cnt >= g) return true;
    }
  }
  // diagonales principales
  // diag1
  for (let f = 0; f <= CONFIG.FILAS - g; f++) {
    for (let c = 0; c <= CONFIG.COLUMNAS - g; c++) {
      let ok = true;
      for (let k = 0; k < g; k++) {
        if (!(estado.tablero[f + k][c + k].colapsada && estado.tablero[f + k][c + k].marca === jugador)) { ok = false; break; }
      }
      if (ok) return true;
    }
  }
  // diag2
  for (let f = 0; f <= CONFIG.FILAS - g; f++) {
    for (let c = g - 1; c < CONFIG.COLUMNAS; c++) {
      let ok = true;
      for (let k = 0; k < g; k++) {
        if (!(estado.tablero[f + k][c - k].colapsada && estado.tablero[f + k][c - k].marca === jugador)) { ok = false; break; }
      }
      if (ok) return true;
    }
  }
  return false;
}

function actualizarEstadoFinal(estado: Estado) {
  if (estado.ganador) {
    estado.fase = "terminado";
    estado.empate = false;
    return;
  }
  if (tableroLlenoColapsado(estado)) {
    estado.fase = "terminado";
    estado.empate = true;
    estado.ganador = null;
  }
}

// ---------------------------------------------------------------------------
// ACCIONES (cada una devuelve true si vÃ¡lida)
export function seleccionarCasilla(estado: Estado, fila: number, col: number): boolean {
  if (estado.fase !== "cuantica") return false;
  const cel = casilla(estado, fila, col);
  if (!cel) return false;
  if (cel.colapsada) return false;

  if (estado.jugadasPendientes === 2) {
    // primera selecciÃ³n
    cel.superposicion.add(estado.turno);
    estado.primerSeleccion = { fila, col };
    estado.jugadasPendientes = 1;
    estado.historial.push(`sel1:${fila},${col}:${estado.turno}`);
    return true;
  }
  if (estado.jugadasPendientes === 1) {
    // segunda selecciÃ³n distinta
    if (estado.primerSeleccion && estado.primerSeleccion.fila === fila && estado.primerSeleccion.col === col) return false;
    cel.superposicion.add(estado.turno);
    estado.jugadasPendientes = 0;
    estado.historial.push(`sel2:${fila},${col}:${estado.turno}`);
    // completar jugada cuÃ¡ntica del turno
    estado.movimientosCuanticos += 1;
    // colapsar si corresponde (conflicto: misma casilla recibe ambos o alineaciÃ³n posible)
    colapsarSiCorresponde(estado);
    // pasar turno si no terminÃ³
    if (estado.fase === "cuantica") {
      estado.turno = estado.turno === CONFIG.JUGADOR_X ? CONFIG.JUGADOR_O : CONFIG.JUGADOR_X;
      estado.primerSeleccion = null;
      estado.jugadasPendientes = 2;
    } else if (estado.fase === "colapsando") {
      // tras colapso, revisar final
      actualizarEstadoFinal(estado);
      if (estado.fase !== "terminado") {
        estado.fase = "cuantica";
        estado.turno = estado.turno === CONFIG.JUGADOR_X ? CONFIG.JUGADOR_O : CONFIG.JUGADOR_X;
        estado.primerSeleccion = null;
        estado.jugadasPendientes = 2;
      }
    }
    return true;
  }
  return false;
}

// Colapsa de forma determinista cuando hay superposiciones que generan conflicto
export function colapsarSiCorresponde(estado: Estado): boolean {
  if (estado.fase === "terminado") return false;
  // Colapsar: para cada casilla con superposiciÃ³n >=1 que aÃºn no colapsada, resolvemos
  // Regla simplificada: si una casilla tiene 2 jugadores distintos -> colapsar a uno segÃºn turno? Pero mÃ¡s justo: elegimos por hash de semilla+posiciÃ³n
  // Para mantener determinismo usamos crearRng con semilla + movimientosCuanticos
  const rng = crearRng(estado.semilla + ":" + estado.movimientosCuanticos);
  let hubo = false;
  for (let f = 0; f < CONFIG.FILAS; f++) {
    for (let c = 0; c < CONFIG.COLUMNAS; c++) {
      const cel = estado.tablero[f][c];
      if (cel.colapsada) continue;
      if (cel.superposicion.size === 0) continue;
      // colapsar: si ambos -> elegir aleatorio determinista entre X,O
      if (cel.superposicion.size >= 2) {
        const arr = Array.from(cel.superposicion);
        const el = arr[Math.floor(rng() * arr.length)] as Jugador;
        cel.marca = el;
        cel.colapsada = true;
        cel.superposicion.clear();
        estado.historial.push(`colapso:${f},${c}->${el}`);
        hubo = true;
        continue;
      }
      // size === 1
      const [j] = Array.from(cel.superposicion) as Jugador[];
      // colapsar inmediatamente si estÃ¡ sola (no genera conflicto aÃºn) pero para efecto cuÃ¡ntico: colapsamos
      cel.marca = j;
      cel.colapsada = true;
      cel.superposicion.clear();
      estado.historial.push(`colapso1:${f},${c}->${j}`);
      hubo = true;
    }
  }
  if (hubo) {
    estado.fase = "colapsando";
    // revisar victoria
    if (hayAlineacion(estado, CONFIG.JUGADOR_X)) estado.ganador = CONFIG.JUGADOR_X;
    if (hayAlineacion(estado, CONFIG.JUGADOR_O)) {
      // si ambos alinean al mismo tiempo (improbable) gana quien acaba de mover? pero regla clara: hay ganador
      estado.ganador = estado.ganador === CONFIG.JUGADOR_X ? CONFIG.JUGADOR_X : CONFIG.JUGADOR_O;
    }
    actualizarEstadoFinal(estado);
  }
  return hubo;
}

// Reiniciar partida con misma o nueva semilla
export function reiniciarPartida(estado: Estado, semilla?: string): boolean {
  const nuevaSemilla = semilla ?? estado.semilla + ":r";
  const nuevo = crearPartida(nuevaSemilla);
  Object.assign(estado, nuevo);
  return true;
}

// Consultas
export function puedeSeleccionar(estado: Estado, f: number, c: number): boolean {
  return estado.fase === "cuantica" && casilla(estado, f, c)?.colapsada === false;
}



