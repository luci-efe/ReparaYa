/**
 * Error lanzado cuando un usuario no está autenticado (sin sesión válida)
 * HTTP Status: 401 Unauthorized
 */
export class UnauthorizedError extends Error {
  constructor(message: string = "No autorizado. Debes iniciar sesión.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Error lanzado cuando un usuario autenticado no tiene permisos suficientes
 * HTTP Status: 403 Forbidden
 */
export class ForbiddenError extends Error {
  public requiredRole?: string;

  constructor(message?: string, requiredRole?: string) {
    super(
      message ||
        `Acceso prohibido. ${requiredRole ? `Se requiere rol: ${requiredRole}` : "Permisos insuficientes."}`
    );
    this.name = "ForbiddenError";
    this.requiredRole = requiredRole;
  }
}
