import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { TOTAL_UV_PLAN } from '../utils/academicRules';

const UV_MILESTONES = [
  { uv: 70, code: 'FMP115' },
  { uv: 152, code: 'MEI115' },
  { uv: 175, code: 'TAG115' },
];

export default function ProjectionToolbar({
  realUV,
  projectedUV,
  inProgressCount,
  assumeInProgressApproved,
  onToggleAssumeInProgress,
  simulatedCount,
  newlyUnlockedSubjects,
  alreadyUnlockedSubjects,
  onResetProjection,
}) {
  const [showUnlockedPanel, setShowUnlockedPanel] = useState(false);

  const totalUnlockedCount = newlyUnlockedSubjects.length + alreadyUnlockedSubjects.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 shadow-2xs">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-indigo-950 sm:text-base">
                Simulador de Proyección en Cascada
              </h2>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800">
                100% temporal · No modifica tu historial real
              </span>
            </div>
            <p className="mt-0.5 text-xs text-indigo-900/80">
              Haz clic en cualquier materia habilitada para simular su aprobación y ver qué nuevas
              asignaturas se desbloquean en cascada.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetProjection}
          disabled={simulatedCount === 0}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-800 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar proyección
        </button>
      </div>

      {/* Metrics + Toggle Strip */}
      <div className="grid grid-cols-1 gap-3 border-t border-indigo-100 bg-white/75 px-5 py-3.5 lg:grid-cols-12 lg:items-center">
        {/* U.V. Proyectadas + Milestones */}
        <div className="lg:col-span-5">
          <span className="block text-[11px] font-semibold text-slate-500 uppercase">
            U.V. Proyectadas
          </span>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium text-slate-500">{realUV} reales</span>
            <span className="text-slate-400">→</span>
            <span className="text-lg font-extrabold text-indigo-900">
              {projectedUV}{' '}
              <span className="text-xs font-medium text-slate-500">/ {TOTAL_UV_PLAN} U.V.</span>
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {UV_MILESTONES.map((m) => {
              const reached = projectedUV >= m.uv;
              return (
                <span
                  key={m.code}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    reached
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {reached && <CheckCircle2 className="h-2.5 w-2.5" />}
                  {m.uv} UV ({m.code})
                </span>
              );
            })}
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 gap-3 lg:col-span-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2">
            <span className="block text-[10px] font-semibold text-indigo-700 uppercase">
              Simuladas
            </span>
            <span className="text-lg font-bold text-indigo-950">{simulatedCount}</span>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2">
            <span className="block text-[10px] font-semibold text-violet-700 uppercase">
              Nuevas habilitadas
            </span>
            <span className="inline-flex items-center gap-1 text-lg font-bold text-violet-950">
              {newlyUnlockedSubjects.length}
              {newlyUnlockedSubjects.length > 0 && (
                <Sparkles className="h-4 w-4 text-violet-600" />
              )}
            </span>
          </div>
        </div>

        {/* Toggle Assume In-Progress */}
        <div className="lg:col-span-3">
          <label
            className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-xs select-none ${
              inProgressCount === 0
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                : 'border-indigo-200 bg-white text-slate-800 hover:bg-indigo-50/40'
            }`}
          >
            <input
              type="checkbox"
              disabled={inProgressCount === 0}
              checked={assumeInProgressApproved && inProgressCount > 0}
              onChange={(e) => onToggleAssumeInProgress(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <strong className="block font-semibold">
                Asumir en curso como aprobadas
              </strong>
              <span className="text-[11px] text-slate-500">
                {inProgressCount > 0
                  ? `${inProgressCount} materia${inProgressCount === 1 ? '' : 's'} en curso`
                  : 'Sin materias en curso'}
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Collapsible Unlocked Subjects Summary Panel */}
      <div className="border-t border-indigo-100 bg-indigo-50/40">
        <button
          type="button"
          onClick={() => setShowUnlockedPanel((prev) => !prev)}
          className="flex w-full cursor-pointer items-center justify-between px-5 py-2.5 text-left text-xs font-semibold text-indigo-950 hover:bg-indigo-100/50"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            Materias habilitadas en esta proyección ({totalUnlockedCount})
            {newlyUnlockedSubjects.length > 0 && (
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                +{newlyUnlockedSubjects.length} nuevas
              </span>
            )}
          </span>
          {showUnlockedPanel ? (
            <ChevronUp className="h-4 w-4 text-indigo-700" />
          ) : (
            <ChevronDown className="h-4 w-4 text-indigo-700" />
          )}
        </button>

        {showUnlockedPanel && (
          <div className="space-y-4 border-t border-indigo-100 bg-white px-5 py-4">
            {totalUnlockedCount === 0 ? (
              <p className="text-xs text-slate-500">
                No quedan materias pendientes habilitadas en esta proyección.
              </p>
            ) : (
              <>
                {newlyUnlockedSubjects.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold tracking-wider text-violet-700 uppercase">
                      Recién desbloqueadas por la proyección ({newlyUnlockedSubjects.length})
                    </h3>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {newlyUnlockedSubjects.map((m) => (
                        <div
                          key={m.nc}
                          className="flex items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-violet-950">{m.codigo}</span>
                            <span className="ml-1.5 text-[11px] text-violet-700">
                              Ciclo {m.ciclo}
                            </span>
                            <p className="truncate font-medium text-slate-800">{m.nombre}</p>
                          </div>
                          <span className="shrink-0 rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold text-violet-800">
                            {m.uv} UV
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {alreadyUnlockedSubjects.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Ya habilitadas previamente ({alreadyUnlockedSubjects.length})
                    </h3>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {alreadyUnlockedSubjects.map((m) => (
                        <div
                          key={m.nc}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-slate-800">{m.codigo}</span>
                            <span className="ml-1.5 text-[11px] text-slate-500">
                              Ciclo {m.ciclo}
                            </span>
                            <p className="truncate font-medium text-slate-700">{m.nombre}</p>
                          </div>
                          <span className="shrink-0 rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                            {m.uv} UV
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
