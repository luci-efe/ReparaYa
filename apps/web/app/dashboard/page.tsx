import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-4 text-gray-600">
          Autenticación exitosa! Usuario ID: {userId}
        </p>
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Próximos pasos:</h2>
          <ul className="mt-4 space-y-2 text-gray-700">
            <li>✅ Autenticación con Clerk configurada</li>
            <li>✅ OAuth con Google y Facebook habilitado</li>
            <li>⏳ Sincronización con base de datos (Fase 2)</li>
            <li>⏳ Perfiles de usuario</li>
            <li>⏳ Catálogo de servicios</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
