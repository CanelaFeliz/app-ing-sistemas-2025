import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Info,
  Lock,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { evaluarPrerrequisitos } from '../utils/academicRules';

export default function EnrollSubjectModal({ isOpen, onClose }) {
  const { pensum, progress, enrollSubject } = useProgress();

  const [query, setQuery] = useState('');
  const [showAllPending, setShowAllPending] = useState(false);
  const [selectedElective, setSelectedElective] = useState(null);
  const [elecCodigo, setElecCodigo] = useState('');
  const [elecNombre, setElecNombre] = useState('');
  const [elecPrereq, setElecPrereq] = useState('');

  const byNC = useMemo(() => new Map(pensum.map((m) => [m.nc, m])), [pensum]);

  const { availableSubjects, prereqInfo } = useMemo(() => {
    const materiasUsuario = progress?.materias || {};
    const aprobadasNCs = [];

    for (const [ncKey, rec] of Object.entries(materiasUsuario)) {
      if (rec?.estado === 'aprobada') {
        aprobadasNCs.push(Number(ncKey));
      }
    }

    const evalResult = evaluarPrerrequisitos(pensum, aprobadasNCs);

    const candidates = pensum.filter((m) => {
      const rec = materiasUsuario[String(m.nc)];
      if (rec?.estado === 'aprobada' || rec?.estado === 'en_curso') {
        return false;
      }
      if (!showAllPending && !evalResult.porMateria[m.nc]?.habilitada) {
        return false;
      }
      return true;
    });

    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? candidates.filter(
          (m) =>
            m.codigo.toLowerCase().includes(normalizedQuery) ||
            m.nombre.toLowerCase().includes(normalizedQuery) ||
            `ciclo ${m.ciclo}`.includes(normalizedQuery)
        )
      : candidates;

    // Mostrar primero las habilitadas si showAllPending está activo
    filtered.sort((a, b) => {
      const aHab = evalResult.porMateria[a.nc]?.habilitada ? 0 : 1;
      const bHab = evalResult.porMateria[b.nc]?.habilitada ? 0 : 1;
      if (aHab !== bHab) return aHab - bHab;
      return a.nc - b.nc;
    });

    return { availableSubjects: filtered, prereqInfo: evalResult };
  }, [pensum, progress, query, showAllPending]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedElective(null);
    setElecCodigo('');
    setElecNombre('');
    setElecPrereq('');
    setQuery('');
    onClose();
  };

  const handleSelectSubject = (materia) => {
    if (materia.esElectiva) {
      setSelectedElective(materia);
      setElecCodigo('');
      setElecNombre('');
      setElecPrereq('');
      return;
    }
    enrollSubject(materia.nc);
    handleClose();
  };

  const handleConfirmElective = (e) => {
    e.preventDefault();
    if (!selectedElective) return;
    enrollSubject(selectedElective.nc, {
      codigo: elecCodigo,
      nombre: elecNombre,
      prerrequisitosTexto: elecPrereq,
    });
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enroll-modal-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="enroll-modal-title" className="text-lg font-bold text-slate-900">
              {selectedElective
                ? `Configurar ${selectedElective.codigo} (Ciclo ${selectedElective.ciclo})`
                : 'Inscribir materia en el ciclo actual'}
            </h2>
            <p className="text-xs text-slate-500">
              {selectedElective
                ? 'Personaliza el código y nombre real de tu Técnica Electiva (podrás editarlo después).'
                : `Ciclo activo: ${progress?.metadata?.cicloActual} · U.V. aprobadas: ${prereqInfo.uvAcumuladas}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar modal"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {selectedElective ? (
          <form onSubmit={handleConfirmElective} className="space-y-4 p-6">
            <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3.5 text-xs text-violet-900">
              Estás inscribiendo el espacio <strong>{selectedElective.codigo}</strong> (NC{' '}
              {selectedElective.nc} · {selectedElective.uv} U.V. · Ciclo {selectedElective.ciclo}).
              Los campos son opcionales si aún no conoces los datos exactos.
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="elec-codigo"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Código real (opcional)
                </label>
                <input
                  id="elec-codigo"
                  type="text"
                  value={elecCodigo}
                  onChange={(e) => setElecCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej. TPI115"
                  maxLength={12}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="elec-nombre"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nombre de la electiva (opcional)
                </label>
                <input
                  id="elec-nombre"
                  type="text"
                  value={elecNombre}
                  onChange={(e) => setElecNombre(e.target.value)}
                  placeholder="Ej. Técnicas de Programación para Internet"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="elec-prereq"
                className="block text-xs font-semibold text-slate-700"
              >
                Nota de prerrequisitos (opcional)
              </label>
              <input
                id="elec-prereq"
                type="text"
                value={elecPrereq}
                onChange={(e) => setElecPrereq(e.target.value)}
                placeholder="Ej. Haber aprobado BAD115 y PPI115"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedElective(null)}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Volver a la lista
              </button>
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900"
              >
                <Plus className="h-4 w-4" />
                Inscribir electiva
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Search & Toggle Controls */}
            <div className="space-y-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por código, nombre o ciclo (ej. ESD115, Cálculo, Ciclo 4)..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 select-none">
                <input
                  type="checkbox"
                  checked={showAllPending}
                  onChange={(e) => setShowAllPending(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-800 focus:ring-red-700"
                />
                <span className="text-xs text-slate-700">
                  <strong className="font-semibold text-slate-900">
                    Mostrar todas las materias pendientes (omitir prerrequisitos)
                  </strong>
                  <span className="mt-0.5 block text-slate-500">
                    Útil si cursas ciclos avanzados y aún no has registrado tus materias aprobadas
                    anteriores.
                  </span>
                </span>
              </label>
            </div>

            {/* Subject List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {availableSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center">
                  <Info className="h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    No se encontraron asignaturas disponibles con este filtro.
                  </p>
                  {!showAllPending && (
                    <button
                      type="button"
                      onClick={() => setShowAllPending(true)}
                      className="mt-3 cursor-pointer text-xs font-semibold text-red-800 hover:underline"
                    >
                      Mostrar todas las materias pendientes
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {availableSubjects.map((materia) => {
                    const status = prereqInfo.porMateria[materia.nc];
                    const habilitada = status?.habilitada;
                    const faltantesCodigos = (status?.faltantesNC || [])
                      .map((id) => byNC.get(id)?.codigo || `NC ${id}`)
                      .join(', ');

                    return (
                      <li
                        key={materia.nc}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-800">
                              {materia.codigo}
                            </span>
                            <span className="text-xs text-slate-500">
                              Ciclo {materia.ciclo} · {materia.uv} U.V.
                            </span>
                            {materia.esElectiva && (
                              <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">
                                <Sparkles className="h-3 w-3" />
                                Electiva
                              </span>
                            )}
                            {habilitada ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Habilitada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                                <Lock className="h-3 w-3" />
                                {faltantesCodigos
                                  ? `Req: ${faltantesCodigos}`
                                  : `Req: ${materia.prerrequisitoUV} U.V.`}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {materia.nombre}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectSubject(materia)}
                          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Inscribir
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
