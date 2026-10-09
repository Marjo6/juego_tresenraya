// src/main.ts
// Punto de arranque del proyecto. La interfaz se construye en el bloque 3.
// Por ahora solo dejamos montado el contenedor para que el proyecto compile.

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.textContent = 'Tres en Raya Cuántico — proyecto creado';
}
