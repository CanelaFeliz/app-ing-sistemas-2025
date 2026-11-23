import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  X,
  XCircle,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import {
  calcularEvaluacionesEnCurso,
  NOTA_MINIMA_APROBACION,
  sugerirSiguienteCiclo,
} from '../utils/academicRules';

const CICLO_OPTIONS = ['Ciclo I', 'Ciclo II', 'Ciclo Extraordinario'];

export default function FinishCycleModal({ isOpen, onClose, onCompleted }) {
  const { pensum, progress, finishCycle } = useProgress();

  const suggested = useMemo(
    () => sugerirSiguienteCiclo(progress?.metadata?.cicloActual),
    [progress?.metadata?.cicloActual]
  );

  const [nextPeriodo, setNextPeriodo] = useState(suggested.periodo);
  const [nextAnio, setNextAnio] = useState(suggested.anio);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNextPeriodo(suggested.periodo);
      setNextAnio(suggested.anio);
      setConfirmIncomplete(false);
    }
  }, [isOpen, suggested.periodo, suggested.anio]);

  const reviewItems = useMemo(() => {
    const materiasUsuario = progress?.materias || {};
    return pensum
      .filter((m) => materiasUsuario[String(m.nc)]?.estado === 'en_curso')
      .map((materia) => {
        const record = materiasUsuario[String(materia.nc)];
        const stats = calcularEvaluacionesEnCurso(
          record.evaluaciones || [],
          record.notaSuficiencia
        );

        let destino = 'pendiente';
        let destinoLabel = 'Vuelve a pendiente (incompleta)';
        let isWarning = true;

        if (stats.notaFinal >= NOTA_MINIMA_APROBACION) {
          destino = 'aprobada';
          destinoLabel = stats.evaluacionCompleta
            ? 'Pasa a Aprobada'
            : 'Pasa a Aprobada (meta alcanzada)';
          isWarning = false;
        } else if (stats.estadoDinamico === 'reprobada') {
          destino = 'reprobada';
          destinoLabel = 'Reprobada (vuelve a pendiente)';
          isWarning = false;
        } else if (stats.estadoDinamico === 'suficiencia') {
          destino = 'suficiencia_pendiente';
          destinoLabel = 'Pendiente de suficiencia (volverá a pendiente)';
          isWarning = true;
        }

        const displayCodigo =
          materia.esElectiva && record.electivaInfo?.codigo
            ? record.electivaInfo.codigo
            : materia.codigo;
        const displayNombre =
          materia.esElectiva && record.electivaInfo?.nombre
            ? record.electivaInfo.nombre
            : materia.nombre;

        return {
          materia,
          displayCodigo,
          displayNombre,
          stats,
          destino,
          destinoLabel,
          isWarning,
        };
      });
  }, [pensum, progress]);

  if (!isOpen) return null;

  const warningCount = reviewItems.filter((item) => item.isWarning).length;
  const approvedCount = reviewItems.filter((item) => item.destino === 'aprobada').length;
  const approvedUV = reviewItems
    .filter((item) => item.destino === 'aprobada')
    .reduce((acc, item) => acc + item.materia.uv, 0);

  const canConfirm = reviewItems.length > 0 && (warningCount === 0 || confirmIncomplete);

  const yearOptions = [];
  const baseYear = Math.min(2025, nextAnio - 1);
  for (let y = baseYear; y <= nextAnio + 4; y += 1) {
    yearOptions.push(y);
  }

  const handleConfirm = () => {
    if (!canConfirm) return;
    const nuevoCiclo = `${nextPeriodo} ${nextAnio}`;
    const closedCycle = progress.metadata.cicloActual;
    const summary = finishCycle(nuevoCiclo);
    onClose();
    if (onCompleted) {
      onCompleted({
        cicloCerrado: closedCycle,
        nuevoCiclo,
        ...summary,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-cycle-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-800">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h2 id="finish-cycle-title" className="text-lg font-bold text-slate-900">
                Finalizar {progress?.metadata?.cicloActual}
              </h2>
              <p className="text-xs text-slate-500">
                Revisa el resultado de cada materia antes de cerrar el ciclo.
              </p>
            </div>
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

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <span className="block text-[11px] font-medium text-emerald-800">
                Aprobarán este ciclo
              </span>
              <span className="mt-0.5 block text-lg font-bold text-emerald-950">
                {approvedCount} materias ({approvedUV} U.V.)
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="block text-[11px] font-medium text-slate-600">
                Total en revisión
              </span>
              <span className="mt-0.5 block text-lg font-bold text-slate-900">
                {reviewItems.length} materias
              </span>
            </div>
            <div
              className={`col-span-2 rounded-xl border p-3 sm:col-span-1 ${
                warningCount > 0
                  ? 'border-amber-200 bg-amber-50/70'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <span
                className={`block text-[11px] font-medium ${
                  warningCount > 0 ? 'text-amber-800' : 'text-slate-600'
                }`}
              >
                Pendientes / Incompletas
              </span>
              <span
                className={`mt-0.5 block text-lg font-bold ${
                  warningCount > 0 ? 'text-amber-950' : 'text-slate-900'
                }`}
              >
                {warningCount}
              </span>
            </div>
          </div>

          {/* Review Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Asignatura</th>
                  <th className="px-3 py-2.5 text-center">Evaluado</th>
                  <th className="px-3 py-2.5 text-center">Nota Final</th>
                  <th className="px-4 py-2.5">Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {reviewItems.map((item) => (
                  <tr key={item.materia.nc}>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {item.displayCodigo}
                      </span>
                      <span className="block text-xs text-slate-600">{item.displayNombre}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-600">
                      {item.stats.porcentajeEvaluado}%
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-sm font-bold text-slate-900">
                      {item.stats.notaFinal.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {item.destino === 'aprobada' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {item.destinoLabel}
                        </span>
                      ) : item.destino === 'reprobada' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                          <XCircle className="h-3.5 w-3.5" />
                          {item.destinoLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                          <Clock className="h-3.5 w-3.5" />
                          {item.destinoLabel}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Warning Confirmation for Incomplete / Pending Suficiencia */}
          {warningCount > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="text-xs text-amber-950">
                  <p className="font-bold">
                    Tienes {warningCount} materia{warningCount > 1 ? 's' : ''} incompleta
                    {warningCount > 1 ? 's' : ''} o pendiente{warningCount > 1 ? 's' : ''} de
                    suficiencia.
                  </p>
                  <p className="mt-1 text-amber-900">
                    Si cierras el ciclo ahora, esas asignaturas volverán a estado pendiente y se
                    descartarán sus evaluaciones parciales.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={confirmIncomplete}
                      onChange={(e) => setConfirmIncomplete(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-400 text-amber-700 focus:ring-amber-600"
                    />
                    Confirmo que deseo cerrar el ciclo y devolverlas a pendientes
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Next Cycle Selector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-bold text-slate-800">
              Siguiente ciclo académico
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              Se actualizará automáticamente como tu nuevo ciclo activo.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <select
                aria-label="Periodo del siguiente ciclo"
                value={nextPeriodo}
                onChange={(e) => setNextPeriodo(e.target.value)}
                className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-red-700 focus:outline-none"
              >
                {CICLO_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <select
                aria-label="Año del siguiente ciclo"
                value={nextAnio}
                onChange={(e) => setNextAnio(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-red-700 focus:outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Confirmar cierre de ciclo
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
