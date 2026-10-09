import { describe, it, expect } from "vitest";
import {
  CONFIG,
  crearPartida,
  colocarJugadaCuantica,
  resolverColapso,
  reiniciarPartida,
  casillasAbiertas,
  esCasillaJugable,
  hayTresEnRaya,
  partidaTerminada,
  indiceDe,
} from "../src/logica.ts";
import type { Estado } from "../src/logica.ts";

// Guion de partida: "J" = jugada cuántica (dos índices), "C" = resolver colapso (un índice).
type Op = ["J", number, number] | ["C", number];

// Partida que gana X formando una línea clásica tras resolver dos ciclos.
const PARTIDA_GANA_X: Op[] = [
  ["J", 2, 3], ["J", 4, 6], ["J", 0, 3], ["J", 6, 5], ["J", 0, 5], ["J", 2, 3],
  ["C", 3], ["J", 8, 1], ["J", 8, 1], ["C", 8],
];

// Partida que termina en empate con el tablero lleno.
const PARTIDA_EMPATE: Op[] = [
  ["J", 2, 8], ["J", 5, 8], ["J", 0, 7], ["J", 3, 0], ["J", 0, 8], ["J", 8, 4],
  ["J", 4, 5], ["C", 5], ["J", 6, 1], ["J", 1, 6], ["C", 6],
];

// Juega un guion completo y devuelve el estado final y cuántos colapsos ocurrieron.
function jugar(ops: Op[]): { estado: Estado; colapsos: number } {
  const estado = crearPartida();
  let colapsos = 0;
  for (const op of ops) {
    if (op[0] === "J") {
      expect(colocarJugadaCuantica(estado, op[1], op[2])).toBe(true);
      if (estado.fase === "colapso") colapsos++;
    } else {
      expect(estado.fase).toBe("colapso");
      expect(resolverColapso(estado, op[1])).toBe(true);
    }
  }
  return { estado, colapsos };
}

