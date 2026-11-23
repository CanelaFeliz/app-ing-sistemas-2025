import { CheckCircle2, Clock, Lock, Sparkles } from 'lucide-react';

/**
 * Formatea la etiqueta inferior de prerrequisitos tal como aparece en el pensum oficial.
 */
function formatPrereqLabel(materia) {
  if (materia.prerrequisitoUV > 0) {
    return `${materia.prerrequisitoUV} U.V.`;
  }
  if (!materia.prerrequisitosNC || materia.prerrequisitosNC.length === 0) {
    return materia.esElectiva ? 'Libre' : 'B';
  }
  return materia.prerrequisitosNC.join(', ');
}

/**
 * Tarjeta compacta de asignatura dentro de la malla curricular.
 * Soporta Modo Historial (Real) y Modo Proyección (Simulador) + resaltado por hover.
 */
export default function PensumNode({
  materia,
  record,
  visualStatus, // 'aprobada' | 'en_curso' | 'en_curso_proyectada' | 'proyectada' | 'habilitada' | 'habilitada_nueva' | 'bloqueada'
  highlightRole, // 'hovered' | 'prerequisite' | 'dependent' | 'dimmed' | 'none'
  isProjectionMode,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) {
  const displayCodigo =
    materia.esElectiva && record?.electivaInfo?.codigo
      ? record.electivaInfo.codigo
      : materia.codigo;

  const displayNombre =
    materia.esElectiva && record?.electivaInfo?.nombre
      ? record.electivaInfo.nombre
      : materia.nombre;

  const prereqLabel = formatPrereqLabel(materia);

  // Estilos base por estado visual
  let cardStyle = 'border-slate-200 bg-white text-slate-900 hover:border-slate-400';
  let headerBg = 'bg-slate-100 text-slate-600';

  if (visualStatus === 'aprobada') {
    cardStyle = 'border-emerald-300 bg-emerald-50/70 text-emerald-950 hover:border-emerald-500';
    headerBg = 'bg-emerald-100/90 text-emerald-800';
  } else if (visualStatus === 'en_curso') {
    cardStyle = 'border-blue-300 bg-blue-50/70 text-blue-950 hover:border-blue-500';
    headerBg = 'bg-blue-100/90 text-blue-800';
  } else if (visualStatus === 'en_curso_proyectada') {
    cardStyle = 'border-sky-400 border-dashed bg-sky-50/80 text-sky-950';
    headerBg = 'bg-sky-100 text-sky-800';
  } else if (visualStatus === 'proyectada') {
    cardStyle = 'border-indigo-500 border-dashed bg-indigo-50 text-indigo-950 hover:border-indigo-700';
    headerBg = 'bg-indigo-200/80 text-indigo-900';
  } else if (visualStatus === 'habilitada_nueva') {
    cardStyle = 'border-violet-400 bg-violet-50/50 text-slate-900 hover:border-violet-600 ring-1 ring-violet-300/60';
    headerBg = 'bg-violet-100 text-violet-800';
  } else if (visualStatus === 'habilitada') {
    cardStyle = isProjectionMode
      ? 'border-slate-300 bg-white text-slate-900 hover:border-indigo-500 hover:bg-indigo-50/30'
      : 'border-slate-300 bg-white text-slate-900 hover:border-red-700/60';
    headerBg = 'bg-slate-100 text-slate-700';
  } else if (visualStatus === 'bloqueada') {
    cardStyle = 'border-slate-200/90 bg-slate-50/90 text-slate-400 hover:border-slate-300';
    headerBg = 'bg-slate-100/80 text-slate-400';
  }

  // Estilos de resaltado interactivo al hacer hover
  let highlightClasses = '';
  if (highlightRole === 'hovered') {
    highlightClasses = 'ring-2 ring-slate-900 shadow-md z-10 scale-[1.02]';
  } else if (highlightRole === 'prerequisite') {
    highlightClasses = 'ring-2 ring-amber-500 shadow-sm z-10 opacity-100';
  } else if (highlightRole === 'dependent') {
    highlightClasses = 'ring-2 ring-fuchsia-500 shadow-sm z-10 opacity-100';
  } else if (highlightRole === 'dimmed') {
    highlightClasses = 'opacity-40';
  }

  const hasGrade =
    record?.estado === 'aprobada' &&
    record?.notaFinal !== null &&
    record?.notaFinal !== undefined;

  return (
    <button
      type="button"
      onClick={() => onClick(materia)}
      onMouseEnter={() => onMouseEnter(materia.nc)}
      onMouseLeave={onMouseLeave}
      title={`${displayCodigo} — ${displayNombre}${
        materia.esCicloExtraordinario ? ' (Asignatura de ciclo extraordinario)' : ''
      }`}
      className={`group relative flex w-full cursor-pointer flex-col justify-between overflow-hidden rounded-xl border text-left transition-all duration-150 focus:ring-2 focus:ring-red-700/40 focus:outline-none ${cardStyle} ${highlightClasses}`}
    >
      {/* Top Row: NC (left) & UV (right) */}
      <div
        className={`flex items-center justify-between px-2 py-1 text-[10px] font-bold ${headerBg}`}
      >
        <span className="font-mono">NC {materia.nc}</span>
        <div className="flex items-center gap-1">
          {materia.esCicloExtraordinario && (
            <span
              title="Asignatura de ciclo extraordinario"
              className="rounded bg-white/70 px-1 text-[9px] font-extrabold text-amber-700"
            >
              **
            </span>
          )}
          <span className="font-mono">{materia.uv} UV</span>
        </div>
      </div>

      {/* Center: Code + Name */}
      <div className="flex flex-1 flex-col justify-center px-2.5 py-2">
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono text-xs font-extrabold tracking-tight">{displayCodigo}</span>
          {materia.esElectiva && (
            <span className="rounded bg-violet-100 px-1 py-0.2 text-[9px] font-bold text-violet-800">
              Electiva
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-3 text-[11px] leading-snug font-medium">{displayNombre}</p>
      </div>

      {/* Bottom Row: Prereqs & Status / Grade */}
      <div className="flex items-center justify-between border-t border-black/5 px-2 py-1 text-[10px]">
        <span className="truncate font-mono opacity-80" title={`Prerrequisitos: ${prereqLabel}`}>
          P: {prereqLabel}
        </span>

        {visualStatus === 'aprobada' && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
            {hasGrade ? Number(record.notaFinal).toFixed(2) : 'Aprob.'}
          </span>
        )}

        {visualStatus === 'en_curso' && (
          <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-blue-700">
            <Clock className="h-3 w-3" />
            Curso
          </span>
        )}

        {visualStatus === 'en_curso_proyectada' && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-sky-600 px-1 py-0.2 text-[9px] font-bold text-white">
            En curso
          </span>
        )}

        {visualStatus === 'proyectada' && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Proy.
          </span>
        )}

        {visualStatus === 'habilitada_nueva' && (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-violet-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
            <Sparkles className="h-2.5 w-2.5" />
            Nueva
          </span>
        )}

        {visualStatus === 'bloqueada' && (
          <Lock className="h-3 w-3 shrink-0 text-slate-400" />
        )}
      </div>
    </button>
  );
}
