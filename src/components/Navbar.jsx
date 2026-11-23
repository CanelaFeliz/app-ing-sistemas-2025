import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Download,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  User,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { TOTAL_UV_PLAN } from '../utils/academicRules';

const CICLO_OPTIONS = ['Ciclo I', 'Ciclo II', 'Ciclo Extraordinario'];

function parseCicloString(cicloStr) {
  const fallbackYear = new Date().getFullYear();
  if (!cicloStr || typeof cicloStr !== 'string') {
    return { periodo: 'Ciclo I', anio: fallbackYear };
  }
  const match = cicloStr.match(/^(Ciclo I|Ciclo II|Ciclo Extraordinario)\s+(\d{4})$/);
  if (match) {
    return { periodo: match[1], anio: Number(match[2]) };
  }
  return { periodo: 'Ciclo I', anio: fallbackYear };
}

export default function Navbar({ activeTab, onChangeTab }) {
  const {
    progress,
    hasUnsavedChanges,
    metrics,
    updateCicloActual,
    exportToJson,
    resetSession,
  } = useProgress();

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { periodo, anio } = useMemo(
    () => parseCicloString(progress?.metadata?.cicloActual),
    [progress?.metadata?.cicloActual]
  );

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const start = Math.min(2025, anio - 1);
    const end = Math.max(current + 4, anio + 2);
    const years = [];
    for (let y = start; y <= end; y += 1) {
      years.push(y);
    }
    return years;
  }, [anio]);

  const handlePeriodoChange = (e) => {
    updateCicloActual(`${e.target.value} ${anio}`);
  };

  const handleAnioChange = (e) => {
    updateCicloActual(`${periodo} ${e.target.value}`);
  };

  const handleSwitchFileClick = () => {
    if (hasUnsavedChanges) {
      setShowResetConfirm(true);
    } else {
      resetSession();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3.5">
            {/* Brand + Student Info */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-800 text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                    {progress.metadata.nombre}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                    <User className="h-3 w-3 text-slate-500" />
                    {progress.metadata.carnet}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Ing. de Sistemas Informáticos · Plan 2025 (UES - FIA)
                </p>
              </div>
            </div>

            {/* Right Controls: Cycle Selector + Quick Metrics + Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Editable Cycle Selector */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                <select
                  aria-label="Periodo del ciclo actual"
                  value={periodo}
                  onChange={handlePeriodoChange}
                  className="bg-transparent text-xs font-medium text-slate-800 focus:outline-none sm:text-sm"
                >
                  {CICLO_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Año del ciclo actual"
                  value={anio}
                  onChange={handleAnioChange}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none sm:text-sm"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Metrics */}
              <div className="flex items-center divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                <div className="pr-3 text-center">
                  <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    CUM
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {metrics.uvConNota > 0 ? metrics.cum.toFixed(2) : '—'}
                  </span>
                </div>
                <div className="pl-3 text-center">
                  <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    U.V. Aprobadas
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {metrics.uvAprobadas}{' '}
                    <span className="font-normal text-slate-400">/ {TOTAL_UV_PLAN}</span>
                  </span>
                </div>
              </div>

              {/* Unsaved Changes Badge */}
              {hasUnsavedChanges && (
                <span
                  title="Tienes cambios guardados localmente que aún no has exportado a tu archivo .json"
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Cambios sin exportar
                </span>
              )}

              {/* Export & Switch File Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportToJson}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 focus:ring-2 focus:ring-slate-400 focus:outline-none sm:text-sm"
                >
                  <Download className="h-4 w-4" />
                  Exportar .json
                </button>
                <button
                  type="button"
                  onClick={handleSwitchFileClick}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 focus:ring-2 focus:ring-slate-300 focus:outline-none sm:text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Cambiar archivo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="-mb-px flex gap-6" aria-label="Secciones principales">
            <button
              type="button"
              onClick={() => onChangeTab('dashboard')}
              className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition ${
                activeTab === 'dashboard'
                  ? 'border-red-800 text-red-800'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Ciclo Actual
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('pensum')}
              className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition ${
                activeTab === 'pensum'
                  ? 'border-red-800 text-red-800'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Pensum Completo
            </button>
          </nav>
        </div>
      </header>

      {/* Confirmation Modal for Switching File with Unsaved Changes */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-reset-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 id="confirm-reset-title" className="text-base font-semibold text-slate-900">
                  Tienes cambios sin exportar
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Si cambias de archivo ahora, se limpiará la sesión actual en este navegador.
                  ¿Deseas exportar tu respaldo{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-semibold">
                    progreso_{progress.metadata.carnet}.json
                  </code>{' '}
                  antes de salir?
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="cursor-pointer rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  exportToJson();
                  setShowResetConfirm(false);
                }}
                className="cursor-pointer rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Exportar primero
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  resetSession();
                }}
                className="cursor-pointer rounded-lg bg-red-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-800"
              >
                Salir sin exportar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
