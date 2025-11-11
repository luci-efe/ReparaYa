export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Iniciar Sesión</h2>
          <p className="mt-2 text-gray-600">
            Accede a tu cuenta de ReparaYa
          </p>
        </div>

        <div className="mt-8">
          {/* TODO: Integrar con Clerk SignIn component */}
          <p className="text-center text-gray-500">
            Componente de Clerk pendiente de integración
          </p>
        </div>

        <div className="text-center text-sm">
          <span className="text-gray-600">¿No tienes cuenta? </span>
          <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Regístrate aquí
          </a>
        </div>
      </div>
    </div>
  );
}
