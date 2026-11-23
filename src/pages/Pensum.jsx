import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  History,
  Info,
  Search,
  Wand2,
  X,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import {
  evaluatePensumAvailability,
  getSubjectDependencies,
  pruneInvalidSimulatedSubjects,
} from '../utils/academicRules';
import PensumNode from '../components/PensumNode';
import PensumSubjectModal from '../components/PensumSubjectModal';
import ProjectionToolbar from '../components/ProjectionToolbar';

const ROMAN_CICLOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const STATUS_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'aprobada', label: 'Aprobadas' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'habilitada', label: 'Habilitadas' },
  { id: 'bloqueada', label: 'Bloqueadas' },
];

export default function Pensum({ onNavigateToDashboard }) {
  const { pensum, progress } = useProgress();

  // Modo: 'real' | 'projection'
  const [mode, setMode] = useState('real');

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(0); // 0 = Todos los años

  // Hover para resaltado de cadena de prerrequisitos
  const [hoveredNC, setHoveredNC] = useState(null);

  // Modal de detalle en Modo Historial
  const [selectedNC, setSelectedNC] = useState(null);

  // Estado aislado del Modo Proyección (nunca toca ProgressContext ni localStorage)
  const [simulatedNCs, setSimulatedNCs] = useState(() => new Set());
  const [assumeInProgress, setAssumeInProgress] = useState(true);
  const [toast, setToast] = useState(null);

  const isProjectionMode = mode === 'projection';

  const byNC = useMemo(() => new Map(pensum.map((m) => [m.nc, m])), [pensum]);

  // Auto-ocultar toast después de 4.5 segundos
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Conjuntos reales desde ProgressContext
  const { realApprovedSet, inProgressSet } = useMemo(() => {
    const materiasUsuario = progress?.materias || {};
    const approved = new Set();
    const inProg = new Set();

    for (const [ncKey, rec] of Object.entries(materiasUsuario)) {
      const id = Number(ncKey);
      if (rec?.estado === 'aprobada') approved.add(id);
      else if (rec?.estado === 'en_curso') inProg.add(id);
    }

    return { realApprovedSet: approved, inProgressSet: inProg };
  }, [progress]);

  // Disponibilidad en Modo Historial (Real)
  const realAvailability = useMemo(
    () => evaluatePensumAvailability(pensum, realApprovedSet),
    [pensum, realApprovedSet]
  );

  // Base aprobada para el Simulador (reales + opcionalmente en curso)
  const projectionBaseSet = useMemo(() => {
    if (assumeInProgress && inProgressSet.size > 0) {
      return new Set([...realApprovedSet, ...inProgressSet]);
    }
    return new Set(realApprovedSet);
  }, [realApprovedSet, inProgressSet, assumeInProgress]);

  // Conjunto total proyectado (base + simuladas)
  const projectionCombinedSet = useMemo(
    () => new Set([...projectionBaseSet, ...simulatedNCs]),
    [projectionBaseSet, simulatedNCs]
  );

  // Disponibilidad en Modo Proyección
  const projectionAvailability = useMemo(
    () => evaluatePensumAvailability(pensum, projectionCombinedSet),
    [pensum, projectionCombinedSet]
  );

  // Materias habilitadas en la proyección (distinguiendo nuevas vs ya habilitadas)
  const { newlyUnlockedSubjects, alreadyUnlockedSubjects, newlyUnlockedSet } = useMemo(() => {
    const newly = [];
    const already = [];
    const newSet = new Set();

    for (const m of pensum) {
      // Si ya está aprobada/en curso asumida/simulada, no es "pendiente habilitada"
      if (projectionCombinedSet.has(m.nc)) continue;

      const projState = projectionAvailability.byNC[m.nc];
      if (!projState?.isUnlocked) continue;

      const wasUnlockedInReal =
        !realApprovedSet.has(m.nc) &&
        !inProgressSet.has(m.nc) &&
        Boolean(realAvailability.byNC[m.nc]?.isUnlocked);

      if (wasUnlockedInReal) {
        already.push(m);
      } else {
        newly.push(m);
        newSet.add(m.nc);
      }
    }

    return {
      newlyUnlockedSubjects: newly,
      alreadyUnlockedSubjects: already,
      newlyUnlockedSet: newSet,
    };
  }, [
    pensum,
    projectionCombinedSet,
    projectionAvailability,
    realApprovedSet,
    inProgressSet,
    realAvailability,
  ]);

  // Dependencias del nodo actualmente en hover
  const hoverSets = useMemo(() => {
    if (hoveredNC === null) {
      return { prereqSet: new Set(), dependentSet: new Set() };
    }
    const { prerequisites, dependents } = getSubjectDependencies(hoveredNC, pensum);
    return {
      prereqSet: new Set(prerequisites.map((p) => p.nc)),
      dependentSet: new Set(dependents.map((d) => d.nc)),
    };
  }, [hoveredNC, pensum]);

  // Agrupar las 56 materias en 5 años y 10 ciclos
  const yearsStructure = useMemo(() => {
    const years = [];
    for (let anio = 1; anio <= 5; anio += 1) {
      const c1 = (anio - 1) * 2 + 1;
      const c2 = c1 + 1;
      years.push({
        anio,
        ciclos: [
          {
            ciclo: c1,
            materias: pensum.filter((m) => m.ciclo === c1).sort((a, b) => a.nc - b.nc),
          },
          {
            ciclo: c2,
            materias: pensum.filter((m) => m.ciclo === c2).sort((a, b) => a.nc - b.nc),
          },
        ],
      });
    }
    return years;
  }, [pensum]);

  // Cambiar toggle de "Asumir en curso como aprobadas" y podar simuladas inválidas si se desactiva
  const handleToggleAssumeInProgress = (checked) => {
    setAssumeInProgress(checked);
    const nextBase = checked
      ? new Set([...realApprovedSet, ...inProgressSet])
      : new Set(realApprovedSet);

    const { validSimulatedSet, removedNCs } = pruneInvalidSimulatedSubjects(
      pensum,
      nextBase,
      simulatedNCs
    );
    setSimulatedNCs(validSimulatedSet);

    if (removedNCs.length > 0) {
      const removedCodes = removedNCs.map((id) => byNC.get(id)?.codigo || `NC ${id}`).join(', ');
      setToast({
        type: 'info',
        message: `Se desmarcaron en cascada ${removedNCs.length} materia(s) proyectada(s) que dependían de tus materias en curso: ${removedCodes}.`,
      });
    }
  };

  // Clic en una tarjeta de la malla
  const handleNodeClick = (materia) => {
    if (!isProjectionMode) {
      setSelectedNC(materia.nc);
      return;
    }

    // Modo Proyección
    if (realApprovedSet.has(materia.nc)) {
      setToast({
        type: 'info',
        message: `${materia.codigo} ya está aprobada en tu historial real.`,
      });
      return;
    }

    if (assumeInProgress && inProgressSet.has(materia.nc)) {
      setToast({
        type: 'info',
        message: `${materia.codigo} está en curso y se asume aprobada en la proyección.`,
      });
      return;
    }

    // Si ya está simulada -> desmarcar y podar en cascada
    if (simulatedNCs.has(materia.nc)) {
      const nextSim = new Set(simulatedNCs);
      nextSim.delete(materia.nc);

      const { validSimulatedSet, removedNCs } = pruneInvalidSimulatedSubjects(
        pensum,
        projectionBaseSet,
        nextSim
      );
      setSimulatedNCs(validSimulatedSet);

      if (removedNCs.length > 0) {
        const removedCodes = removedNCs.map((id) => byNC.get(id)?.codigo || `NC ${id}`).join(', ');
        setToast({
          type: 'warning',
          message: `Al desmarcar ${materia.codigo}, también se desmarcaron en cascada: ${removedCodes}.`,
        });
      }
      return;
    }

    // Si está habilitada -> marcar como proyectada
    const avail = projectionAvailability.byNC[materia.nc];
    if (avail?.isUnlocked) {
      const nextSim = new Set(simulatedNCs);
      nextSim.add(materia.nc);
      setSimulatedNCs(nextSim);
      return;
    }

    // Si está bloqueada -> mostrar exactamente qué falta
    const parts = [];
    if (avail?.missingNCs?.length > 0) {
      const reqList = avail.missingNCs
        .map((id) => {
          const m = byNC.get(id);
          return m ? `${m.codigo} (NC ${id})` : `NC ${id}`;
        })
        .join(', ');
      parts.push(`Prerrequisitos faltantes: ${reqList}`);
    }
    if (avail?.missingUV > 0) {
      parts.push(
        `Faltan ${avail.missingUV} U.V. (requiere ${materia.prerrequisitoUV} U.V., tienes ${projectionAvailability.totalUV} U.V. proyectadas)`
      );
    }

    setToast({
      type: 'warning',
      message: `${materia.codigo} está bloqueada. ${parts.join(' · ')}.`,
    });
  };

  // Calcula estado visual y categoría de filtro para una materia
  const getVisualStatus = (materia) => {
    const rec = progress?.materias?.[String(materia.nc)];

    if (!isProjectionMode) {
      if (rec?.estado === 'aprobada') return 'aprobada';
      if (rec?.estado === 'en_curso') return 'en_curso';
      return realAvailability.byNC[materia.nc]?.isUnlocked ? 'habilitada' : 'bloqueada';
    }

    // Modo Proyección
    if (realApprovedSet.has(materia.nc)) return 'aprobada';
    if (assumeInProgress && inProgressSet.has(materia.nc)) return 'en_curso_proyectada';
    if (simulatedNCs.has(materia.nc)) return 'proyectada';
    if (projectionAvailability.byNC[materia.nc]?.isUnlocked) {
      return newlyUnlockedSet.has(materia.nc) ? 'habilitada_nueva' : 'habilitada';
    }
    return 'bloqueada';
  };

  const matchesFilters = (materia, visualStatus) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const rec = progress?.materias?.[String(materia.nc)];
      const customCode = (rec?.electivaInfo?.codigo || '').toLowerCase();
      const customName = (rec?.electivaInfo?.nombre || '').toLowerCase();
      const hit =
        materia.codigo.toLowerCase().includes(q) ||
        materia.nombre.toLowerCase().includes(q) ||
        customCode.includes(q) ||
        customName.includes(q) ||
        String(materia.nc) === q;
      if (!hit) return false;
    }

    if (statusFilter === 'all') return true;
    if (statusFilter === 'aprobada') {
      return visualStatus === 'aprobada' || visualStatus === 'proyectada';
    }
    if (statusFilter === 'en_curso') {
      return visualStatus === 'en_curso' || visualStatus === 'en_curso_proyectada';
    }
    if (statusFilter === 'habilitada') {
      return visualStatus === 'habilitada' || visualStatus === 'habilitada_nueva';
    }
    if (statusFilter === 'bloqueada') {
      return visualStatus === 'bloqueada';
    }
    return true;
  };

  const visibleYears =
    yearFilter === 0 ? yearsStructure : yearsStructure.filter((y) => y.anio === yearFilter);

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Pensum Completo — Plan 2025
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              56 asignaturas · 200 U.V. · Pasa el cursor sobre cualquier materia para ver su cadena
              de prerrequisitos.
            </p>
          </div>

          {/* Prominent Mode Switcher */}
          <div
            role="tablist"
            aria-label="Modo de visualización del pensum"
            className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isProjectionMode}
              onClick={() => {
                setMode('real');
                setToast(null);
              }}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                !isProjectionMode
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-4 w-4 text-emerald-700" />
              Modo Historial (Real)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isProjectionMode}
              onClick={() => {
                setMode('projection');
                setSelectedNC(null);
              }}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                isProjectionMode
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              <Wand2 className="h-4 w-4" />
              Modo Proyección (Simulador)
            </button>
          </div>
        </div>

        {/* Search, Status Filter, Year Filter & Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código, nombre o NC..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50/70 py-1.5 pr-8 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:bg-white focus:ring-2 focus:ring-red-700/20 focus:outline-none sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Quick Year Filter (especially handy on smaller viewports) */}
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYearFilter(y)}
                className={`cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  yearFilter === y
                    ? 'bg-red-800 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {y === 0 ? 'Todos' : `Año ${y}`}
              </button>
            ))}
          </div>
        </div>

        {/* Compact Color Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-100" />
            Aprobada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-blue-400 bg-blue-100" />
            En curso
          </span>
          {isProjectionMode && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-dashed border-indigo-500 bg-indigo-100" />
                Proyectada
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-violet-400 bg-violet-100" />
                Recién habilitada
              </span>
            </>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
            Habilitada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-slate-200 bg-slate-100" />
            Bloqueada
          </span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-amber-500" />
            Hover: Prerrequisito
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-fuchsia-500" />
            Hover: Desbloquea
          </span>
        </div>
      </section>

      {/* Projection Toolbar (only in Projection Mode) */}
      {isProjectionMode && (
        <ProjectionToolbar
          realUV={realAvailability.totalUV}
          projectedUV={projectionAvailability.totalUV}
          inProgressCount={inProgressSet.size}
          assumeInProgressApproved={assumeInProgress}
          onToggleAssumeInProgress={handleToggleAssumeInProgress}
          simulatedCount={simulatedNCs.size}
          newlyUnlockedSubjects={newlyUnlockedSubjects}
          alreadyUnlockedSubjects={alreadyUnlockedSubjects}
          onResetProjection={() => {
            setSimulatedNCs(new Set());
            setToast({
              type: 'info',
              message: 'Proyección reiniciada. Tu historial real no ha sido modificado.',
            });
          }}
        />
      )}

      {/* Toast Notification (Projection Feedback) */}
      {toast && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-xs ${
            toast.type === 'warning'
              ? 'border-amber-300 bg-amber-50 text-amber-950'
              : 'border-indigo-200 bg-indigo-50 text-indigo-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'warning' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-indigo-700" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Cerrar aviso"
            className="cursor-pointer rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Interactive 10-Column Curriculum Grid grouped in 5 Years */}
      <section aria-label="Malla curricular de 56 asignaturas" className="overflow-x-auto pb-4">
        <div className="inline-flex min-w-full gap-4">
          {visibleYears.map((yearBlock) => (
            <div
              key={yearBlock.anio}
              className="flex flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3"
            >
              {/* Year Header */}
              <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-1.5 text-white">
                <span className="text-xs font-bold tracking-wider uppercase">
                  Año {yearBlock.anio}
                </span>
                <span className="font-mono text-[11px] text-slate-300">
                  Ciclos {ROMAN_CICLOS[yearBlock.ciclos[0].ciclo]} –{' '}
                  {ROMAN_CICLOS[yearBlock.ciclos[1].ciclo]}
                </span>
              </div>

              {/* Two Cycle Columns per Year */}
              <div className="grid grid-cols-2 gap-3">
                {yearBlock.ciclos.map((cicloCol) => {
                  const uvCiclo = cicloCol.materias.reduce((acc, m) => acc + m.uv, 0);
                  return (
                    <div key={cicloCol.ciclo} className="flex w-[186px] flex-col gap-2.5 sm:w-[196px]">
                      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800">
                          <BookOpen className="h-3.5 w-3.5 text-red-800" />
                          Ciclo {ROMAN_CICLOS[cicloCol.ciclo]}
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-500">
                          {uvCiclo} UV
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {cicloCol.materias.map((materia) => {
                          const visualStatus = getVisualStatus(materia);
                          const isVisible = matchesFilters(materia, visualStatus);

                          if (!isVisible) return null;

                          let highlightRole = 'none';
                          if (hoveredNC !== null) {
                            if (hoveredNC === materia.nc) {
                              highlightRole = 'hovered';
                            } else if (hoverSets.prereqSet.has(materia.nc)) {
                              highlightRole = 'prerequisite';
                            } else if (hoverSets.dependentSet.has(materia.nc)) {
                              highlightRole = 'dependent';
                            } else {
                              highlightRole = 'dimmed';
                            }
                          }

                          return (
                            <PensumNode
                              key={materia.nc}
                              materia={materia}
                              record={progress?.materias?.[String(materia.nc)]}
                              visualStatus={visualStatus}
                              highlightRole={highlightRole}
                              isProjectionMode={isProjectionMode}
                              onClick={handleNodeClick}
                              onMouseEnter={setHoveredNC}
                              onMouseLeave={() => setHoveredNC(null)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real Mode Subject Modal */}
      {!isProjectionMode && selectedNC !== null && (
        <PensumSubjectModal
          nc={selectedNC}
          onClose={() => setSelectedNC(null)}
          onNavigateToDashboard={onNavigateToDashboard}
        />
      )}
    </div>
  );
}
