import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calcularAporteEvaluacion,
  calcularEvaluacionesEnCurso,
  calcularCumYAvance,
  sugerirSiguienteCiclo,
} from '../src/utils/academicRules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pensum = JSON.parse(
  readFileSync(resolve(__dirname, '../src/data/pensum2025.json'), 'utf-8')
);

console.log('=== Validación Fase 2: Evaluaciones planificadas, Suficiencia y Cierre de Ciclo ===');

// Caso 1: Evaluación planificada sin nota (nota: null) y luego asignar 7.5 con 25%
const planificada = calcularEvaluacionesEnCurso([
  { id: 'ev-1', nombre: 'Parcial 1', ponderacion: 25, nota: null },
  { id: 'ev-2', nombre: 'Laboratorio 1', ponderacion: 15, nota: null },
]);
assert.equal(planificada.porcentajePlanificado, 40);
assert.equal(planificada.porcentajeDisponiblePlanificar, 60);
assert.equal(planificada.porcentajeEvaluado, 0);
assert.equal(planificada.porcentajeRestante, 100);
assert.equal(planificada.notaAcumulada, 0);
assert.equal(planificada.estadoDinamico, 'en_curso');

const conPrimeraNota = calcularEvaluacionesEnCurso([
  { id: 'ev-1', nombre: 'Parcial 1', ponderacion: 25, nota: 7.5 },
  { id: 'ev-2', nombre: 'Laboratorio 1', ponderacion: 15, nota: null },
]);
assert.equal(calcularAporteEvaluacion(7.5, 25), 1.88);
assert.equal(conPrimeraNota.porcentajePlanificado, 40);
assert.equal(conPrimeraNota.porcentajeEvaluado, 25);
assert.equal(conPrimeraNota.porcentajeRestante, 75);
assert.equal(conPrimeraNota.notaAcumulada, 1.88);
assert.equal(conPrimeraNota.faltanteParaAprobar, 4.07);
assert.equal(conPrimeraNota.promedioNecesarioRestante, 5.43);
assert.equal(conPrimeraNota.estadoDinamico, 'en_curso');
console.log('✓ Caso 1: Evaluación sin nota -> 7.5 (25%): aporte 1.88, faltante 4.07, promedio necesario 5.43.');

// Caso 2: Bloqueo por exceso de ponderación > 100%
const excedida = calcularEvaluacionesEnCurso([
  { id: 'ev-1', nombre: 'Parcial 1', ponderacion: 60, nota: 8.0 },
  { id: 'ev-2', nombre: 'Parcial 2', ponderacion: 50, nota: null },
]);
assert.equal(excedida.porcentajePlanificado, 110);
assert.equal(excedida.ponderacionExcedida, true);
assert.equal(excedida.evaluacionCompleta, false);
console.log('✓ Caso 2: Detección de ponderación planificada > 100% verificada.');

// Caso 3: Activación automática de suficiencia cuando 100% suma 5.50
const evals550 = [
  { id: 'ev-1', nombre: 'Parcial 1', ponderacion: 50, nota: 5.5 },
  { id: 'ev-2', nombre: 'Parcial 2', ponderacion: 50, nota: 5.5 },
];
const sufSinNota = calcularEvaluacionesEnCurso(evals550, null);
assert.equal(sufSinNota.notaAcumulada, 5.5);
assert.equal(sufSinNota.requiereSuficiencia, true);
assert.equal(sufSinNota.estadoDinamico, 'suficiencia');
assert.equal(sufSinNota.notaMinimaSuficiencia, 6.4);

const sufAprobada = calcularEvaluacionesEnCurso(evals550, 6.4);
assert.equal(sufAprobada.notaFinal, 5.95);
assert.equal(sufAprobada.estadoDinamico, 'aprobada');

const sufReprobada = calcularEvaluacionesEnCurso(evals550, 6.3);
assert.equal(sufReprobada.notaFinal, 5.9);
assert.equal(sufReprobada.estadoDinamico, 'reprobada');
console.log('✓ Caso 3: Suficiencia en 5.50 -> 6.40 aprueba (5.95) y 6.30 reprueba (5.90).');

// Caso 4: Aprobación anticipada y estado en_riesgo
const anticipada = calcularEvaluacionesEnCurso([
  { id: 'ev-1', nombre: 'Proyecto', ponderacion: 70, nota: 9.0 },
]);
assert.equal(anticipada.notaAcumulada, 6.3);
assert.equal(anticipada.faltanteParaAprobar, 0);
assert.equal(anticipada.estadoDinamico, 'aprobada_anticipada');

const enRiesgo = calcularEvaluacionesEnCurso([
  { id: 'ev-1', nombre: 'Parciales', ponderacion: 70, nota: 3.5 },
]);
assert.equal(enRiesgo.notaAcumulada, 2.45);
assert.equal(enRiesgo.estadoDinamico, 'en_riesgo');
assert.equal(enRiesgo.imposibleAprobarOrdinario, true);
assert.equal(enRiesgo.puedeAspirarSuficiencia, true);
assert.equal(enRiesgo.promedioNecesarioSuficiencia, 8.5);
console.log('✓ Caso 4: Estados aprobada_anticipada y en_riesgo (con aspiración a suficiencia) verificados.');

// Caso 5: Sugerencia de siguiente ciclo y actualización de CUM/U.V. al cerrar ciclo
assert.equal(sugerirSiguienteCiclo('Ciclo I 2026').label, 'Ciclo II 2026');
assert.equal(sugerirSiguienteCiclo('Ciclo II 2026').label, 'Ciclo I 2027');

// Simular resultado post-cierre de ciclo con una materia ordinaria (NC 1, 4 UV, nota 8.50)
// y una Técnica Electiva personalizada aprobada por suficiencia (NC 24, 4 UV, nota 5.95)
const materiasPostCierre = {
  1: { estado: 'aprobada', notaFinal: 8.5, cicloCursado: 'Ciclo II 2026' },
  24: {
    estado: 'aprobada',
    notaFinal: 5.95,
    cicloCursado: 'Ciclo II 2026',
    electivaInfo: { codigo: 'TPI115', nombre: 'Técnicas de Programación para Internet' },
  },
};
const metricsPost = calcularCumYAvance(pensum, materiasPostCierre);
assert.equal(metricsPost.uvAprobadas, 8);
assert.equal(metricsPost.materiasAprobadas, 2);
assert.equal(metricsPost.cum, 7.23); // (8.5*4 + 5.95*4) / 8 = 7.225 -> round2 = 7.23
console.log('✓ Caso 5: Sugerencia de ciclo y recálculo de CUM (7.23) + U.V. (8) tras cierre verificados.');

console.log('\n✅ TODAS LAS VALIDACIONES DE FASE 2 PASARON EXITOSAMENTE.');
