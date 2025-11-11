export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">ReparaYa</h1>
        <p className="text-xl text-gray-600">
          Plataforma de servicios de reparación y mantenimiento del hogar
        </p>
        <div className="mt-8 space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Iniciar Sesión
          </a>
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Registrarse
          </a>
        </div>
      </div>

      {/* TODO: Agregar secciones de landing page:
        - Búsqueda de servicios
        - Categorías populares
        - Cómo funciona
        - Testimonios
        - Footer
      */}
    </main>
  );
}
