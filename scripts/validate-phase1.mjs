import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  round2,
  calcularAporteEvaluacion,
  calcularEvaluacionesEnCurso,
  evaluarEstadoFinal,
  calcularCumYAvance,
  evaluarPrerrequisitos,
} from '../src/utils/academicRules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pensumPath = resolve(__dirname, '../src/data/pensum2025.json');
const pensum = JSON.parse(readFileSync(pensumPath, 'utf-8'));

console.log('=== 1. Validación del Catálogo pensum2025.json ===');

// 1. Totales exactos
assert.equal(pensum.length, 56, `Se esperaban 56 asignaturas, se encontraron ${pensum.length}`);
const totalUV = pensum.reduce((sum, m) => sum + m.uv, 0);
assert.equal(totalUV, 200, `Se esperaban 200 U.V. totales, se encontraron ${totalUV}`);

// 2. Correlativos únicos 1..56 y esquema completo
const ncSet = new Set(pensum.map((m) => m.nc));
assert.equal(ncSet.size, 56, 'Hay números correlativos (NC) duplicados');
for (let i = 1; i <= 56; i += 1) {
  assert.ok(ncSet.has(i), `Falta la asignatura con NC ${i}`);
}

const byNC = new Map(pensum.map((m) => [m.nc, m]));

for (const m of pensum) {
  assert.equal(typeof m.nc, 'number');
  assert.equal(typeof m.codigo, 'string');
  assert.equal(typeof m.nombre, 'string');
  assert.equal(typeof m.uv, 'number');
  assert.equal(typeof m.ciclo, 'number');
  assert.equal(typeof m.anio, 'number');
  assert.ok(Array.isArray(m.prerrequisitosNC));
  assert.equal(typeof m.prerrequisitoUV, 'number');
  assert.equal(typeof m.esElectiva, 'boolean');
  assert.equal(typeof m.esCicloExtraordinario, 'boolean');

  for (const req of m.prerrequisitosNC) {
    assert.ok(ncSet.has(req), `NC ${m.nc} (${m.codigo}) referencia prerrequisito inexistente: ${req}`);
    assert.notEqual(req, m.nc, `NC ${m.nc} no puede ser prerrequisito de sí mismo`);
  }
}

// 3. Prerrequisitos por U.V.
assert.equal(byNC.get(23).codigo, 'FMP115');
assert.equal(byNC.get(23).prerrequisitoUV, 70);
assert.equal(byNC.get(48).codigo, 'MEI115');
assert.equal(byNC.get(48).prerrequisitoUV, 152);
assert.equal(byNC.get(56).codigo, 'TAG115');
assert.equal(byNC.get(56).prerrequisitoUV, 175);

// 4. Ciclo extraordinario
const extraNCs = pensum.filter((m) => m.esCicloExtraordinario).map((m) => m.nc);
assert.deepEqual(extraNCs, [11, 22, 23, 34, 45]);

// 5. Técnicas Electivas
const electivas = pensum.filter((m) => m.esElectiva);
assert.deepEqual(
  electivas.map((m) => m.nc),
  [24, 29, 35, 40, 46, 51]
);
assert.deepEqual(
  electivas.map((m) => m.codigo),
  ['ELEC-1', 'ELEC-2', 'ELEC-3', 'ELEC-4', 'ELEC-5', 'ELEC-6']
);

// 6. Verificaciones puntuales de prerrequisitos
assert.deepEqual(byNC.get(7).prerrequisitosNC, [3], 'TSI115 debe requerir FEM115 (NC 3)');
assert.deepEqual(byNC.get(15).prerrequisitosNC, [3], 'SCO115 debe requerir FEM115 (NC 3)');
assert.deepEqual(byNC.get(25).prerrequisitosNC, [15], 'FPI115 debe requerir SCO115 (NC 15)');

console.log('✓ 56 asignaturas y 200 U.V. totales verificados.');
console.log('✓ Todos los prerrequisitosNC existen y las reglas especiales (U.V., electivas, extraordinarias) coinciden.');

console.log('\n=== 2. Validación de academicRules.js ===');

// Redondeo a 2 decimales
assert.equal(round2(1.005), 1.01);
assert.equal(round2(5.945), 5.95);
assert.equal(round2(7.334), 7.33);
assert.equal(calcularAporteEvaluacion(7.5, 25), 1.88);
console.log('✓ Redondeo estándar a 2 decimales (round2) verificado.');

