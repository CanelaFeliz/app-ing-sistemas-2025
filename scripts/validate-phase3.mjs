import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getSubjectDependencies,
  evaluatePensumAvailability,
  pruneInvalidSimulatedSubjects,
  calcularCumYAvance,
} from '../src/utils/academicRules.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pensum = JSON.parse(
  readFileSync(resolve(__dirname, '../src/data/pensum2025.json'), 'utf-8')
);

console.log('=== Validación Fase 3: Grafo, Proyección en Cascada, U.V. y Consistencia ===');

// 1. Dependencias directas (getSubjectDependencies)
const depFEM = getSubjectDependencies(3, pensum); // FEM115
assert.equal(depFEM.prerequisites.length, 0);
assert.deepEqual(
  depFEM.dependents.map((d) => d.nc).sort((a, b) => a - b),
  [7, 15],
  'FEM115 (NC 3) debe habilitar directamente a TSI115 (7) y SCO115 (15)'
);

const depINR = getSubjectDependencies(18, pensum); // INR115
assert.deepEqual(
  depINR.prerequisites.map((p) => p.nc).sort((a, b) => a - b),
  [7, 13, 14],
  'INR115 (NC 18) debe requerir NC 7, 13 y 14'
);
console.log('✓ Caso 1: getSubjectDependencies verificado (FEM115 -> [7, 15], INR115 <- [7, 13, 14]).');

// 2. Proyección en cadena: FEM115 (3) -> TSI115 (7) y SCO115 (15) -> FPI115 (25)
const conFEM = evaluatePensumAvailability(pensum, new Set([3]));
assert.equal(conFEM.byNC[7].isUnlocked, true, 'TSI115 debe habilitarse con FEM115');
assert.equal(conFEM.byNC[15].isUnlocked, true, 'SCO115 debe habilitarse con FEM115');
assert.equal(conFEM.byNC[25].isUnlocked, false, 'FPI115 NO debe habilitarse aún sin SCO115');

const conFEMySCO = evaluatePensumAvailability(pensum, new Set([3, 15]));
assert.equal(conFEMySCO.byNC[25].isUnlocked, true, 'FPI115 debe habilitarse tras proyectar SCO115');
console.log('✓ Caso 2: Proyección en cadena FEM115 -> TSI115 + SCO115 -> FPI115 verificada.');

// 3. Prerrequisitos múltiples estrictos: APE115 (NC 13 -> [6, 8]) e INR115 (NC 18 -> [7, 13, 14])
const soloESD1 = evaluatePensumAvailability(pensum, new Set([1, 2, 6]));
assert.equal(soloESD1.byNC[13].isUnlocked, false, 'APE115 no debe habilitarse solo con NC 6');
assert.deepEqual(soloESD1.byNC[13].missingNCs, [8]);

const con6y8 = evaluatePensumAvailability(pensum, new Set([1, 2, 6, 8]));
assert.equal(con6y8.byNC[13].isUnlocked, true, 'APE115 debe habilitarse con NC 6 y 8');

const casiINR = evaluatePensumAvailability(pensum, new Set([1, 2, 3, 6, 7, 8, 13]));
assert.equal(casiINR.byNC[18].isUnlocked, false, 'INR115 no debe habilitarse sin NC 14');
assert.deepEqual(casiINR.byNC[18].missingNCs, [14]);

const conINR = evaluatePensumAvailability(pensum, new Set([1, 2, 3, 6, 7, 8, 13, 14]));
assert.equal(conINR.byNC[18].isUnlocked, true, 'INR115 debe habilitarse con NC 7, 13 y 14');
console.log('✓ Caso 3: Prerrequisitos múltiples estrictos (APE115 e INR115) verificados.');

// 4. Prerrequisitos por U.V.: FMP115 (70), MEI115 (152), TAG115 (175)
// Acumular materias hasta cruzar exactamente cada umbral
const buildSetForUV = (targetUV) => {
  const set = new Set();
  let sum = 0;
  for (const m of pensum) {
    if (m.prerrequisitoUV > 0) continue; // no incluir las propias materias por UV
    if (sum >= targetUV) break;
    set.add(m.nc);
    sum += m.uv;
  }
  return { set, sum };
};

const under70 = buildSetForUV(68);
assert.ok(under70.sum < 70);
assert.equal(evaluatePensumAvailability(pensum, under70.set).byNC[23].isUnlocked, false);

const at70 = buildSetForUV(70);
assert.ok(at70.sum >= 70);
assert.equal(evaluatePensumAvailability(pensum, at70.set).byNC[23].isUnlocked, true, 'FMP115 debe habilitarse con >= 70 U.V.');
assert.equal(evaluatePensumAvailability(pensum, at70.set).byNC[48].isUnlocked, false);

const at152 = buildSetForUV(152);
assert.ok(at152.sum >= 152);
assert.equal(evaluatePensumAvailability(pensum, at152.set).byNC[48].isUnlocked, true, 'MEI115 debe habilitarse con >= 152 U.V.');
assert.equal(evaluatePensumAvailability(pensum, at152.set).byNC[56].isUnlocked, false);

const at175 = buildSetForUV(175);
assert.ok(at175.sum >= 175);
assert.equal(evaluatePensumAvailability(pensum, at175.set).byNC[56].isUnlocked, true, 'TAG115 debe habilitarse con >= 175 U.V.');
console.log('✓ Caso 4: Hitos de U.V. (70 FMP115, 152 MEI115, 175 TAG115) verificados.');

// 5. Consistencia en cascada al desmarcar (pruneInvalidSimulatedSubjects)
// Cadena simulada: FEM115 (3) -> SCO115 (15) -> FPI115 (25) -> GTH115 (33)
// Si desmarcamos FEM115 (3), deben podarse 15, 25 y 33 automáticamente, dejando intacta FPC115 (1)
const { validSimulatedSet, removedNCs } = pruneInvalidSimulatedSubjects(
  pensum,
  new Set(),
  new Set([1, 15, 25, 33]) // 3 fue desmarcada
);
assert.deepEqual(Array.from(validSimulatedSet), [1], 'FPC115 (NC 1) debe permanecer intacta');
assert.deepEqual(
  removedNCs.sort((a, b) => a - b),
  [15, 25, 33],
  'Deben podarse en cascada NC 15, 25 y 33'
);

// También probar poda por pérdida de U.V. para FMP115 (NC 23, requiere 70 U.V.)
const simWithFMP = new Set([...under70.set, 23]); // under70 tiene < 70 U.V. sin contar FMP115
const uvPrune = pruneInvalidSimulatedSubjects(pensum, new Set(), simWithFMP);
assert.equal(uvPrune.validSimulatedSet.has(23), false, 'FMP115 debe podarse si las demás U.V. bajan de 70');
console.log('✓ Caso 5: Poda en cascada por NC y por umbral de U.V. verificada.');

// 6. Historial: notaFinal null suma U.V. sin distorsionar el CUM
const histMetrics = calcularCumYAvance(pensum, {
  1: { estado: 'aprobada', notaFinal: 9.0, cicloCursado: 'Ciclo I 2025' }, // 4 UV
  2: { estado: 'aprobada', notaFinal: null, cicloCursado: 'Ciclo I 2025' }, // 4 UV sin nota
});
assert.equal(histMetrics.uvAprobadas, 8);
assert.equal(histMetrics.uvConNota, 4);
assert.equal(histMetrics.cum, 9.0);
console.log('✓ Caso 6: Registro de historial con nota null suma U.V. (8) sin alterar el CUM (9.00).');

console.log('\n✅ TODAS LAS VALIDACIONES DE FASE 3 PASARON EXITOSAMENTE.');
