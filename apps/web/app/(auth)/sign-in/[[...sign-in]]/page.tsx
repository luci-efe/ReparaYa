import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido a ReparaYa
        </h1>
        <p className="mt-2 text-gray-600">
          Inicia sesión para continuar
        </p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/dashboard"
      />
    </div>
  );
}