// Evaluaciones en curso
const enCurso = calcularEvaluacionesEnCurso([
  { id: 'ev-1', nombre: 'Parcial 1', ponderacion: 30, nota: 7.5 },
  { id: 'ev-2', nombre: 'Laboratorio 1', ponderacion: 20, nota: 8.0 },
]);
assert.equal(enCurso.notaAcumulada, 3.85);
assert.equal(enCurso.porcentajeEvaluado, 50);
assert.equal(enCurso.porcentajeRestante, 50);
assert.equal(enCurso.faltanteParaAprobar, 2.1);
assert.equal(enCurso.promedioNecesarioRestante, 4.2);
assert.equal(enCurso.imposibleAprobarOrdinario, false);

const imposible = calcularEvaluacionesEnCurso([
  { id: 'ev-1', nombre: 'Parcial 1', ponderacion: 70, nota: 3.0 },
]);
assert.equal(imposible.notaAcumulada, 2.1);
assert.equal(imposible.porcentajeRestante, 30);
assert.equal(imposible.imposibleAprobarOrdinario, true);
console.log('✓ Cálculo de evaluaciones en curso y detección de imposibilidad verificados.');

// Estado final y suficiencia
assert.equal(evaluarEstadoFinal(5.95).estado, 'aprobada');
assert.equal(evaluarEstadoFinal(4.99).estado, 'reprobada');

const sufPendiente = evaluarEstadoFinal(5.4);
assert.equal(sufPendiente.estado, 'suficiencia');
assert.equal(sufPendiente.requiereSuficiencia, true);

const sufAprobada = evaluarEstadoFinal(5.4, 6.5);
assert.equal(sufAprobada.estado, 'aprobada');
assert.equal(sufAprobada.notaFinal, 5.95);

const sufReprobada = evaluarEstadoFinal(5.2, 6.0);
assert.equal(sufReprobada.estado, 'reprobada');
assert.equal(sufReprobada.notaFinal, 5.6);
console.log('✓ Flujo de aprobación, reprobación y examen de suficiencia (5.00 - 5.94) verificado.');

// CUM y avance
const avance = calcularCumYAvance(pensum, {
  1: { estado: 'aprobada', notaFinal: 8.5 }, // 4 UV
  5: { estado: 'aprobada', notaFinal: 7.0 }, // 2 UV
  11: { estado: 'aprobada', notaFinal: null }, // 2 UV sin nota (suma UV pero no entra al CUM)
  2: { estado: 'en_curso', evaluaciones: [] },
});
assert.equal(avance.uvAprobadas, 8);
assert.equal(avance.uvConNota, 6);
assert.equal(avance.cum, 8.0); // (8.5*4 + 7.0*2) / 6 = 48 / 6 = 8.00
assert.equal(avance.porcentajeAvance, 4.0); // 8 / 200 * 100 = 4%
console.log('✓ Cálculo de CUM y porcentaje de avance verificado.');

// Prerrequisitos y desbloqueo por U.V.
const inicial = evaluarPrerrequisitos(pensum, []);
assert.ok(inicial.porMateria[1].habilitada, 'FPC115 debe estar habilitada sin aprobadas');
assert.ok(inicial.porMateria[11].habilitada, 'ING115 debe estar habilitada sin aprobadas');
assert.equal(inicial.porMateria[6].habilitada, false, 'ESD115 requiere NC 1 y 2');
assert.equal(inicial.porMateria[23].habilitada, false, 'FMP115 requiere 70 U.V.');
assert.equal(inicial.porMateria[23].faltantesUV, 70);

// Simular suficientes materias aprobadas para superar 70 U.V. (NC 1..20 suman 72 U.V.)
const ncs72UV = Array.from({ length: 20 }, (_, i) => i + 1);
const con72UV = evaluarPrerrequisitos(pensum, ncs72UV);
assert.equal(con72UV.uvAcumuladas, 72);
assert.equal(con72UV.porMateria[23].habilitada, true, 'FMP115 debe desbloquearse al alcanzar >= 70 U.V.');
assert.equal(con72UV.porMateria[48].habilitada, false, 'MEI115 aún requiere 152 U.V.');
assert.equal(con72UV.porMateria[48].faltantesUV, 80);
console.log('✓ Evaluador de prerrequisitos por NC y desbloqueo por U.V. verificado.');

console.log('\n✅ TODAS LAS VALIDACIONES DE FASE 1 PASARON EXITOSAMENTE.');
