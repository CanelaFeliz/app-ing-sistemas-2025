import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Plus,
  Save,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import {
  calcularEvaluacionesEnCurso,
  getSubjectDependencies,
  NOTA_MINIMA_APROBACION,
  round2,
} from '../utils/academicRules';

export default function PensumSubjectModal({ nc, onClose, onNavigateToDashboard }) {
  const {
    pensum,
    progress,
    metrics,
    markSubjectApproved,
    removeSubjectRecord,
    enrollSubject,
  } = useProgress();

  const materia = pensum.find((m) => m.nc === nc);
  const record = progress?.materias?.[String(nc)];

  const gradeInputRef = useRef(null);

  const [notaInput, setNotaInput] = useState('');
  const [cicloCursado, setCicloCursado] = useState('');
  const [elecCodigo, setElecCodigo] = useState('');
  const [elecNombre, setElecNombre] = useState('');
  const [error, setError] = useState('');
  const [confirmUnmark, setConfirmUnmark] = useState(false);

  const estado = record?.estado || 'pendiente';
  const isApproved = estado === 'aprobada';
  const isInProgress = estado === 'en_curso';

  useEffect(() => {
    if (!materia) return;
    setNotaInput(
      record?.notaFinal !== null && record?.notaFinal !== undefined
        ? String(record.notaFinal)
        : ''
    );
    setCicloCursado(record?.cicloCursado || '');
    setElecCodigo(record?.electivaInfo?.codigo || '');
    setElecNombre(record?.electivaInfo?.nombre || '');
    setError('');
    setConfirmUnmark(false);

    // Enfoque automático en Nota final para agilizar carga de historial
    if (!isInProgress) {
      setTimeout(() => {
        gradeInputRef.current?.focus();
        gradeInputRef.current?.select();
      }, 30);
    }
  }, [nc, materia, record, isInProgress]);

  const { prerequisites, dependents } = useMemo(
    () => getSubjectDependencies(nc, pensum),
    [nc, pensum]
  );

  // Dependientes que actualmente están aprobados o en curso (para advertencia al desmarcar)
  const affectedDependents = useMemo(() => {
    const materiasUsuario = progress?.materias || {};
    return dependents.filter((dep) => {
      const st = materiasUsuario[String(dep.nc)]?.estado;
      return st === 'aprobada' || st === 'en_curso';
    });
  }, [dependents, progress]);

  if (!materia) return null;

  const materiasUsuario = progress?.materias || {};
  const inProgressStats = isInProgress
    ? calcularEvaluacionesEnCurso(record?.evaluaciones || [], record?.notaSuficiencia)
    : null;

  const uvActuales = metrics.uvAprobadas;
  const uvReq = materia.prerrequisitoUV || 0;
  const uvProgressPct = uvReq > 0 ? Math.min(100, Math.round((uvActuales / uvReq) * 100)) : 100;

  const handleSaveApproved = (e) => {
    e.preventDefault();
    setError('');

    let parsedGrade = null;
    if (notaInput.trim() !== '') {
      const num = Number(notaInput);
      if (!Number.isFinite(num) || num < NOTA_MINIMA_APROBACION || num > 10) {
        setError(
          `La nota aprobatoria debe estar entre ${NOTA_MINIMA_APROBACION.toFixed(2)} y 10.00 (o déjala vacía si no la recuerdas).`
        );
        return;
      }
      parsedGrade = round2(num);
    }

    const electivaInfo = materia.esElectiva
      ? {
          codigo: elecCodigo,
          nombre: elecNombre,
          prerrequisitosTexto: record?.electivaInfo?.prerrequisitosTexto || '',
        }
      : null;

    markSubjectApproved(materia.nc, {
      notaFinal: parsedGrade,
      cicloCursado,
      electivaInfo,
    });
    onClose();
  };

  const handleEnrollCurrentCycle = () => {
    const electivaInfo = materia.esElectiva
      ? {
          codigo: elecCodigo,
          nombre: elecNombre,
          prerrequisitosTexto: '',
        }
      : null;
    enrollSubject(materia.nc, electivaInfo);
    onClose();
  };

  const handleUnmarkApproved = () => {
    if (affectedDependents.length > 0 && !confirmUnmark) {
      setConfirmUnmark(true);
      return;
    }
    removeSubjectRecord(materia.nc);
    onClose();
  };

  const displayCodigo =
    materia.esElectiva && record?.electivaInfo?.codigo ? record.electivaInfo.codigo : materia.codigo;
  const displayNombre =
    materia.esElectiva && record?.electivaInfo?.nombre ? record.electivaInfo.nombre : materia.nombre;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pensum-subject-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">
                {displayCodigo}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                NC {materia.nc}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {materia.uv} U.V.
              </span>
              <span className="text-xs text-slate-500">
                Año {materia.anio} · Ciclo {materia.ciclo}
              </span>
              {materia.esCicloExtraordinario && (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                  Ciclo Extraordinario (**)
                </span>
              )}
            </div>
            <h2
              id="pensum-subject-modal-title"
              className="mt-2 text-lg font-bold text-slate-900"
            >
              {displayNombre}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Action Area by Status */}
          {isInProgress ? (
            <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <div>
                    <h3 className="text-sm font-bold text-blue-950">
                      Actualmente en curso ({progress?.metadata?.cicloActual})
                    </h3>
                    <p className="mt-1 text-xs text-blue-900">
                      Nota acumulada actual:{' '}
                      <strong>{inProgressStats?.notaAcumulada.toFixed(2)} / 10.00</strong> (
                      {inProgressStats?.porcentajeEvaluado}% evaluado).
                    </p>
                  </div>
                </div>
              </div>

              {onNavigateToDashboard && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToDashboard();
                  }}
                  className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Gestionar en Ciclo Actual
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </section>
          ) : (
            <form
              onSubmit={handleSaveApproved}
              className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {isApproved ? 'Editar registro de aprobación' : 'Marcar como aprobada (Historial)'}
                </h3>
                {isApproved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aprobada
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="hist-nota-final"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nota final (5.95 - 10.00, opcional)
                  </label>
                  <input
                    ref={gradeInputRef}
                    id="hist-nota-final"
                    type="number"
                    step="0.01"
                    min="5.95"
                    max="10"
                    value={notaInput}
                    onChange={(e) => setNotaInput(e.target.value)}
                    placeholder="Vacío si no la recuerdas"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Presiona <kbd className="rounded bg-slate-200 px-1 font-mono">Enter</kbd> para
                    guardar rápido.
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="hist-ciclo"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Ciclo cursado (opcional)
                  </label>
                  <input
                    id="hist-ciclo"
                    type="text"
                    value={cicloCursado}
                    onChange={(e) => setCicloCursado(e.target.value)}
                    placeholder="Ej. Ciclo I 2025"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
                  />
                </div>
              </div>

              {materia.esElectiva && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-violet-900">
                      Código electiva
                    </label>
                    <input
                      type="text"
                      value={elecCodigo}
                      onChange={(e) => setElecCodigo(e.target.value.toUpperCase())}
                      placeholder={materia.codigo}
                      className="mt-1 w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 font-mono text-xs uppercase focus:border-violet-600 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-violet-900">
                      Nombre de la Técnica Electiva
                    </label>
                    <input
                      type="text"
                      value={elecNombre}
                      onChange={(e) => setElecNombre(e.target.value)}
                      placeholder="Ej. Técnicas de Programación para Internet"
                      className="mt-1 w-full rounded-md border border-violet-200 bg-white px-2.5 py-1.5 text-xs focus:border-violet-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="text-xs font-semibold text-red-700">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 sm:text-sm"
                  >
                    <Save className="h-4 w-4" />
                    {isApproved ? 'Guardar cambios' : 'Marcar como aprobada'}
                  </button>

                  {!isApproved && (
                    <button
                      type="button"
                      onClick={handleEnrollCurrentCycle}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:text-sm"
                    >
                      <Plus className="h-4 w-4" />
                      Inscribir en ciclo actual
                    </button>
                  )}
                </div>

                {isApproved && !confirmUnmark && (
                  <button
                    type="button"
                    onClick={handleUnmarkApproved}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Desmarcar aprobada
                  </button>
                )}
              </div>

              {isApproved && confirmUnmark && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="font-semibold">
                        Otras materias registradas dependen de {displayCodigo}:{' '}
                        {affectedDependents.map((d) => d.codigo).join(', ')}.
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUnmarkApproved}
                          className="cursor-pointer rounded bg-red-700 px-2.5 py-1 font-semibold text-white hover:bg-red-800"
                        >
                          Sí, desmarcar de todos modos
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmUnmark(false)}
                          className="cursor-pointer rounded border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Prerequisites Detail */}
          <section>
            <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Prerrequisitos requeridos
            </h3>

            {uvReq > 0 && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    Mínimo de {uvReq} U.V. aprobadas
                  </span>
                  <span
                    className={`font-bold ${
                      uvActuales >= uvReq ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {uvActuales} / {uvReq} U.V.
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      uvActuales >= uvReq ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${uvProgressPct}%` }}
                  />
                </div>
              </div>
            )}

            {prerequisites.length === 0 && uvReq === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                {materia.esElectiva
                  ? 'Sin prerrequisito fijo en el catálogo base.'
                  : 'Bachillerato (sin prerrequisitos universitarios).'}
              </p>
            ) : (
              prerequisites.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {prerequisites.map((req) => {
                    const reqApproved = materiasUsuario[String(req.nc)]?.estado === 'aprobada';
                    return (
                      <li
                        key={req.nc}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {reqApproved ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span className="font-mono font-bold text-slate-800">{req.codigo}</span>
                          <span className="text-slate-600">{req.nombre}</span>
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            reqApproved ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {reqApproved ? 'Aprobada' : 'Pendiente'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </section>

          {/* Dependents Detail */}
          <section>
            <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              Materias que habilita ({dependents.length})
            </h3>
            {dependents.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Ninguna asignatura depende directamente de esta materia.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {dependents.map((dep) => (
                  <span
                    key={dep.nc}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                  >
                    <BookOpen className="h-3 w-3 text-slate-400" />
                    <strong className="font-mono">{dep.codigo}</strong>
                    <span>{dep.nombre}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
