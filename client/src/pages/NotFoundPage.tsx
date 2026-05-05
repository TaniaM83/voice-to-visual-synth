import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#1e1e1e] text-slate-100 flex items-center justify-center p-8">
      <section className="max-w-md w-full space-y-4 text-center">
        <p className="text-6xl font-bold text-slate-700">404</p>
        <h1 className="text-2xl font-semibold">Página no encontrada</h1>
        <p className="text-slate-400">
          La ruta que buscas no existe o fue movida.
        </p>
        <Link
          to="/"
          className="inline-block rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
