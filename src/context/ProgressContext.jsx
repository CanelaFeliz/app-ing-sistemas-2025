import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import pensum2025 from '../data/pensum2025.json';
import {
  calcularCumYAvance,
  calcularEvaluacionesEnCurso,
  NOTA_MINIMA_APROBACION,
  round2,
} from '../utils/academicRules';

const STORAGE_KEY = 'isi2025_progress_v1';
const UNSAVED_KEY = 'isi2025_unsaved_v1';

const VALID_STATES = new Set(['aprobada', 'en_curso', 'reprobada', 'suficiencia', 'pendiente']);
const VALID_NCS = new Set(pensum2025.map((m) => String(m.nc)));

/**
 * Genera un ID único para evaluaciones.
 */
function generateEvalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ev-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Valida la estructura de un objeto JSON importado.
 * @param {unknown} data
 * @returns {{ valid: boolean, error?: string, normalized?: object }}
 */
export function validateProgressPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
  }

  const { metadata, materias } = data;

  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { valid: false, error: 'Falta la sección "metadata" o tiene un formato inválido.' };
  }

  const nombre = typeof metadata.nombre === 'string' ? metadata.nombre.trim() : '';
  const carnet = typeof metadata.carnet === 'string' ? metadata.carnet.trim().toUpperCase() : '';
  const cicloActual = typeof metadata.cicloActual === 'string' ? metadata.cicloActual.trim() : '';

  if (!nombre) {
    return { valid: false, error: 'El campo "metadata.nombre" es obligatorio.' };
  }
  if (!carnet) {
    return { valid: false, error: 'El campo "metadata.carnet" es obligatorio.' };
  }
  if (!cicloActual) {
    return { valid: false, error: 'El campo "metadata.cicloActual" es obligatorio.' };
  }

  if (!materias || typeof materias !== 'object' || Array.isArray(materias)) {
    return { valid: false, error: 'Falta la sección "materias" o no es un objeto válido.' };
  }

  for (const [ncKey, record] of Object.entries(materias)) {
    if (!VALID_NCS.has(String(ncKey))) {
      return {
        valid: false,
        error: `La clave de materia NC "${ncKey}" no existe en el Plan 2025 (1-56).`,
      };
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      return {
        valid: false,
        error: `El registro de la materia NC ${ncKey} tiene un formato inválido.`,
      };
    }
    if (record.estado && !VALID_STATES.has(record.estado)) {
      return {
        valid: false,
        error: `Estado desconocido "${record.estado}" en la materia NC ${ncKey}.`,
      };
    }
    if (record.evaluaciones !== undefined && !Array.isArray(record.evaluaciones)) {
      return {
        valid: false,
        error: `El campo "evaluaciones" de la materia NC ${ncKey} debe ser una lista.`,
      };
    }
  }

  const normalized = {
    metadata: {
      nombre,
      carnet,
      cicloActual,
      ultimaModificacion:
        typeof metadata.ultimaModificacion === 'string' && metadata.ultimaModificacion
          ? metadata.ultimaModificacion
          : new Date().toISOString(),
      versionPlan: metadata.versionPlan ? String(metadata.versionPlan) : '2025',
    },
    materias: { ...materias },
  };

  return { valid: true, normalized };
}

function loadInitialProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = validateProgressPayload(parsed);
    return result.valid ? result.normalized : null;
  } catch {
    return null;
  }
}

function loadInitialUnsaved() {
  try {
    return localStorage.getItem(UNSAVED_KEY) === 'true';
  } catch {
    return false;
  }
}

function normalizeOptionalGrade(nota) {
  if (nota === null || nota === undefined || nota === '') return null;
  const parsed = Number(nota);
  if (!Number.isFinite(parsed)) return null;
  return round2(Math.min(10, Math.max(0, parsed)));
}

/**
 * Aplica el cierre de ciclo sobre un objeto de progreso de forma pura (útil también para pruebas).
 * @param {object} prevProgress
 * @param {string} nuevoCiclo
 * @returns {{ nextProgress: object, summary: { aprobadas: number, reprobadas: number, devueltasPendiente: number } }}
 */
