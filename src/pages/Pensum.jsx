import { useMemo } from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { useProgress } from '../context/ProgressContext';

export default function Pensum() {
  const { pensum } = useProgress();

  const summary = useMemo(() => {
    const totalUV = pensum.reduce((sum, m) => sum + m.uv, 0);
    const electivas = pensum.filter((m) => m.esElectiva);
    const extraordinarias = pensum.filter((m) => m.esCicloExtraordinario);
    const porUV = pensum.filter((m) => m.prerrequisitoUV > 0);

    const byCiclo = new Map();
    for (const m of pensum) {
      const list = byCiclo.get(m.ciclo) || [];
      list.push(m);
      byCiclo.set(m.ciclo, list);
    }

    return {
      totalUV,
      electivas,
      extraordinarias,
      porUV,
      ciclos: Array.from(byCiclo.entries()).sort((a, b) => a[0] - b[0]),
    };
  }, [pensum]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Catálogo Pensum 2025 cargado correctamente
        </div>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Pensum Completo (Vista Temporal)</h1>
        <p className="mt-1 text-sm text-slate-600">
          En la <strong>Fase 3</strong> se construirá la malla curricular interactiva por año y
          ciclo, con filtros, proyección de inscripción y personalización de electivas.
        </p>

        {/* Quick Catalog Verification Badges */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
            <span className="font-semibold text-slate-900">{pensum.length} asignaturas</span>
            <span className="block text-xs text-slate-500">
              {summary.totalUV} U.V. totales en 10 ciclos (5 años)
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
            <span className="font-semibold text-slate-900">
              {summary.electivas.length} Técnicas Electivas
            </span>
            <span className="block text-xs text-slate-500">
              NC: {summary.electivas.map((e) => e.nc).join(', ')}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
            <span className="font-semibold text-slate-900">
              {summary.extraordinarias.length} de ciclo extraordinario · {summary.porUV.length} por
              U.V.
            </span>
            <span className="block text-xs text-slate-500">
              {summary.porUV.map((m) => `${m.codigo} (${m.prerrequisitoUV} U.V.)`).join(' · ')}
            </span>
          </div>
        </div>

        {/* Compact Cycle Distribution Table */}
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Ciclo</th>
                <th className="px-4 py-3">Año</th>
                <th className="px-4 py-3">Materias</th>
                <th className="px-4 py-3">U.V.</th>
                <th className="px-4 py-3">Códigos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {summary.ciclos.map(([ciclo, items]) => {
                const uvCiclo = items.reduce((acc, m) => acc + m.uv, 0);
                return (
                  <tr key={ciclo} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                        Ciclo {ciclo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">Año {items[0].anio}</td>
                    <td className="px-4 py-2.5 text-slate-700">{items.length}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{uvCiclo}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                      {items.map((m) => m.codigo).join(', ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
