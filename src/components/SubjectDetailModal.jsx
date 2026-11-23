import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import {
  calcularAporteEvaluacion,
  calcularEvaluacionesEnCurso,
  NOTA_MINIMA_APROBACION,
  round2,
} from '../utils/academicRules';

export default function SubjectDetailModal({ nc, onClose }) {
  const {
    pensum,
    progress,
    addEvaluation,
    updateEvaluation,
    deleteEvaluation,
    setSuficienciaGrade,
    updateElectiveInfo,
    unenrollSubject,
  } = useProgress();

  const materia = pensum.find((m) => m.nc === nc);
  const record = progress?.materias?.[String(nc)];

  // Add evaluation form state
  const [evNombre, setEvNombre] = useState('');
  const [evPonderacion, setEvPonderacion] = useState('');
  const [evNota, setEvNota] = useState('');
  const [evError, setEvError] = useState('');

  // Inline row editing state
  const [editingEvalId, setEditingEvalId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editPonderacion, setEditPonderacion] = useState('');
  const [editNota, setEditNota] = useState('');
  const [editError, setEditError] = useState('');

  // Elective edit state
  const [editingElective, setEditingElective] = useState(false);
  const [elecCodigo, setElecCodigo] = useState('');
  const [elecNombre, setElecNombre] = useState('');
  const [elecPrereq, setElecPrereq] = useState('');

  // Suficiencia input state
  const [sufInput, setSufInput] = useState('');

  // Unenroll confirmation
  const [confirmUnenroll, setConfirmUnenroll] = useState(false);

  useEffect(() => {
    if (!record) return;
    setSufInput(
      record.notaSuficiencia !== null && record.notaSuficiencia !== undefined
        ? String(record.notaSuficiencia)
        : ''
    );
    setElecCodigo(record.electivaInfo?.codigo || '');
    setElecNombre(record.electivaInfo?.nombre || '');
    setElecPrereq(record.electivaInfo?.prerrequisitosTexto || '');
  }, [nc, record?.notaSuficiencia, record?.electivaInfo]);

  if (!materia || !record) return null;

  const evaluaciones = record.evaluaciones || [];
  const stats = calcularEvaluacionesEnCurso(evaluaciones, record.notaSuficiencia);

  const displayCodigo =
    materia.esElectiva && record.electivaInfo?.codigo ? record.electivaInfo.codigo : materia.codigo;
  const displayNombre =
    materia.esElectiva && record.electivaInfo?.nombre ? record.electivaInfo.nombre : materia.nombre;

  const handleAddEvaluation = (e) => {
    e.preventDefault();
    setEvError('');

    const pond = round2(Number(evPonderacion));
    if (!Number.isFinite(pond) || pond <= 0) {
      setEvError('La ponderación debe ser un número mayor a 0%.');
      return;
    }
    if (round2(stats.porcentajePlanificado + pond) > 100) {
      setEvError(
        `La suma de ponderaciones superaría el 100%. Disponible para asignar: ${stats.porcentajeDisponiblePlanificar}%.`
      );
      return;
    }

    let notaVal = null;
    if (evNota.trim() !== '') {
      const parsedNota = Number(evNota);
      if (!Number.isFinite(parsedNota) || parsedNota < 0 || parsedNota > 10) {
        setEvError('La calificación debe estar entre 0.00 y 10.00 (o dejarse vacía).');
        return;
      }
      notaVal = round2(parsedNota);
    }

    addEvaluation(nc, {
      nombre: evNombre.trim() || `Evaluación ${evaluaciones.length + 1}`,
      ponderacion: pond,
      nota: notaVal,
    });

    setEvNombre('');
    setEvPonderacion('');
    setEvNota('');
  };

  const startEditRow = (ev) => {
    setEditingEvalId(ev.id);
    setEditNombre(ev.nombre);
    setEditPonderacion(String(ev.ponderacion));
    setEditNota(ev.nota !== null && ev.nota !== undefined ? String(ev.nota) : '');
    setEditError('');
  };

  const saveEditRow = (ev) => {
    setEditError('');
    const pond = round2(Number(editPonderacion));
    if (!Number.isFinite(pond) || pond <= 0) {
      setEditError('La ponderación debe ser mayor a 0%.');
      return;
    }

    const otherPlanned = round2(stats.porcentajePlanificado - ev.ponderacion);
    if (round2(otherPlanned + pond) > 100) {
      setEditError(
        `Excede el 100% total. Máximo permitido para esta evaluación: ${round2(100 - otherPlanned)}%.`
      );
      return;
    }

    let notaVal = null;
    if (editNota.trim() !== '') {
      const parsed = Number(editNota);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
        setEditError('La calificación debe estar entre 0.00 y 10.00.');
        return;
      }
      notaVal = round2(parsed);
    }

    updateEvaluation(nc, ev.id, {
      nombre: editNombre.trim() || ev.nombre,
      ponderacion: pond,
      nota: notaVal,
    });
    setEditingEvalId(null);
  };

  const handleQuickGradeChange = (evId, rawValue) => {
    if (rawValue.trim() === '') {
      updateEvaluation(nc, evId, { nota: null });
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) return;
    updateEvaluation(nc, evId, { nota: round2(parsed) });
  };

  const handleSuficienciaChange = (rawValue) => {
    setSufInput(rawValue);
    if (rawValue.trim() === '') {
      setSuficienciaGrade(nc, null);
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) return;
    setSuficienciaGrade(nc, round2(parsed));
  };

  const handleSaveElective = (e) => {
    e.preventDefault();
    updateElectiveInfo(nc, {
      codigo: elecCodigo,
      nombre: elecNombre,
      prerrequisitosTexto: elecPrereq,
    });
    setEditingElective(false);
  };

  const handleUnenrollClick = () => {
    if (evaluaciones.length > 0 && !confirmUnenroll) {
      setConfirmUnenroll(true);
      return;
    }
    unenrollSubject(nc);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-xs sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-detail-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
                  {displayCodigo}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {materia.uv} U.V. · Ciclo {materia.ciclo} (Año {materia.anio})
                </span>
                {materia.esElectiva && (
                  <button
                    type="button"
                    onClick={() => setEditingElective((v) => !v)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    <Pencil className="h-3 w-3" />
                    {editingElective ? 'Cerrar edición' : 'Editar electiva'}
                  </button>
                )}
              </div>
              <h2
                id="subject-detail-title"
                className="mt-1.5 text-lg font-bold text-slate-900 sm:text-xl"
              >
                {displayNombre}
              </h2>
              {materia.esElectiva && record.electivaInfo?.prerrequisitosTexto && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Prerrequisitos: {record.electivaInfo.prerrequisitosTexto}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar gestor"
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Inline Elective Editor */}
          {materia.esElectiva && editingElective && (
            <form
              onSubmit={handleSaveElective}
              className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3.5 sm:grid-cols-4"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Código</label>
                <input
                  type="text"
                  value={elecCodigo}
                  onChange={(e) => setElecCodigo(e.target.value.toUpperCase())}
                  placeholder={materia.codigo}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs uppercase focus:border-violet-600 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={elecNombre}
                  onChange={(e) => setElecNombre(e.target.value)}
                  placeholder="Nombre de la Técnica Electiva"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-violet-600 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
                >
                  Guardar datos
                </button>
              </div>
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Nota de prerrequisitos (opcional)
                </label>
                <input
                  type="text"
                  value={elecPrereq}
                  onChange={(e) => setElecPrereq(e.target.value)}
                  placeholder="Ej. BAD115, PPI115"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-violet-600 focus:outline-none"
                />
              </div>
            </form>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Summary Metrics Panel */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-slate-500">
                {stats.tieneSuficiencia ? 'Nota Final' : 'Nota Acumulada'}
              </span>
              <span className="mt-1 block text-2xl font-bold text-slate-900">
                {(stats.tieneSuficiencia ? stats.notaFinal : stats.notaAcumulada).toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500">Mínimo: {NOTA_MINIMA_APROBACION.toFixed(2)}</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-slate-500">Evaluado / Plan.</span>
              <span className="mt-1 block text-xl font-bold text-slate-900">
                {stats.porcentajeEvaluado}%{' '}
                <span className="text-xs font-normal text-slate-500">
                  / {stats.porcentajePlanificado}%
                </span>
              </span>
              <span className="text-[11px] text-slate-500">
                Restante por evaluar: {stats.porcentajeRestante}%
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-slate-500">
                Faltante para {NOTA_MINIMA_APROBACION.toFixed(2)}
              </span>
              <span
                className={`mt-1 block text-xl font-bold ${
                  stats.faltanteParaAprobar === 0 ? 'text-emerald-700' : 'text-slate-900'
                }`}
              >
                {stats.faltanteParaAprobar === 0
                  ? '0.00 pts'
                  : `${stats.faltanteParaAprobar.toFixed(2)} pts`}
              </span>
              <span className="text-[11px] text-slate-500">
                {stats.faltanteParaAprobar === 0 ? '¡Meta alcanzada!' : 'Puntos netos'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-slate-500">
                Promedio necesario
              </span>
              <span
                className={`mt-1 block text-xl font-bold ${
                  stats.imposibleAprobarOrdinario
                    ? 'text-orange-700'
                    : stats.faltanteParaAprobar === 0
                      ? 'text-emerald-700'
                      : 'text-slate-900'
                }`}
              >
                {stats.faltanteParaAprobar === 0
                  ? '—'
                  : stats.promedioNecesarioRestante !== null
                    ? stats.promedioNecesarioRestante.toFixed(2)
                    : '—'}
              </span>
              <span className="text-[11px] text-slate-500">
                {stats.imposibleAprobarOrdinario
                  ? 'Imposible en ordinario'
                  : stats.porcentajeRestante > 0
                    ? `En ${stats.porcentajeRestante}% restante`
                    : '100% evaluado'}
              </span>
            </div>
          </div>

          {/* Suficiencia Section (Automatic when 100% evaluated & 5.00 <= nota <= 5.94) */}
          {stats.requiereSuficiencia && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">
                      Examen de Suficiencia (Reglamento UES)
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900">
                      Obtuviste <strong>{stats.notaAcumulada.toFixed(2)}</strong> al completar el
                      100% del ciclo (rango 5.00 – 5.94). Necesitas al menos{' '}
                      <strong>{stats.notaMinimaSuficiencia?.toFixed(2)}</strong> en el examen de
                      suficiencia para alcanzar la nota final aprobatoria de{' '}
                      <strong>{NOTA_MINIMA_APROBACION.toFixed(2)}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div>
                  <label
                    htmlFor="nota-suficiencia"
                    className="block text-xs font-semibold text-amber-950"
                  >
                    Nota Examen de Suficiencia (0.00 - 10.00)
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      id="nota-suficiencia"
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={sufInput}
                      onChange={(e) => handleSuficienciaChange(e.target.value)}
                      placeholder={`Ej. ${stats.notaMinimaSuficiencia?.toFixed(2)}`}
                      className="w-36 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                    />
                    {sufInput !== '' && (
                      <button
                        type="button"
                        onClick={() => handleSuficienciaChange('')}
                        className="cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {stats.tieneSuficiencia && (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white px-4 py-2.5">
                    <div>
                      <span className="block text-[11px] text-slate-500">
                        Nota Final = ({stats.notaAcumulada.toFixed(2)} +{' '}
                        {Number(record.notaSuficiencia).toFixed(2)}) / 2
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {stats.notaFinal.toFixed(2)}
                      </span>
                    </div>
                    {stats.estadoDinamico === 'aprobada' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4" />
                        Aprobada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                        <XCircle className="h-4 w-4" />
                        Reprobada
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Add New Evaluation Form */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">Agregar evaluación</h3>
              <span className="text-xs font-medium text-slate-600">
                Disponible para planificar:{' '}
                <strong className="text-slate-900">{stats.porcentajeDisponiblePlanificar}%</strong>
              </span>
            </div>

            <form
              onSubmit={handleAddEvaluation}
              className="grid grid-cols-1 gap-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-5">
                <label htmlFor="new-ev-name" className="sr-only">
                  Nombre de la evaluación
                </label>
                <input
                  id="new-ev-name"
                  type="text"
                  value={evNombre}
                  onChange={(e) => setEvNombre(e.target.value)}
                  placeholder="Ej. Parcial 1, Laboratorio 2..."
                  disabled={stats.porcentajeDisponiblePlanificar <= 0}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="new-ev-weight" className="sr-only">
                  Ponderación (%)
                </label>
                <input
                  id="new-ev-weight"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={stats.porcentajeDisponiblePlanificar || 100}
                  required
                  value={evPonderacion}
                  onChange={(e) => setEvPonderacion(e.target.value)}
                  placeholder="Pond. (%)"
                  disabled={stats.porcentajeDisponiblePlanificar <= 0}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="new-ev-grade" className="sr-only">
                  Calificación (opcional)
                </label>
                <input
                  id="new-ev-grade"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={evNota}
                  onChange={(e) => setEvNota(e.target.value)}
                  placeholder="Nota (opc.)"
                  disabled={stats.porcentajeDisponiblePlanificar <= 0}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={stats.porcentajeDisponiblePlanificar <= 0}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </button>
              </div>
            </form>

            {evError && (
              <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                {evError}
              </p>
            )}
          </section>

          {/* Evaluations Table */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Evaluaciones del ciclo ({evaluaciones.length})
              </h3>
              {stats.estadoDinamico === 'aprobada_anticipada' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <Award className="h-3.5 w-3.5" />
                  Aprobación asegurada
                </span>
              )}
            </div>

            {evaluaciones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500">
                Aún no has registrado evaluaciones. Puedes planificar toda la rúbrica del ciclo
                dejando las notas vacías y digitarlas conforme las recibas.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Evaluación</th>
                      <th className="px-3 py-2.5 text-center">Pond.</th>
                      <th className="px-3 py-2.5 text-center">Nota</th>
                      <th className="px-3 py-2.5 text-right">Aporte</th>
                      <th className="px-3 py-2.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {evaluaciones.map((ev) => {
                      const isEditing = editingEvalId === ev.id;
                      const hasGrade = ev.nota !== null && ev.nota !== undefined;
                      const aporte = hasGrade
                        ? calcularAporteEvaluacion(ev.nota, ev.ponderacion)
                        : null;

                      if (isEditing) {
                        return (
                          <tr key={ev.id} className="bg-slate-50/80">
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-red-700 focus:outline-none"
                              />
                              {editError && (
                                <span className="mt-1 block text-[11px] text-red-700">
                                  {editError}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="100"
                                value={editPonderacion}
                                onChange={(e) => setEditPonderacion(e.target.value)}
                                className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-red-700 focus:outline-none"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="10"
                                value={editNota}
                                onChange={(e) => setEditNota(e.target.value)}
                                placeholder="Vacío"
                                className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center text-xs focus:border-red-700 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-slate-400">—</td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => saveEditRow(ev)}
                                  aria-label="Guardar evaluación"
                                  className="cursor-pointer rounded bg-emerald-600 p-1 text-white hover:bg-emerald-700"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEvalId(null)}
                                  aria-label="Cancelar edición"
                                  className="cursor-pointer rounded bg-slate-200 p-1 text-slate-700 hover:bg-slate-300"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={ev.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 font-medium text-slate-900">{ev.nombre}</td>
                          <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-700">
                            {ev.ponderacion}%
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              aria-label={`Nota de ${ev.nombre}`}
                              defaultValue={hasGrade ? ev.nota : ''}
                              key={`${ev.id}-${ev.nota ?? 'empty'}`}
                              onBlur={(e) => handleQuickGradeChange(ev.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              placeholder="—"
                              className="w-20 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs font-semibold text-slate-900 transition hover:border-slate-300 focus:border-red-700 focus:bg-white focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs">
                            {hasGrade ? (
                              <span className="font-semibold text-slate-900">
                                {Number(ev.nota).toFixed(2)} × {ev.ponderacion}% ={' '}
                                <strong className="text-red-800">{aporte.toFixed(2)}</strong>
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-sans text-[11px] font-medium text-slate-500">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditRow(ev)}
                                title="Editar fila"
                                className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteEvaluation(nc, ev.id)}
                                title="Eliminar evaluación"
                                className="cursor-pointer rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div>
            {confirmUnenroll ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-red-800">
                  ¿Retirar materia y borrar sus {evaluaciones.length} evaluaciones?
                </span>
                <button
                  type="button"
                  onClick={handleUnenrollClick}
                  className="cursor-pointer rounded-md bg-red-700 px-2.5 py-1 font-semibold text-white hover:bg-red-800"
                >
                  Sí, retirar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUnenroll(false)}
                  className="cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUnenrollClick}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-red-700 hover:text-red-900"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Retirar materia del ciclo
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