export function applyFinishCycle(prevProgress, nuevoCiclo) {
  const now = new Date().toISOString();
  const cicloCerrado = prevProgress.metadata.cicloActual;
  const nextMaterias = { ...prevProgress.materias };

  let aprobadas = 0;
  let reprobadas = 0;
  let devueltasPendiente = 0;

  for (const [ncKey, record] of Object.entries(prevProgress.materias || {})) {
    if (record?.estado !== 'en_curso') continue;

    const stats = calcularEvaluacionesEnCurso(record.evaluaciones || [], record.notaSuficiencia);

    if (stats.notaFinal >= NOTA_MINIMA_APROBACION) {
      const approvedRecord = {
        estado: 'aprobada',
        notaFinal: stats.notaFinal,
        cicloCursado: cicloCerrado,
      };
      if (record.electivaInfo) {
        approvedRecord.electivaInfo = record.electivaInfo;
      }
      nextMaterias[ncKey] = approvedRecord;
      aprobadas += 1;
    } else if (stats.estadoDinamico === 'reprobada') {
      delete nextMaterias[ncKey];
      reprobadas += 1;
    } else {
      // Incompleta o pendiente de suficiencia: vuelve a pendiente
      delete nextMaterias[ncKey];
      devueltasPendiente += 1;
    }
  }

  return {
    nextProgress: {
      ...prevProgress,
      metadata: {
        ...prevProgress.metadata,
        cicloActual: nuevoCiclo.trim(),
        ultimaModificacion: now,
      },
      materias: nextMaterias,
    },
    summary: { aprobadas, reprobadas, devueltasPendiente },
  };
}

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(loadInitialProgress);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(loadInitialUnsaved);

  // Auto-guardado automático en localStorage ante cualquier cambio
  useEffect(() => {
    try {
      if (progress) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Error al guardar progreso en localStorage:', err);
    }
  }, [progress]);

  useEffect(() => {
    try {
      if (progress) {
        localStorage.setItem(UNSAVED_KEY, String(hasUnsavedChanges));
      } else {
        localStorage.removeItem(UNSAVED_KEY);
      }
    } catch (err) {
      console.error('Error al guardar bandera de cambios en localStorage:', err);
    }
  }, [hasUnsavedChanges, progress]);

  /**
   * Crea un nuevo perfil de progreso desde Onboarding.
   */
  const createProfile = useCallback(({ nombre, carnet, cicloActual }) => {
    const now = new Date().toISOString();
    const newProgress = {
      metadata: {
        nombre: nombre.trim(),
        carnet: carnet.trim().toUpperCase(),
        cicloActual: cicloActual.trim(),
        ultimaModificacion: now,
        versionPlan: '2025',
      },
      materias: {},
    };
    setProgress(newProgress);
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Importa y valida un progreso desde el contenido de texto de un archivo .json.
   * @param {string} jsonText
   * @returns {{ ok: boolean, error?: string }}
   */
  const importFromJsonText = useCallback((jsonText) => {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return { ok: false, error: 'El archivo seleccionado no es un JSON válido.' };
    }

    const validation = validateProgressPayload(parsed);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    setProgress(validation.normalized);
    setHasUnsavedChanges(false);
    return { ok: true };
  }, []);

  /**
   * Actualiza el ciclo actual en metadata y marca cambios sin exportar.
   */
  const updateCicloActual = useCallback((nuevoCiclo) => {
    setProgress((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          cicloActual: nuevoCiclo,
          ultimaModificacion: new Date().toISOString(),
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Actualiza o crea el registro de una materia por NC.
   */
  const updateMateria = useCallback((nc, updater) => {
    const key = String(nc);
    setProgress((prev) => {
      if (!prev) return prev;
      const currentRecord = prev.materias[key] || {};
      const nextRecord = typeof updater === 'function' ? updater(currentRecord) : updater;

      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          ultimaModificacion: new Date().toISOString(),
        },
        materias: {
          ...prev.materias,
          [key]: nextRecord,
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Elimina el registro de una materia del progreso.
   */
  const removeMateria = useCallback((nc) => {
    const key = String(nc);
    setProgress((prev) => {
      if (!prev || !(key in prev.materias)) return prev;
      const nextMaterias = { ...prev.materias };
      delete nextMaterias[key];
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          ultimaModificacion: new Date().toISOString(),
        },
        materias: nextMaterias,
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Inscribe una materia en el ciclo actual (`en_curso`).
   */
  const enrollSubject = useCallback((nc, electivaInfo = null) => {
    const key = String(nc);
    setProgress((prev) => {
      if (!prev) return prev;
      const record = {
        estado: 'en_curso',
        evaluaciones: [],
        notaSuficiencia: null,
      };
      if (electivaInfo && (electivaInfo.codigo || electivaInfo.nombre || electivaInfo.prerrequisitosTexto)) {
        record.electivaInfo = {
          codigo: (electivaInfo.codigo || '').trim().toUpperCase(),
          nombre: (electivaInfo.nombre || '').trim(),
          prerrequisitosTexto: (electivaInfo.prerrequisitosTexto || '').trim(),
        };
      }
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          ultimaModificacion: new Date().toISOString(),
        },
        materias: {
          ...prev.materias,
          [key]: record,
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Retira una materia del ciclo actual.
   */
  const unenrollSubject = useCallback((nc) => {
    removeMateria(nc);
  }, [removeMateria]);

  /**
   * Marca o actualiza una materia como aprobada en el historial (Modo Historial).
   * Permite `notaFinal: null` (suma U.V. sin distorsionar el CUM).
   */
  const markSubjectApproved = useCallback(
    (nc, { notaFinal = null, cicloCursado = '', electivaInfo = null } = {}) => {
      const key = String(nc);
      setProgress((prev) => {
        if (!prev) return prev;
        const existing = prev.materias[key] || {};
        const normalizedGrade = normalizeOptionalGrade(notaFinal);
        const record = {
          estado: 'aprobada',
          notaFinal: normalizedGrade,
          cicloCursado: String(cicloCursado || '').trim(),
        };

        const nextElective = electivaInfo ?? existing.electivaInfo;
        if (
          nextElective &&
          (nextElective.codigo || nextElective.nombre || nextElective.prerrequisitosTexto)
        ) {
          record.electivaInfo = {
            codigo: (nextElective.codigo || '').trim().toUpperCase(),
            nombre: (nextElective.nombre || '').trim(),
            prerrequisitosTexto: (nextElective.prerrequisitosTexto || '').trim(),
          };
        }

        return {
          ...prev,
          metadata: {
            ...prev.metadata,
            ultimaModificacion: new Date().toISOString(),
          },
          materias: {
            ...prev.materias,
            [key]: record,
          },
        };
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  /**
   * Elimina el registro de una materia aprobada (volviéndola a pendiente).
   */
  const removeSubjectRecord = useCallback(
    (nc) => {
      removeMateria(nc);
    },
    [removeMateria]
  );

  /**
   * Personaliza los datos de una Técnica Electiva.
   */
  const updateElectiveInfo = useCallback((nc, { codigo = '', nombre = '', prerrequisitosTexto = '' }) => {
    const key = String(nc);
    setProgress((prev) => {
      if (!prev || !prev.materias[key]) return prev;
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          ultimaModificacion: new Date().toISOString(),
        },
        materias: {
          ...prev.materias,
          [key]: {
            ...prev.materias[key],
            electivaInfo: {
              codigo: codigo.trim().toUpperCase(),
              nombre: nombre.trim(),
              prerrequisitosTexto: prerrequisitosTexto.trim(),
            },
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Agrega una evaluación a una materia en curso.
   */
  const addEvaluation = useCallback((nc, { nombre, ponderacion, nota = null }) => {
    const key = String(nc);
    setProgress((prev) => {
      if (!prev || !prev.materias[key]) return prev;
      const current = prev.materias[key];
      const evaluaciones = Array.isArray(current.evaluaciones) ? current.evaluaciones : [];
      const nuevaEval = {
        id: generateEvalId(),
        nombre: (nombre || '').trim() || `Evaluación ${evaluaciones.length + 1}`,
        ponderacion: round2(Math.max(0, Number(ponderacion) || 0)),
        nota: normalizeOptionalGrade(nota),
      };
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          ultimaModificacion: new Date().toISOString(),
        },
        materias: {
          ...prev.materias,
          [key]: {
            ...current,
            evaluaciones: [...evaluaciones, nuevaEval],
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Edita una evaluación existente (nombre, ponderacion o nota).
   */
  const updateEvaluation = useCallback((nc, evalId, updates) => {
    const key = String(nc);
    setProgress((prev) => {
      if (!prev || !prev.materias[key]) return prev;
      const current = prev.materias[key];
      const evaluaciones = (current.evaluaciones || []).map((ev) => {
        if (ev.id !== evalId) return ev;
        const next = { ...ev };
        if ('nombre' in updates) {
          next.nombre = String(updates.nombre ?? '').trim() || ev.nombre;
        }
        if ('ponderacion' in updates) {
          next.ponderacion = round2(Math.max(0, Number(updates.ponderacion) || 0));
        }
        if ('nota' in updates) {
          next.nota = normalizeOptionalGrade(updates.nota);
        }
        return next;
      });

      // Si las evaluaciones modificadas dejan de calificar para suficiencia, limpiar notaSuficiencia
      const statsAfter = calcularEvaluacionesEnCurso(evaluaciones, current.notaSuficiencia);
      const nextNotaSuf = statsAfter.requiereSuficiencia ? current.notaSuficiencia : null;

      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          ultimaModificacion: new Date().toISOString(),
        },
        materias: {
          ...prev.materias,
          [key]: {
            ...current,
            evaluaciones,
            notaSuficiencia: nextNotaSuf,
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Elimina una evaluación de una materia en curso.
   */
  const deleteEvaluation = useCallback((nc, evalId) => {
    const key = String(nc);
    setProgress((prev) => {
      if (!prev || !prev.materias[key]) return prev;
      const current = prev.materias[key];
      const evaluaciones = (current.evaluaciones || []).filter((ev) => ev.id !== evalId);
      const statsAfter = calcularEvaluacionesEnCurso(evaluaciones, current.notaSuficiencia);
      const nextNotaSuf = statsAfter.requiereSuficiencia ? current.notaSuficiencia : null;

      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          ultimaModificacion: new Date().toISOString(),
        },
        materias: {
          ...prev.materias,
          [key]: {
            ...current,
            evaluaciones,
            notaSuficiencia: nextNotaSuf,
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Guarda o limpia la nota del examen de suficiencia.
   */
  const setSuficienciaGrade = useCallback((nc, notaSuficiencia) => {
    const key = String(nc);
    setProgress((prev) => {
      if (!prev || !prev.materias[key]) return prev;
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          ultimaModificacion: new Date().toISOString(),
        },
        materias: {
          ...prev.materias,
          [key]: {
            ...prev.materias[key],
            notaSuficiencia: normalizeOptionalGrade(notaSuficiencia),
          },
        },
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Ejecuta el cierre del ciclo actual en una sola transacción.
   */
  const finishCycle = useCallback((nuevoCiclo) => {
    let resultSummary = { aprobadas: 0, reprobadas: 0, devueltasPendiente: 0 };
    setProgress((prev) => {
      if (!prev) return prev;
      const { nextProgress, summary } = applyFinishCycle(prev, nuevoCiclo);
      resultSummary = summary;
      return nextProgress;
    });
    setHasUnsavedChanges(true);
    return resultSummary;
  }, []);

  /**
   * Descarga el progreso como progreso_{CARNET}.json, actualiza ultimaModificacion
   * y reinicia hasUnsavedChanges.
   */
  const exportToJson = useCallback(() => {
    if (!progress) return;

    const now = new Date().toISOString();
    const updatedProgress = {
      ...progress,
      metadata: {
        ...progress.metadata,
        ultimaModificacion: now,
      },
    };

    setProgress(updatedProgress);
    setHasUnsavedChanges(false);

    const safeCarnet = (updatedProgress.metadata.carnet || 'ESTUDIANTE')
      .replace(/[^A-Z0-9_-]/gi, '')
      .toUpperCase();
    const filename = `progreso_${safeCarnet}.json`;

    const blob = new Blob([JSON.stringify(updatedProgress, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [progress]);

  /**
   * Cierra la sesión actual y limpia localStorage para volver a Onboarding.
   */
  const resetSession = useCallback(() => {
    setProgress(null);
    setHasUnsavedChanges(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(UNSAVED_KEY);
    } catch {
      // ignore storage errors
    }
  }, []);

  const metrics = useMemo(() => {
    return calcularCumYAvance(pensum2025, progress?.materias || {});
  }, [progress]);

  const value = useMemo(
    () => ({
      pensum: pensum2025,
      progress,
      hasUnsavedChanges,
      metrics,
      createProfile,
      importFromJsonText,
      updateCicloActual,
      updateMateria,
      removeMateria,
      enrollSubject,
      unenrollSubject,
      markSubjectApproved,
      removeSubjectRecord,
      updateElectiveInfo,
      addEvaluation,
      updateEvaluation,
      deleteEvaluation,
      setSuficienciaGrade,
      finishCycle,
      exportToJson,
      resetSession,
    }),
    [
      progress,
      hasUnsavedChanges,
      metrics,
      createProfile,
      importFromJsonText,
      updateCicloActual,
      updateMateria,
      removeMateria,
      enrollSubject,
      unenrollSubject,
      markSubjectApproved,
      removeSubjectRecord,
      updateElectiveInfo,
      addEvaluation,
      updateEvaluation,
      deleteEvaluation,
      setSuficienciaGrade,
      finishCycle,
      exportToJson,
      resetSession,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress debe utilizarse dentro de un ProgressProvider.');
  }
  return ctx;
}
