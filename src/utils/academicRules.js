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
 * Calcula el resumen de evaluaciones en curso de una asignatura.
 * Valida que la suma de ponderaciones no supere 100%.
 *
 * @param {Array<{ id?: string, nombre?: string, ponderacion: number, nota: number | null }>} evaluaciones
 * @returns {{
 *   notaAcumulada: number,
 *   porcentajeEvaluado: number,
 *   porcentajeRestante: number,
 *   ponderacionExcedida: boolean,
 *   faltanteParaAprobar: number,
 *   promedioNecesarioRestante: number | null,
 *   imposibleAprobarOrdinario: boolean,
 *   evaluacionCompleta: boolean
 * }}
 */
export function calcularEvaluacionesEnCurso(evaluaciones = []) {
  const lista = Array.isArray(evaluaciones) ? evaluaciones : [];

  let porcentajeTotal = 0;
  let sumaAportes = 0;

  for (const ev of lista) {
    const pond = Number(ev?.ponderacion) || 0;
    const nota = ev?.nota === null || ev?.nota === undefined || ev?.nota === '' ? null : Number(ev.nota);

    if (pond < 0) continue;

    if (nota !== null && Number.isFinite(nota)) {
      porcentajeTotal = round2(porcentajeTotal + pond);
      sumaAportes = round2(sumaAportes + calcularAporteEvaluacion(nota, pond));
    }
  }

  const ponderacionExcedida = porcentajeTotal > 100;
  const porcentajeEvaluado = Math.min(porcentajeTotal, 100);
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
    const necesario = round2((faltanteParaAprobar * 100) / porcentajeRestante);
    promedioNecesarioRestante = necesario;
    imposibleAprobarOrdinario = necesario > NOTA_MAXIMA;
  } else {
    // 100% evaluado y no llegó a 5.95
    promedioNecesarioRestante = null;
    imposibleAprobarOrdinario = true;
  }

  return {
    notaAcumulada,
    porcentajeEvaluado,
    porcentajeRestante,
    ponderacionExcedida,
    faltanteParaAprobar,
    promedioNecesarioRestante,
    imposibleAprobarOrdinario,
    evaluacionCompleta: porcentajeEvaluado === 100 && !ponderacionExcedida,
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
    const tieneSuficiencia =
      notaSuficiencia !== null &&
      notaSuficiencia !== undefined &&
      notaSuficiencia !== '' &&
      Number.isFinite(Number(notaSuficiencia));

    if (!tieneSuficiencia) {
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
    if (nota !== null && nota !== undefined && nota !== '' && Number.isFinite(Number(nota))) {
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
