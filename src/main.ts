// src/main.ts
// Pantalla del Tres en Raya Cuántico. Toda la lógica vive en src/logica.ts.
import {
  CONFIG,
  crearPartida,
  colocarJugadaCuantica,
  resolverColapso,
  reiniciarPartida,
  esCasillaJugable,
  partidaTerminada,
  type Estado,
} from "./logica.ts";
import "./estilos.css";

function requerir<T extends Element>(selector: string): T {
  const elemento = document.querySelector<T>(selector);
  if (!elemento) {
    throw new Error(`No se encontró el elemento ${selector}`);
  }
  return elemento;
}

const contenedor = requerir<HTMLDivElement>("#app");

const LINEAS_GANADORAS: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

contenedor.innerHTML = `
  <main class="juego">
    <h1 class="titulo">Tres en Raya Cuántico</h1>

    <section class="estado" aria-label="Estado de la partida">
      <p class="turno" id="turno"></p>
      <p class="fase" id="fase"></p>
    </section>

    <section class="tablero" id="tablero" role="grid" aria-label="Tablero de 3 por 3"></section>

    <p class="mensaje" id="mensaje" role="status" aria-live="polite"></p>

    <section class="pie">
      <span class="contador" id="contador"></span>
      <button class="reiniciar" id="reiniciar" type="button">Reiniciar partida</button>
    </section>

    <ul class="leyenda" aria-label="Referencias de color">
      <li><span class="punto x"></span>X</li>
      <li><span class="punto o"></span>O</li>
      <li><span class="punto super"></span>Superposición</li>
      <li><span class="punto victoria"></span>Victoria</li>
      <li><span class="punto empate"></span>Empate</li>
    </ul>
  </main>
`;

const turnoEl = requerir<HTMLParagraphElement>("#turno");
const faseEl = requerir<HTMLParagraphElement>("#fase");
const tableroEl = requerir<HTMLElement>("#tablero");
const mensajeEl = requerir<HTMLParagraphElement>("#mensaje");
const contadorEl = requerir<HTMLSpanElement>("#contador");
const reiniciarEl = requerir<HTMLButtonElement>("#reiniciar");

const estado: Estado = crearPartida();
let primeraSeleccion: number | null = null;
let foco = 0;

const botones: HTMLButtonElement[] = [];
const total = CONFIG.FILAS * CONFIG.COLUMNAS;

for (let i = 0; i < total; i++) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "casilla";
  boton.setAttribute("role", "gridcell");
  boton.addEventListener("click", () => activar(i));
  boton.addEventListener("keydown", (evento) => manejarTecla(evento, i));
  tableroEl.appendChild(boton);
  botones.push(boton);
}

function activar(indice: number): void {
  foco = indice;
  if (partidaTerminada(estado)) {
    render();
    return;
  }

  if (estado.fase === "cuantica") {
    if (!esCasillaJugable(estado, indice)) {
      render();
      return;
    }
    if (primeraSeleccion === null) {
      primeraSeleccion = indice;
    } else if (primeraSeleccion === indice) {
      primeraSeleccion = null;
    } else {
      const primera = primeraSeleccion;
      if (colocarJugadaCuantica(estado, primera, indice)) {
        primeraSeleccion = null;
      } else {
        primeraSeleccion = indice;
      }
    }
  } else if (estado.fase === "colapso" && estado.colapso) {
    const opciones = estado.colapso.casillas;
    if (indice === opciones[0] || indice === opciones[1]) {
      resolverColapso(estado, indice);
    }
  }

  render();
}

function manejarTecla(evento: KeyboardEvent, indice: number): void {
  if (evento.key === "Enter" || evento.key === " " || evento.key === "Spacebar") {
    evento.preventDefault();
    activar(indice);
    return;
  }
  const paso: Record<string, [number, number]> = {
    ArrowRight: [0, 1],
    ArrowLeft: [0, -1],
    ArrowDown: [1, 0],
    ArrowUp: [-1, 0],
  };
  const movimiento = paso[evento.key];
  if (movimiento) {
    evento.preventDefault();
    moverFoco(movimiento[0], movimiento[1]);
  }
}

function moverFoco(deltaFila: number, deltaColumna: number): void {
  const fila = Math.floor(foco / CONFIG.COLUMNAS);
  const columna = foco % CONFIG.COLUMNAS;
  const nuevaFila = (fila + deltaFila + CONFIG.FILAS) % CONFIG.FILAS;
  const nuevaColumna = (columna + deltaColumna + CONFIG.COLUMNAS) % CONFIG.COLUMNAS;
  foco = nuevaFila * CONFIG.COLUMNAS + nuevaColumna;
  render();
  botones[foco].focus();
}

