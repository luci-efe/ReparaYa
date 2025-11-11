export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Crear Cuenta</h2>
          <p className="mt-2 text-gray-600">
            Únete a ReparaYa como cliente o contratista
          </p>
        </div>

        <div className="mt-8">
          {/* TODO: Integrar con Clerk SignUp component */}
          <p className="text-center text-gray-500">
            Componente de Clerk pendiente de integración
          </p>

          {/* TODO: Después del signup de Clerk, preguntar por rol:
            - Cliente
            - Contratista (requiere info adicional y verificación)
          */}
        </div>

        <div className="text-center text-sm">
          <span className="text-gray-600">¿Ya tienes cuenta? </span>
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Inicia sesión aquí
          </a>
        </div>
      </div>
    </div>
  );
}
