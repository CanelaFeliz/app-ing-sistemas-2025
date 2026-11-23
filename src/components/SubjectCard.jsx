import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import {
  calcularEvaluacionesEnCurso,
  NOTA_MINIMA_APROBACION,
} from '../utils/academicRules';

const STATUS_STYLES = {
  aprobada: {
    label: 'Aprobada',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accent: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  aprobada_anticipada: {
    label: 'Meta alcanzada',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    accent: 'bg-emerald-500',
    icon: Award,
  },
  en_curso: {
    label: 'En curso',
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
    accent: 'bg-blue-500',
    icon: Clock,
  },
  suficiencia: {
    label: 'Derecho a suficiencia',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    accent: 'bg-amber-500',
    icon: AlertTriangle,
  },
  en_riesgo: {
    label: 'En riesgo',
    badge: 'bg-orange-50 text-orange-800 border-orange-200',
    accent: 'bg-orange-500',
    icon: AlertTriangle,
  },
  reprobada: {
    label: 'Reprobada',
    badge: 'bg-red-50 text-red-800 border-red-200',
    accent: 'bg-red-500',
    icon: XCircle,
  },
};

export default function SubjectCard({ materia, record, onOpen }) {
  const stats = calcularEvaluacionesEnCurso(record?.evaluaciones || [], record?.notaSuficiencia);
  const statusInfo = STATUS_STYLES[stats.estadoDinamico] || STATUS_STYLES.en_curso;
  const StatusIcon = statusInfo.icon;

  const displayCodigo =
    materia.esElectiva && record?.electivaInfo?.codigo
      ? record.electivaInfo.codigo
      : materia.codigo;

  const displayNombre =
    materia.esElectiva && record?.electivaInfo?.nombre
      ? record.electivaInfo.nombre
      : materia.nombre;

  const gradeToDisplay = stats.tieneSuficiencia ? stats.notaFinal : stats.notaAcumulada;
  const gradeLabel = stats.tieneSuficiencia ? 'Nota Final (con suficiencia)' : 'Nota acumulada';
  const progressToPass = Math.min(100, Math.round((gradeToDisplay / NOTA_MINIMA_APROBACION) * 100));

  return (
    <article
      onClick={() => onOpen(materia.nc)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(materia.nc);
        }
      }}
      className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition hover:border-slate-300 hover:shadow-md focus:ring-2 focus:ring-red-700/30 focus:outline-none"
    >
      <div>
        {/* Top Row: Code + Elective Tag + UV + Status */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
              {displayCodigo}
            </span>
            <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80">
              {materia.uv} U.V.
            </span>
            {materia.esElectiva && (
              <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200/70">
                Electiva
              </span>
            )}
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badge}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusInfo.label}
          </span>
        </div>

        {/* Subject Title */}
        <h3 className="mt-3 line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-red-800">
          {displayNombre}
        </h3>

        {/* Main Grade Display */}
        <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-50 px-3.5 py-3">
          <div>
            <span className="block text-[11px] font-medium text-slate-500">{gradeLabel}</span>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {gradeToDisplay.toFixed(2)}
              </span>
              <span className="text-xs font-medium text-slate-400">/ 10.00</span>
            </div>
          </div>

          <div className="text-right">
            {stats.estadoDinamico === 'aprobada' || stats.estadoDinamico === 'aprobada_anticipada' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ¡Meta alcanzada!
              </span>
            ) : stats.estadoDinamico === 'suficiencia' ? (
              <span className="text-xs font-semibold text-amber-700">
                Req. {stats.notaMinimaSuficiencia?.toFixed(2)} en suf.
              </span>
            ) : stats.estadoDinamico === 'reprobada' ? (
              <span className="text-xs font-semibold text-red-700">Ciclo reprobado</span>
            ) : (
              <div>
                <span className="block text-[11px] text-slate-500">Para {NOTA_MINIMA_APROBACION.toFixed(2)}</span>
                <span className="text-xs font-bold text-slate-800">
                  Faltan {stats.faltanteParaAprobar.toFixed(2)} pts
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Helpful Insight Message */}
        <p className="mt-3 min-h-[2.25rem] text-xs leading-relaxed text-slate-600">
          {stats.estadoDinamico === 'aprobada' && stats.tieneSuficiencia ? (
            <>
              Aprobada tras suficiencia (Ciclo {stats.notaAcumulada.toFixed(2)} + Suf.{' '}
              {Number(record.notaSuficiencia).toFixed(2)}).
            </>
          ) : stats.estadoDinamico === 'aprobada' ? (
            <>Has completado el 100% de evaluaciones aprobando la asignatura.</>
          ) : stats.estadoDinamico === 'aprobada_anticipada' ? (
            <>
              Ya superaste {NOTA_MINIMA_APROBACION.toFixed(2)} con el {stats.porcentajeEvaluado}%
              evaluado. Queda {stats.porcentajeRestante}% por sumar.
            </>
          ) : stats.estadoDinamico === 'suficiencia' ? (
            <>
              Necesitas al menos{' '}
              <strong className="text-amber-800">{stats.notaMinimaSuficiencia?.toFixed(2)}</strong>{' '}
              en el examen de suficiencia para promediar {NOTA_MINIMA_APROBACION.toFixed(2)}.
            </>
          ) : stats.estadoDinamico === 'reprobada' ? (
            stats.tieneSuficiencia ? (
              <>
                Promedio con suficiencia ({stats.notaFinal.toFixed(2)}) menor a{' '}
                {NOTA_MINIMA_APROBACION.toFixed(2)}.
              </>
            ) : (
              <>Evaluación completa por debajo de 5.00 (sin derecho a suficiencia).</>
            )
          ) : stats.estadoDinamico === 'en_riesgo' ? (
            stats.puedeAspirarSuficiencia ? (
              <>
                No alcanzas {NOTA_MINIMA_APROBACION.toFixed(2)} en ordinario, pero puedes optar a
                suficiencia promediando{' '}
                <strong className="text-orange-800">
                  {stats.promedioNecesarioSuficiencia?.toFixed(2)}
                </strong>{' '}
                en el {stats.porcentajeRestante}% restante.
              </>
            ) : (
              <>
                Matemáticamente imposible alcanzar 5.00 en el {stats.porcentajeRestante}% restante.
              </>
            )
          ) : stats.porcentajeRestante > 0 && stats.promedioNecesarioRestante !== null ? (
            <>
              Necesitas <strong className="text-slate-900">{stats.promedioNecesarioRestante.toFixed(2)}</strong>{' '}
              de promedio en el <strong>{stats.porcentajeRestante}%</strong> restante.
            </>
          ) : (
            <>Agrega tus evaluaciones para calcular tu proyección.</>
          )}
        </p>

        {/* Progress Bars */}
        <div className="mt-3 space-y-2">
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Evaluado</span>
              <span className="font-semibold text-slate-700">{stats.porcentajeEvaluado}% de 100%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-700 transition-all duration-300"
                style={{ width: `${Math.min(100, stats.porcentajeEvaluado)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Progreso hacia aprobación ({NOTA_MINIMA_APROBACION.toFixed(2)})</span>
              <span className="font-semibold text-slate-700">{progressToPass}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${statusInfo.accent}`}
                style={{ width: `${progressToPass}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-700 group-hover:text-red-800">
        <span className="inline-flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Gestionar evaluaciones
        </span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </article>
  );
}
