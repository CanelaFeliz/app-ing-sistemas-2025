/**
 * Motor de reglas académicas — Ingeniería de Sistemas Informáticos (Plan 2025, UES - FIA)
 * Todas las funciones en este módulo son puras, deterministas y sin efectos secundarios.
 */

export const NOTA_MINIMA_APROBACION = 5.95;
export const NOTA_MINIMA_SUFICIENCIA = 5.0;
export const NOTA_MAXIMA = 10.0;
export const TOTAL_UV_PLAN = 200;
export const TOTAL_MATERIAS_PLAN = 56;

/**
 * Redondeo estándar a 2 cifras decimales usando Number.EPSILON.
 * @param {number} num
 * @returns {number}
 */
export function round2(num) {
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula el aporte de una evaluación individual.
 * @param {number} nota - Nota obtenida (0.00 a 10.00)
 * @param {number} ponderacion - Porcentaje de la evaluación (0 a 100)
 * @returns {number}
 */
export function calcularAporteEvaluacion(nota, ponderacion) {
  const n = Number(nota) || 0;
  const p = Number(ponderacion) || 0;
  return round2((n * p) / 100);
}

/**
 * Determina si un valor representa una calificación numérica válida (no vacía/null).
 * @param {unknown} value
 * @returns {boolean}
 */
function hasNumericGrade(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

/**
 * Calcula el resumen completo de evaluaciones en curso de una asignatura,
 * soportando evaluaciones planificadas sin nota (`nota: null`), suficiencia y estado dinámico.
 *
 * @param {Array<{ id?: string, nombre?: string, ponderacion: number, nota: number | null }>} evaluaciones
 * @param {number | null} [notaSuficiencia=null]
 * @returns {{
 *   notaAcumulada: number,
 *   notaFinal: number,
 *   porcentajePlanificado: number,
 *   porcentajeDisponiblePlanificar: number,
 *   porcentajeEvaluado: number,
 *   porcentajeRestante: number,
 *   ponderacionExcedida: boolean,
 *   faltanteParaAprobar: number,
 *   promedioNecesarioRestante: number | null,
 *   imposibleAprobarOrdinario: boolean,
 *   puedeAspirarSuficiencia: boolean,
 *   promedioNecesarioSuficiencia: number | null,
 *   notaMinimaSuficiencia: number | null,
 *   tieneSuficiencia: boolean,
 *   requiereSuficiencia: boolean,
 *   evaluacionCompleta: boolean,
 *   estadoDinamico: 'aprobada' | 'aprobada_anticipada' | 'suficiencia' | 'reprobada' | 'en_riesgo' | 'en_curso'
 * }}
 */
export function calcularEvaluacionesEnCurso(evaluaciones = [], notaSuficiencia = null) {
  const lista = Array.isArray(evaluaciones) ? evaluaciones : [];

  let porcentajePlanificado = 0;
  let porcentajeEvaluadoRaw = 0;
  let sumaAportes = 0;

  for (const ev of lista) {
    const pond = Number(ev?.ponderacion) || 0;
    if (pond < 0) continue;

    porcentajePlanificado = round2(porcentajePlanificado + pond);

    if (hasNumericGrade(ev?.nota)) {
      const nota = Number(ev.nota);
      porcentajeEvaluadoRaw = round2(porcentajeEvaluadoRaw + pond);
      sumaAportes = round2(sumaAportes + calcularAporteEvaluacion(nota, pond));
    }
  }

  const ponderacionExcedida = porcentajePlanificado > 100 || porcentajeEvaluadoRaw > 100;
  const porcentajeDisponiblePlanificar = round2(Math.max(0, 100 - porcentajePlanificado));
  const porcentajeEvaluado = Math.min(porcentajeEvaluadoRaw, 100);
  const porcentajeRestante = round2(Math.max(0, 100 - porcentajeEvaluado));
  const notaAcumulada = round2(sumaAportes);

  const faltanteParaAprobar =
    notaAcumulada >= NOTA_MINIMA_APROBACION
      ? 0
      : round2(NOTA_MINIMA_APROBACION - notaAcumulada);

  let promedioNecesarioRestante = null;
  let imposibleAprobarOrdinario = false;

  if (faltanteParaAprobar === 0) {
    promedioNecesarioRestante = 0;
    imposibleAprobarOrdinario = false;
  } else if (porcentajeRestante > 0) {
    const necesario = round2((faltanteParaAprobar / porcentajeRestante) * 100);
    promedioNecesarioRestante = necesario;
    imposibleAprobarOrdinario = necesario > NOTA_MAXIMA;
  } else {
    promedioNecesarioRestante = null;
    imposibleAprobarOrdinario = true;
  }

  // Si ya es imposible aprobar ordinariamente pero queda porcentaje, verificar si puede llegar a 5.00 (suficiencia)
  let puedeAspirarSuficiencia = false;
  let promedioNecesarioSuficiencia = null;
  if (imposibleAprobarOrdinario && porcentajeRestante > 0) {
    const faltantePara5 = Math.max(0, round2(NOTA_MINIMA_SUFICIENCIA - notaAcumulada));
    if (faltantePara5 === 0) {
      puedeAspirarSuficiencia = true;
      promedioNecesarioSuficiencia = 0;
    } else {
      const promSuf = round2((faltantePara5 / porcentajeRestante) * 100);
      promedioNecesarioSuficiencia = promSuf;
      puedeAspirarSuficiencia = promSuf <= NOTA_MAXIMA;
    }
  }

  const evaluacionCompleta = porcentajeEvaluado === 100 && !ponderacionExcedida;
  const tieneSuficiencia = hasNumericGrade(notaSuficiencia);

  let notaMinimaSuficiencia = null;
  let requiereSuficiencia = false;
  let notaFinal = notaAcumulada;
  let estadoDinamico = 'en_curso';

  if (evaluacionCompleta) {
    if (notaAcumulada >= NOTA_MINIMA_APROBACION) {
      estadoDinamico = 'aprobada';
      notaFinal = notaAcumulada;
    } else if (notaAcumulada >= NOTA_MINIMA_SUFICIENCIA) {
      requiereSuficiencia = true;
      notaMinimaSuficiencia = round2(NOTA_MINIMA_APROBACION * 2 - notaAcumulada);
      if (tieneSuficiencia) {
        const resFinal = evaluarEstadoFinal(notaAcumulada, Number(notaSuficiencia));
        notaFinal = resFinal.notaFinal;
        estadoDinamico = resFinal.estado; // 'aprobada' o 'reprobada'
      } else {
        notaFinal = notaAcumulada;
        estadoDinamico = 'suficiencia';
      }
    } else {
      estadoDinamico = 'reprobada';
      notaFinal = notaAcumulada;
    }
  } else if (notaAcumulada >= NOTA_MINIMA_APROBACION) {
    estadoDinamico = 'aprobada_anticipada';
  } else if (porcentajeRestante > 0 && promedioNecesarioRestante !== null && promedioNecesarioRestante > NOTA_MAXIMA) {
    estadoDinamico = 'en_riesgo';
  } else {
    estadoDinamico = 'en_curso';
  }

  return {
    notaAcumulada,
    notaFinal,
    porcentajePlanificado,
    porcentajeDisponiblePlanificar,
    porcentajeEvaluado,
    porcentajeRestante,
    ponderacionExcedida,
    faltanteParaAprobar,
    promedioNecesarioRestante,
    imposibleAprobarOrdinario,
    puedeAspirarSuficiencia,
    promedioNecesarioSuficiencia,
    notaMinimaSuficiencia,
    tieneSuficiencia,
    requiereSuficiencia,
    evaluacionCompleta,
    estadoDinamico,
  };
}

/**
 * Determina el estado final de una asignatura una vez completado el 100% de evaluaciones,
 * incluyendo el flujo de examen de suficiencia (5.00 a 5.94).
 *
 * @param {number} notaCiclo - Nota acumulada al 100% de evaluaciones ordinarias
 * @param {number | null} [notaSuficiencia=null] - Nota del examen de suficiencia si aplica
 * @returns {{
 *   estado: 'aprobada' | 'suficiencia' | 'reprobada',
 *   notaFinal: number,
 *   requiereSuficiencia: boolean
 * }}
 */
export function evaluarEstadoFinal(notaCiclo, notaSuficiencia = null) {
  const ciclo = round2(Number(notaCiclo) || 0);

  if (ciclo >= NOTA_MINIMA_APROBACION) {
    return {
      estado: 'aprobada',
      notaFinal: ciclo,
      requiereSuficiencia: false,
    };
  }

  if (ciclo >= NOTA_MINIMA_SUFICIENCIA && ciclo < NOTA_MINIMA_APROBACION) {
    if (!hasNumericGrade(notaSuficiencia)) {
      return {
        estado: 'suficiencia',
        notaFinal: ciclo,
        requiereSuficiencia: true,
      };
    }

    const suf = round2(Number(notaSuficiencia));
    const notaFinal = round2((ciclo + suf) / 2);

    return {
      estado: notaFinal >= NOTA_MINIMA_APROBACION ? 'aprobada' : 'reprobada',
      notaFinal,
      requiereSuficiencia: true,
    };
  }

  return {
    estado: 'reprobada',
    notaFinal: ciclo,
    requiereSuficiencia: false,
  };
}

/**
 * Calcula el CUM, total de U.V. aprobadas, cantidad de materias aprobadas
 * y porcentaje de avance sobre las 200 U.V. oficiales del plan.
 *
 * El CUM considera únicamente materias aprobadas con calificación numérica registrada.
 *
 * @param {Array<object>} pensum - Catálogo oficial de asignaturas
 * @param {Record<string, object>} materiasUsuario - Mapa de progreso indexado por NC (string o number)
 * @returns {{
 *   cum: number,
 *   uvAprobadas: number,
 *   uvConNota: number,
 *   materiasAprobadas: number,
 *   porcentajeAvance: number
 * }}
 */
export function calcularCumYAvance(pensum = [], materiasUsuario = {}) {
  let uvAprobadas = 0;
  let uvConNota = 0;
  let sumaPonderada = 0;
  let materiasAprobadas = 0;

  for (const materia of pensum) {
    const registro = materiasUsuario?.[String(materia.nc)] ?? materiasUsuario?.[materia.nc];
    if (!registro || registro.estado !== 'aprobada') continue;

    uvAprobadas += materia.uv;
    materiasAprobadas += 1;

    const nota = registro.notaFinal;
    if (hasNumericGrade(nota)) {
      sumaPonderada += round2(Number(nota)) * materia.uv;
      uvConNota += materia.uv;
    }
  }

  const cum = uvConNota > 0 ? round2(sumaPonderada / uvConNota) : 0;
  const porcentajeAvance = round2((uvAprobadas / TOTAL_UV_PLAN) * 100);

  return {
    cum,
    uvAprobadas,
    uvConNota,
    materiasAprobadas,
    porcentajeAvance,
  };
}

/**
 * Evalúa prerrequisitos para un conjunto de NCs aprobados (reales o simulados).
 * Devuelve el detalle de habilitación para cada asignatura del pensum.
 *
 * @param {Array<object>} pensum - Catálogo oficial de asignaturas
 * @param {Iterable<number | string>} ncsAprobados - Conjunto/arreglo de NCs aprobados
 * @returns {{
 *   uvAcumuladas: number,
 *   habilitadas: Array<object>,
 *   bloqueadas: Array<object>,
 *   porMateria: Record<number, {
 *     habilitada: boolean,
 *     aprobada: boolean,
 *     faltantesNC: number[],
 *     faltantesUV: number
 *   }>
 * }}
 */
export function evaluarPrerrequisitos(pensum = [], ncsAprobados = []) {
  const aprobadosSet = new Set(Array.from(ncsAprobados, (id) => Number(id)));

  let uvAcumuladas = 0;
  for (const materia of pensum) {
    if (aprobadosSet.has(materia.nc)) {
      uvAcumuladas += materia.uv;
    }
  }

  const habilitadas = [];
  const bloqueadas = [];
  const porMateria = {};

  for (const materia of pensum) {
    const aprobada = aprobadosSet.has(materia.nc);
    const faltantesNC = (materia.prerrequisitosNC || []).filter((req) => !aprobadosSet.has(req));
    const faltantesUV = Math.max(0, (materia.prerrequisitoUV || 0) - uvAcumuladas);
    const habilitada = !aprobada && faltantesNC.length === 0 && faltantesUV === 0;

    porMateria[materia.nc] = {
      habilitada,
      aprobada,
      faltantesNC,
      faltantesUV,
    };

    if (habilitada) {
      habilitadas.push(materia);
    } else if (!aprobada) {
      bloqueadas.push(materia);
    }
  }

  return {
    uvAcumuladas,
    habilitadas,
    bloqueadas,
    porMateria,
  };
}

/**
 * Sugiere el siguiente ciclo académico a partir del ciclo actual.
 * @param {string} cicloActual - Ej. "Ciclo I 2026", "Ciclo II 2026", "Ciclo Extraordinario 2026"
 * @returns {{ periodo: string, anio: number, label: string }}
 */
export function sugerirSiguienteCiclo(cicloActual) {
  const fallbackYear = new Date().getFullYear();
  const match = typeof cicloActual === 'string'
    ? cicloActual.match(/^(Ciclo I|Ciclo II|Ciclo Extraordinario)\s+(\d{4})$/)
    : null;

  if (!match) {
    return { periodo: 'Ciclo I', anio: fallbackYear + 1, label: `Ciclo I ${fallbackYear + 1}` };
  }

  const [, periodo, anioStr] = match;
  const anio = Number(anioStr);

  if (periodo === 'Ciclo I') {
    return { periodo: 'Ciclo II', anio, label: `Ciclo II ${anio}` };
  }
  return { periodo: 'Ciclo I', anio: anio + 1, label: `Ciclo I ${anio + 1}` };
}

/**
 * Devuelve las dependencias directas de una asignatura:
 * - `prerequisites`: materias que `nc` requiere directamente en `prerrequisitosNC`.
 * - `dependents`: materias que tienen a `nc` dentro de su `prerrequisitosNC`.
 *
 * @param {number} nc
 * @param {Array<object>} pensum
 * @returns {{ prerequisites: Array<object>, dependents: Array<object> }}
 */
export function getSubjectDependencies(nc, pensum = []) {
  const targetNC = Number(nc);
  const byNC = new Map(pensum.map((m) => [m.nc, m]));
  const subject = byNC.get(targetNC);

  const prerequisites = subject
    ? (subject.prerrequisitosNC || []).map((reqId) => byNC.get(reqId)).filter(Boolean)
    : [];

  const dependents = pensum.filter((m) => (m.prerrequisitosNC || []).includes(targetNC));

  return { prerequisites, dependents };
}

/**
 * Evalúa la disponibilidad de todas las asignaturas del pensum dado un conjunto
 * de NCs aprobados (reales o simulados).
 *
 * @param {Array<object>} pensum
 * @param {Set<number> | Iterable<number | string>} approvedNCSet
 * @returns {{
 *   totalUV: number,
 *   byNC: Record<number, { isUnlocked: boolean, missingNCs: number[], missingUV: number }>
 * }}
 */
export function evaluatePensumAvailability(pensum = [], approvedNCSet = new Set()) {
  const approved = new Set(Array.from(approvedNCSet, (id) => Number(id)));

  let totalUV = 0;
  for (const materia of pensum) {
    if (approved.has(materia.nc)) {
      totalUV += materia.uv;
    }
  }

  const byNC = {};
  for (const materia of pensum) {
    const missingNCs = (materia.prerrequisitosNC || []).filter((req) => !approved.has(req));
    const missingUV = Math.max(0, (materia.prerrequisitoUV || 0) - totalUV);
    const isUnlocked = missingNCs.length === 0 && missingUV === 0;

    byNC[materia.nc] = {
      isUnlocked,
      missingNCs,
      missingUV,
    };
  }

  return { totalUV, byNC };
}

/**
 * Valida iterativamente (en cascada) las materias en `simulatedSet` respecto a `baseApprovedSet`.
 * Elimina cualquier materia simulada que haya dejado de cumplir algún `prerrequisitosNC`
 * o `prerrequisitoUV`, asegurando consistencia total en la proyección.
 *
 * @param {Array<object>} pensum
 * @param {Set<number> | Iterable<number | string>} baseApprovedSet
 * @param {Set<number> | Iterable<number | string>} simulatedSet
 * @returns {{ validSimulatedSet: Set<number>, removedNCs: number[] }}
 */
export function pruneInvalidSimulatedSubjects(
  pensum = [],
  baseApprovedSet = new Set(),
  simulatedSet = new Set()
) {
  const base = new Set(Array.from(baseApprovedSet, (id) => Number(id)));
  const currentSimulated = new Set(
    Array.from(simulatedSet, (id) => Number(id)).filter((id) => !base.has(id))
  );
  const removedNCs = [];
  const byNC = new Map(pensum.map((m) => [m.nc, m]));

  let changed = true;
  while (changed) {
    changed = false;

    const combined = new Set([...base, ...currentSimulated]);
    let totalUV = 0;
    for (const materia of pensum) {
      if (combined.has(materia.nc)) {
        totalUV += materia.uv;
      }
    }

    for (const simNC of Array.from(currentSimulated)) {
      const materia = byNC.get(simNC);
      if (!materia) {
        currentSimulated.delete(simNC);
        removedNCs.push(simNC);
        changed = true;
        continue;
      }

      const missingNC = (materia.prerrequisitosNC || []).some((req) => !combined.has(req));
      // Para prerrequisitoUV, las U.V. acumuladas sin contarse a sí misma deben alcanzar el umbral
      const uvWithoutSelf = totalUV - materia.uv;
      const missingUV = (materia.prerrequisitoUV || 0) > uvWithoutSelf;

      if (missingNC || missingUV) {
        currentSimulated.delete(simNC);
        removedNCs.push(simNC);
        changed = true;
      }
    }
  }

  return { validSimulatedSet: currentSimulated, removedNCs };
}