describe("Tres en Raya Cuántico - lógica pura", () => {
  it("El estado inicial arranca vacío, con X por jugar y sin colapso pendiente", () => {
    const e = crearPartida();
    expect(e.tablero.length).toBe(CONFIG.FILAS * CONFIG.COLUMNAS);
    for (const c of e.tablero) {
      expect(c.clasica).toBeNull();
      expect(c.cuanticas.length).toBe(0);
    }
    expect(e.turno).toBe("X");
    expect(e.fase).toBe("cuantica");
    expect(e.ganador).toBeNull();
    expect(e.empate).toBe(false);
    expect(e.movimientosCuanticos).toBe(0);
    expect(e.colapso).toBeNull();
    expect(casillasAbiertas(e).length).toBe(9);
    expect(partidaTerminada(e)).toBe(false);
    expect(indiceDe(0, 0)).toBe(0);
    expect(indiceDe(1, 2)).toBe(5);
    expect(indiceDe(2, 2)).toBe(8);
  });

  it("Una jugada válida con dos índices distintos coloca las dos fichas y cambia el turno", () => {
    const e = crearPartida();
    expect(esCasillaJugable(e, 0)).toBe(true);
    expect(colocarJugadaCuantica(e, 0, 1)).toBe(true);
    expect(e.movimientosCuanticos).toBe(1);
    expect(e.turno).toBe("O");
    expect(e.tablero[0].cuanticas.length).toBe(1);
    expect(e.tablero[0].cuanticas[0].jugador).toBe("X");
    expect(e.tablero[1].cuanticas[0].jugador).toBe("X");
    // una casilla con fichas cuánticas pero sin clásica sigue siendo jugable
    expect(esCasillaJugable(e, 0)).toBe(true);
    expect(colocarJugadaCuantica(e, 2, 3)).toBe(true);
    expect(e.movimientosCuanticos).toBe(2);
    expect(e.turno).toBe("X");
  });

  it("Una jugada inválida devuelve false y no modifica la partida", () => {
    const e = crearPartida();
    expect(colocarJugadaCuantica(e, 4, 4)).toBe(false); // misma casilla
    expect(colocarJugadaCuantica(e, -1, 2)).toBe(false); // fuera de rango
    expect(colocarJugadaCuantica(e, 0, 9)).toBe(false); // fuera de rango
    expect(colocarJugadaCuantica(e, 1.5, 3)).toBe(false); // no es entero
    expect(e.movimientosCuanticos).toBe(0);
    expect(e.turno).toBe("X");
  });

  it("No se puede jugar durante el colapso ni sobre una casilla ya colapsada", () => {
    const e = crearPartida();
    // Ejemplo clásico de la Wikipedia: X(0,1) O(1,4) X(4,8) O(4,0) cierra el ciclo.
    colocarJugadaCuantica(e, 0, 1);
    colocarJugadaCuantica(e, 1, 4);
    colocarJugadaCuantica(e, 4, 8);
    expect(colocarJugadaCuantica(e, 4, 0)).toBe(true);
    expect(e.fase).toBe("colapso");
    expect(e.colapso?.casillas).toEqual([4, 0]);
    // en fase de colapso no se aceptan jugadas
    expect(colocarJugadaCuantica(e, 2, 3)).toBe(false);
    // el que resuelve es el contrario al que movió (movió O, resuelve X)
    expect(e.turno).toBe("X");
    expect(resolverColapso(e, 4)).toBe(true);
    expect(e.fase).toBe("cuantica");
    expect(esCasillaJugable(e, 4)).toBe(false);
    expect(colocarJugadaCuantica(e, 4, 2)).toBe(false);
  });

  it("La partida termina con 3 en raya clásicas o en empate", () => {
    const gana = jugar(PARTIDA_GANA_X);
    expect(partidaTerminada(gana.estado)).toBe(true);
    expect(gana.estado.ganador).toBe("X");
    expect(gana.estado.empate).toBe(false);
    expect(hayTresEnRaya(gana.estado, "X")).toBe(true);
    expect(hayTresEnRaya(gana.estado, "O")).toBe(false);

    const empate = jugar(PARTIDA_EMPATE);
    expect(partidaTerminada(empate.estado)).toBe(true);
    expect(empate.estado.ganador).toBeNull();
    expect(empate.estado.empate).toBe(true);
    expect(hayTresEnRaya(empate.estado, "X")).toBe(false);
    expect(hayTresEnRaya(empate.estado, "O")).toBe(false);
    expect(casillasAbiertas(empate.estado).length).toBe(0);
  });

  it("Un recorrido completo resuelve los ciclos en cadena y llega al final con ganador", () => {
    const e = crearPartida();
    let colapsos = 0;
    for (const op of PARTIDA_GANA_X) {
      if (op[0] === "J") {
        expect(colocarJugadaCuantica(e, op[1], op[2])).toBe(true);
        if (e.fase === "colapso") {
          colapsos++;
          expect(e.colapso?.casillas.length).toBe(2);
        }
      } else {
        expect(e.fase).toBe("colapso");
        expect(resolverColapso(e, op[1])).toBe(true);
        // al colapsar aparecen fichas clásicas
        expect(e.tablero.some((c) => c.clasica !== null)).toBe(true);
      }
    }
    expect(colapsos).toBe(2);
    expect(e.fase).toBe("terminado");
    expect(partidaTerminada(e)).toBe(true);
    expect(e.ganador).toBe("X");
    expect(e.empate).toBe(false);
    expect(hayTresEnRaya(e, "X")).toBe(true);
    // la línea ganadora de X está formada por fichas clásicas
    const clasicasX = e.tablero.filter((c) => c.clasica?.jugador === "X").length;
    expect(clasicasX).toBeGreaterThanOrEqual(CONFIG.META_ALINEACION);
  });

  it("Reiniciar deja la partida como recién empezada", () => {
    const e = crearPartida();
    colocarJugadaCuantica(e, 0, 1);
    colocarJugadaCuantica(e, 2, 3);
    expect(reiniciarPartida(e)).toBe(true);
    expect(e.movimientosCuanticos).toBe(0);
    expect(e.fase).toBe("cuantica");
    expect(e.turno).toBe("X");
    expect(e.colapso).toBeNull();
    expect(casillasAbiertas(e).length).toBe(9);
  });
});
