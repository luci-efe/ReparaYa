import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Únete a ReparaYa
        </h1>
        <p className="mt-2 text-gray-600">
          Crea tu cuenta y encuentra servicios de reparación
        </p>
      </div>

      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl",
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/onboarding/role-selection"
      />
    </div>
  );
}