function textoFase(): string {
  if (estado.fase === "cuantica") return "Colocando (fase cuántica)";
  if (estado.fase === "colapso") return "Resolviendo colapso";
  return "Terminado";
}

function textoMensaje(): string {
  if (estado.fase === "terminado") {
    if (estado.ganador) return `¡Ganó el Jugador ${estado.ganador}!`;
    return "Empate: no quedan jugadas posibles.";
  }
  if (estado.fase === "colapso") {
    return `¡Ciclo! Jugador ${estado.turno}: elegí en qué casilla resaltada colapsa la jugada.`;
  }
  if (primeraSeleccion === null) {
    return `Jugador ${estado.turno}: tocá la primera casilla.`;
  }
  return `Jugador ${estado.turno}: tocá la segunda casilla (distinta).`;
}

function claseMensaje(): string {
  if (estado.fase === "terminado") return estado.ganador ? "ganador" : "empate";
  if (estado.fase === "colapso") return "colapso";
  return "";
}

function lineaGanadora(): number[] {
  if (!estado.ganador) return [];
  for (const linea of LINEAS_GANADORAS) {
    if (linea.every((i) => estado.tablero[i].clasica?.jugador === estado.ganador)) {
      return linea;
    }
  }
  return [];
}

function etiquetaCasilla(indice: number): string {
  const celda = estado.tablero[indice];
  const numero = indice + 1;
  if (celda.clasica) {
    return `Casilla ${numero}: ${celda.clasica.jugador} colapsada`;
  }
  if (celda.cuanticas.length > 0) {
    const fichas = celda.cuanticas.map((f) => `${f.jugador}${f.jugada}`).join(", ");
    return `Casilla ${numero}: superposición ${fichas}`;
  }
  return `Casilla ${numero}: vacía`;
}

function pintarCasilla(indice: number, esGanadora: boolean): void {
  const celda = estado.tablero[indice];
  const boton = botones[indice];
  boton.className = "casilla";
  boton.replaceChildren();

  let accionable = false;
  if (estado.fase === "cuantica") {
    accionable = esCasillaJugable(estado, indice);
  } else if (estado.fase === "colapso" && estado.colapso) {
    accionable =
      indice === estado.colapso.casillas[0] || indice === estado.colapso.casillas[1];
  }
  boton.setAttribute("aria-disabled", accionable ? "false" : "true");

  if (celda.clasica) {
    boton.classList.add("colapsada", celda.clasica.jugador === "X" ? "de-x" : "de-o");
    const marca = document.createElement("span");
    marca.className = "marca-clasica";
    marca.textContent = celda.clasica.jugador;
    boton.appendChild(marca);
  } else {
    boton.classList.add("abierta");
    if (celda.cuanticas.length > 0) {
      boton.classList.add("superpuesta");
    }
    for (const ficha of celda.cuanticas) {
      const chip = document.createElement("span");
      chip.className = "chip " + (ficha.jugador === "X" ? "de-x" : "de-o");
      chip.appendChild(document.createTextNode(ficha.jugador));
      const sub = document.createElement("sub");
      sub.textContent = String(ficha.jugada);
      chip.appendChild(sub);
      boton.appendChild(chip);
    }
    if (estado.fase === "cuantica" && primeraSeleccion === indice) {
      boton.classList.add("seleccionada");
    }
    if (
      estado.fase === "colapso" &&
      estado.colapso &&
      (indice === estado.colapso.casillas[0] || indice === estado.colapso.casillas[1])
    ) {
      boton.classList.add("opcion-colapso");
    }
  }

  if (esGanadora) {
    boton.classList.add("ganadora");
  }
  boton.setAttribute("aria-label", etiquetaCasilla(indice));
}

function render(): void {
  const terminado = partidaTerminada(estado);

  turnoEl.textContent = terminado ? "Partida terminada" : `Turno: Jugador ${estado.turno}`;
  turnoEl.className = "turno";
  if (!terminado) {
    turnoEl.classList.add(estado.turno === "X" ? "de-x" : "de-o");
  }

  faseEl.textContent = textoFase();
  contadorEl.textContent = `Movimientos cuánticos: ${estado.movimientosCuanticos}`;
  mensajeEl.textContent = textoMensaje();
  mensajeEl.className = "mensaje " + claseMensaje();

  const ganadoras = lineaGanadora();
  for (let i = 0; i < total; i++) {
    pintarCasilla(i, ganadoras.includes(i));
    botones[i].tabIndex = i === foco ? 0 : -1;
  }
}

reiniciarEl.addEventListener("click", () => {
  reiniciarPartida(estado);
  primeraSeleccion = null;
  foco = 0;
  render();
  botones[0].focus();
});

render();
