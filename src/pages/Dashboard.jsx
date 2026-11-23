import { useMemo, useState } from 'react';
import {
  BookPlus,
  CheckCircle2,
  Download,
  Flag,
  Layers,
  Plus,
  X,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import SubjectCard from '../components/SubjectCard';
import EnrollSubjectModal from '../components/EnrollSubjectModal';
import SubjectDetailModal from '../components/SubjectDetailModal';
import FinishCycleModal from '../components/FinishCycleModal';

export default function Dashboard() {
  const { pensum, progress, exportToJson } = useProgress();

  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedSubjectNC, setSelectedSubjectNC] = useState(null);
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [cycleClosedNotice, setCycleClosedNotice] = useState(null);

  const enrolledItems = useMemo(() => {
    const materiasUsuario = progress?.materias || {};
    return pensum
      .filter((m) => materiasUsuario[String(m.nc)]?.estado === 'en_curso')
      .map((materia) => ({
        materia,
        record: materiasUsuario[String(materia.nc)],
      }));
  }, [pensum, progress]);

  const totalUVEnCurso = useMemo(
    () => enrolledItems.reduce((sum, item) => sum + item.materia.uv, 0),
    [enrolledItems]
  );

  return (
    <div className="space-y-6">
      {/* Post-Cycle Closure Export Reminder Banner */}
      {cycleClosedNotice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-950"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-semibold">
                ¡{cycleClosedNotice.cicloCerrado} finalizado! Ahora estás en{' '}
                {cycleClosedNotice.nuevoCiclo}.
              </p>
              <p className="mt-0.5 text-xs text-emerald-800">
                Resultado: {cycleClosedNotice.aprobadas} aprobada
                {cycleClosedNotice.aprobadas === 1 ? '' : 's'}
                {cycleClosedNotice.reprobadas > 0
                  ? `, ${cycleClosedNotice.reprobadas} reprobada${cycleClosedNotice.reprobadas === 1 ? '' : 's'}`
                  : ''}
                {cycleClosedNotice.devueltasPendiente > 0
                  ? `, ${cycleClosedNotice.devueltasPendiente} devuelta${cycleClosedNotice.devueltasPendiente === 1 ? '' : 's'} a pendiente`
                  : ''}
                . Recuerda exportar tu archivo <code className="font-mono">.json</code> para
                respaldar tu historial actualizado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportToJson();
                setCycleClosedNotice(null);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar .json ahora
            </button>
            <button
              type="button"
              onClick={() => setCycleClosedNotice(null)}
              aria-label="Cerrar aviso"
              className="cursor-pointer rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {progress.metadata.cicloActual}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-400" />
              <strong>{enrolledItems.length}</strong>{' '}
              {enrolledItems.length === 1 ? 'materia inscrita' : 'materias inscritas'}
            </span>
            <span className="text-slate-300">•</span>
            <span>
              <strong>{totalUVEnCurso}</strong> U.V. en curso
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {enrolledItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsFinishOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Flag className="h-4 w-4 text-slate-500" />
              Finalizar ciclo
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEnrollOpen(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-red-900"
          >
            <Plus className="h-4 w-4" />
            Inscribir materia
          </button>
        </div>
      </div>

      {/* Empty State or Subject Cards Grid */}
      {enrolledItems.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-800">
            <BookPlus className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No tienes materias inscritas en {progress.metadata.cicloActual}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-slate-600">
            Inscribe tus asignaturas del ciclo para planificar evaluaciones, llevar el control de
            tu nota acumulada y calcular automáticamente cuánto necesitas para aprobar.
          </p>
          <button
            type="button"
            onClick={() => setIsEnrollOpen(true)}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-red-800 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-red-900"
          >
            <Plus className="h-4 w-4" />
            Inscribir primera materia
          </button>
        </section>
      ) : (
        <section
          aria-label="Materias inscritas en el ciclo actual"
          className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {enrolledItems.map(({ materia, record }) => (
            <SubjectCard
              key={materia.nc}
              materia={materia}
              record={record}
              onOpen={(nc) => setSelectedSubjectNC(nc)}
            />
          ))}
        </section>
      )}

      {/* Modals */}
      <EnrollSubjectModal isOpen={isEnrollOpen} onClose={() => setIsEnrollOpen(false)} />

      {selectedSubjectNC !== null && (
        <SubjectDetailModal
          nc={selectedSubjectNC}
          onClose={() => setSelectedSubjectNC(null)}
        />
      )}

      <FinishCycleModal
        isOpen={isFinishOpen}
        onClose={() => setIsFinishOpen(false)}
        onCompleted={(notice) => setCycleClosedNotice(notice)}
      />
    </div>
  );
}
