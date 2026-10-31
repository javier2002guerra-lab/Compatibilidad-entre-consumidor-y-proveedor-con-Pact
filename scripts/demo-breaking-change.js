/**
 * Demostración reproducible de ruptura del contrato:
 *   1. Aplica breaking-change/price-as-string.patch (price: number -> string).
 *   2. Ejecuta la verificación del proveedor: se ESPERA que falle.
 *   3. Revierte el parche SIEMPRE (también si algo falla o se interrumpe).
 *   4. Repite la verificación: se ESPERA que pase.
 * Termina con código 0 solo si Pact detectó la ruptura y la versión restaurada es compatible.
 */
const { spawnSync } = require('child_process');

const PATCH = 'breaking-change/price-as-string.patch';
const run = (cmd) => spawnSync(cmd, { stdio: 'inherit', shell: true }).status;
const banner = (text) => console.log(`\n========== ${text} ==========\n`);

let applied = false;
const revert = () => {
  if (applied) {
    run(`git apply -R ${PATCH}`);
    applied = false;
    banner('Parche revertido: proveedor restaurado');
  }
};
process.on('SIGINT', () => { revert(); process.exit(130); });

let brokenStatus;
try {
  banner('1) Aplicando cambio incompatible (price como string)');
  if (run(`git apply ${PATCH}`) !== 0) throw new Error('No se pudo aplicar el parche');
  applied = true;
  run('git --no-pager diff --stat -- src/provider/app.ts');

  banner('2) Verificación con el proveedor ROTO (se espera FALLO)');
  brokenStatus = run('npx jest test/provider');
} finally {
  revert();
}

banner('3) Verificación con el proveedor RESTAURADO (se espera ÉXITO)');
const fixedStatus = run('npx jest test/provider');

banner('Resumen');
console.log(`Proveedor roto      -> ${brokenStatus !== 0 ? 'FALLÓ (ruptura detectada por Pact)' : 'PASÓ (¡la ruptura NO se detectó!)'}`);
console.log(`Proveedor corregido -> ${fixedStatus === 0 ? 'PASÓ' : 'FALLÓ'}`);
process.exit(brokenStatus !== 0 && fixedStatus === 0 ? 0 : 1);
