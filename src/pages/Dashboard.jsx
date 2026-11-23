import { CheckCircle2, Clock, Layers, Sparkles } from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { TOTAL_MATERIAS_PLAN, TOTAL_UV_PLAN } from '../utils/academicRules';

export default function Dashboard() {
  const { pensum, progress, metrics, hasUnsavedChanges } = useProgress();

  const totalUVCatalogo = pensum.reduce((acc, m) => acc + m.uv, 0);
  const materiasEnCurso = Object.values(progress?.materias || {}).filter(
    (m) => m.estado === 'en_curso'
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
              <Sparkles className="h-3.5 w-3.5" />
              Fase 1 · Base verificada
            </span>
            <h1 className="mt-2 text-xl font-bold text-slate-900">
              Ciclo Actual — {progress.metadata.cicloActual}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Vista temporal de verificación. En la <strong>Fase 2</strong> se implementarán las
              tarjetas de materias en curso, el gestor de evaluaciones y el flujo de examen de
              suficiencia.
            </p>
          </div>
        </div>

        {/* Technical Summary Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Layers className="h-4 w-4 text-slate-400" />
              Catálogo oficial cargado
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {pensum.length} <span className="text-sm font-normal text-slate-500">/ {TOTAL_MATERIAS_PLAN}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Suma total: {totalUVCatalogo} / {TOTAL_UV_PLAN} U.V.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Avance registrado
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {metrics.porcentajeAvance.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {metrics.materiasAprobadas} aprobadas · {metrics.uvAprobadas} U.V.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Clock className="h-4 w-4 text-blue-600" />
              Materias en curso
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{materiasEnCurso}</p>
            <p className="mt-1 text-xs text-slate-500">
              CUM actual: {metrics.uvConNota > 0 ? metrics.cum.toFixed(2) : 'Sin notas aún'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              Estado de persistencia
            </div>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {hasUnsavedChanges ? 'Auto-guardado local' : 'Sincronizado (.json)'}
            </p>
            <p className="mt-1 truncate text-xs text-slate-500">
              Plan {progress.metadata.versionPlan} · {progress.metadata.carnet}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
