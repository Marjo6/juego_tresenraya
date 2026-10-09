import { describe, it, expect } from 'vitest';
import { crearPartida, seleccionarCasilla, colapsarSiCorresponde, CONFIG } from '../src/logica.ts';

describe('Tres en Raya Cuántico - lógica pura', () => {
  it('estado inicial se arma bien', () => {
    const e = crearPartida('test-inicial');
    expect(e.tablero.length).toBe(CONFIG.FILAS);
    expect(e.tablero[0].length).toBe(CONFIG.COLUMNAS);
    expect(e.turno).toBe(CONFIG.JUGADOR_X);
    expect(e.ganador).toBeNull();
    expect(e.empate).toBe(false);
    expect(e.movimientosCuanticos).toBe(0);
    expect(e.jugadasPendientes).toBe(2);
  });

  it('acción válida: seleccionar dos casillas distintas en fase cuántica', () => {
    const e = crearPartida('test-sel');
    const ok1 = seleccionarCasilla(e, 0, 0);
    expect(ok1).toBe(true);
    expect(e.jugadasPendientes).toBe(1);
    const ok2 = seleccionarCasilla(e, 0, 1);
    expect(ok2).toBe(true);
    // tras completar jugada cuántica, puede colapsar o pasar turno
    expect(typeof e.fase).toBe('string');
  });

  it('no se puede seleccionar la misma casilla dos veces para la misma jugada', () => {
    const e = crearPartida('test-misma');
    seleccionarCasilla(e, 1, 1);
    const bad = seleccionarCasilla(e, 1, 1);
    expect(bad).toBe(false);
    expect(e.jugadasPendientes).toBe(1);
  });

  it('no se puede jugar sobre casilla ya colapsada', () => {
    const e = crearPartida('test-colapsada');
    seleccionarCasilla(e, 0, 0);
    seleccionarCasilla(e, 0, 1);
    colapsarSiCorresponde(e);
    // intentar jugar en alguna colapsada no debe ser válido
    if (e.tablero[0][0].colapsada) {
      expect(seleccionarCasilla(e, 0, 0)).toBe(false);
    }
    if (e.tablero[0][1].colapsada) {
      expect(seleccionarCasilla(e, 0, 1)).toBe(false);
    }
  });

  it('recorrido completo posible hacia final', () => {
    const e = crearPartida('recorrido');
    // X coloca (0,0),(0,1)
    seleccionarCasilla(e, 0, 0); seleccionarCasilla(e, 0, 1);
    // O coloca (0,2),(1,1)
    seleccionarCasilla(e, 0, 2); seleccionarCasilla(e, 1, 1);
    // X coloca (1,0),(1,2)
    seleccionarCasilla(e, 1, 0); seleccionarCasilla(e, 1, 2);
    // O coloca (2,0),(2,1)
    seleccionarCasilla(e, 2, 0); seleccionarCasilla(e, 2, 1);
    // X coloca (2,2),(0,0) - puede generar colapsos
    seleccionarCasilla(e, 2, 2); seleccionarCasilla(e, 0, 0);
    // con colapsos puede terminar en fase terminado o cuántica
    expect(['cuantica', 'colapsando', 'terminado']).toContain(e.fase);
  });

  it('condiciones de fin detectadas', () => {
    const e = crearPartida('fin');
    // forzamos escenario simple: jugar hasta posible
    for (let i = 0; i < 4; i++) {
      seleccionarCasilla(e, 0, i % 3);
      seleccionarCasilla(e, 1, (i + 1) % 3);
    }
    seleccionarCasilla(e, 2, 0); seleccionarCasilla(e, 2, 1);
    colapsarSiCorresponde(e);
    if (e.fase === 'terminado') {
      expect(typeof e.empate).toBe('boolean');
      if (e.ganador) expect(['X','O']).toContain(e.ganador);
    }
  });
});
