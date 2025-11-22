import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Definir rutas públicas (no requieren autenticación)
const isPublicRoute = createRouteMatcher([
  "/", // Landing page
  "/sign-in(.*)", // Rutas de sign-in
  "/sign-up(.*)", // Rutas de sign-up
  "/servicios(.*)", // Catálogo público (futuro)
  "/api/webhooks(.*)", // Webhooks (verificación por firma, no por sesión)
  "/api/categories(.*)", // Categorías de servicios (lectura pública)
]);

export default clerkMiddleware((auth, req) => {
  // Si la ruta NO es pública, protegerla
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
