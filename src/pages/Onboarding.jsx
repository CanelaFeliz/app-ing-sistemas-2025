import { useRef, useState } from 'react';
import {
  AlertTriangle,
  FileJson,
  GraduationCap,
  Upload,
  UserPlus,
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';

const CICLO_OPTIONS = ['Ciclo I', 'Ciclo II', 'Ciclo Extraordinario'];

export default function Onboarding() {
  const { createProfile, importFromJsonText } = useProgress();
  const fileInputRef = useRef(null);

  const currentYear = new Date().getFullYear();
  const [nombre, setNombre] = useState('');
  const [carnet, setCarnet] = useState('');
  const [periodo, setPeriodo] = useState('Ciclo I');
  const [anio, setAnio] = useState(currentYear);

  const [formError, setFormError] = useState('');
  const [importError, setImportError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const yearOptions = [];
  for (let y = 2025; y <= currentYear + 4; y += 1) {
    yearOptions.push(y);
  }

  const processFile = (file) => {
    setImportError('');
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setImportError('Por favor selecciona un archivo con extensión .json.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = importFromJsonText(text);
      if (!result.ok) {
        setImportError(result.error || 'No se pudo cargar el archivo.');
      }
    };
    reader.onerror = () => {
      setImportError('Ocurrió un error al leer el archivo seleccionado.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    processFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
    e.target.value = '';
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const cleanNombre = nombre.trim();
    const cleanCarnet = carnet.trim().toUpperCase();

    if (!cleanNombre) {
      setFormError('Ingresa tu nombre completo para continuar.');
      return;
    }
    if (!cleanCarnet || cleanCarnet.length < 4) {
      setFormError('Ingresa un carnet válido (ejemplo: AA25001).');
      return;
    }

    createProfile({
      nombre: cleanNombre,
      carnet: cleanCarnet,
      cicloActual: `${periodo} ${anio}`,
    });
  };

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-800 text-white shadow-md">
            <GraduationCap className="h-8 w-8" />
          </div>
          <p className="text-xs font-semibold tracking-widest text-red-800 uppercase">
            Universidad de El Salvador · Facultad de Ingeniería y Arquitectura
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Ingeniería de Sistemas Informáticos
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Gestor de progreso académico · Plan de Estudio 2025 (56 asignaturas · 200 U.V.)
          </p>
        </div>

        {/* Two Cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: Load Existing JSON */}
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Cargar archivo existente
                  </h2>
                  <p className="text-xs text-slate-500">
                    Restaura tu respaldo portable <code className="font-mono">.json</code>
                  </p>
                </div>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
                  isDragging
                    ? 'border-red-700 bg-red-50/50'
                    : 'border-slate-300 bg-slate-50/70 hover:border-slate-400 hover:bg-slate-100/70'
                }`}
              >
                <Upload className="h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-800">
                  Arrastra tu archivo aquí o haz clic para buscar
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Formato esperado: <span className="font-mono">progreso_CARNET.json</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {importError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Tus datos se procesan localmente en tu navegador y nunca se envían a servidores
              externos.
            </p>
          </section>

          {/* Card 2: Create New Profile */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-800">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Crear nuevo progreso</h2>
                <p className="text-xs text-slate-500">
                  Inicia un expediente nuevo para el Plan 2025
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="student-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Nombre del estudiante
                </label>
                <input
                  id="student-name"
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. María José López"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="student-carnet"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Carnet universitario
                </label>
                <input
                  id="student-carnet"
                  type="text"
                  required
                  value={carnet}
                  onChange={(e) => setCarnet(e.target.value.toUpperCase())}
                  placeholder="Ej. LM25001"
                  maxLength={12}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 uppercase placeholder:font-sans placeholder:text-slate-400 placeholder:normal-case focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label
                    htmlFor="cycle-period"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Ciclo actual
                  </label>
                  <select
                    id="cycle-period"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none"
                  >
                    {CICLO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cycle-year"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Año
                  </label>
                  <select
                    id="cycle-year"
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-700 focus:ring-2 focus:ring-red-700/20 focus:outline-none"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full cursor-pointer rounded-lg bg-red-800 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-red-900 focus:ring-2 focus:ring-red-700/40 focus:outline-none"
              >
                Comenzar seguimiento
              </button>
            </form>
          </section>
        </div>
      </div>

      <footer className="mt-10 text-center text-xs text-slate-400">
        Acuerdo del Consejo Superior Universitario N° 044-2023-2025 (V-3.7) · Plan de Estudio 2025
      </footer>
    </div>
  );
}
