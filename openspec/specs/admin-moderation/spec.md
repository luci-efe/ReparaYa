# Especificación: Administración y Moderación

## Propósito y alcance

Panel administrativo para moderación de contenido, gestión de usuarios/servicios,
resolución de disputas y métricas de negocio.

## Requisitos relacionados

- **RF-011**: Admin básico
- **BR-005**: Disputas

## Interfaces y contratos

### Endpoints (todos requieren rol 'admin')

**Moderación de servicios**

`GET /api/admin/services?status=under_review`
- Lista servicios pendientes de aprobación

`PATCH /api/admin/services/:id/approve`
- Aprobar servicio (status: 'active')

`PATCH /api/admin/services/:id/reject`
- Rechazar servicio con motivo

**Moderación de reseñas**

`GET /api/admin/ratings?moderation_status=pending`
- Lista reseñas pendientes

`PATCH /api/admin/ratings/:id/moderate`
- Body: `{ "status": "approved" | "rejected", "notes": "..." }`

**Gestión de usuarios**

`PATCH /api/admin/users/:id/block`
- Bloquear usuario

`PATCH /api/admin/users/:id/unblock`
- Desbloquear usuario

**Gestión de categorías**

`POST /api/admin/categories`
- Crear categoría de servicio

`PATCH /api/admin/categories/:id`
- Actualizar categoría

**Resolución de disputas**

`GET /api/admin/disputes`
- Lista disputas abiertas

`PATCH /api/admin/disputes/:bookingId/resolve`
- Body: `{ "resolution": "refund_client" | "payout_contractor", "notes": "..." }`

**Métricas**

`GET /api/admin/metrics`
- Dashboard con KPIs: reservas/día, conversión, disputas, GMV, etc.

## Modelo de datos

### Entidad: Dispute

```typescript
{
  id: string
  booking_id: string (FK Booking, unique)
  opened_by: string (FK User)
  reason: string
  evidence: json // URLs de archivos S3
  status: 'open' | 'resolved'
  resolution?: string
  resolution_notes?: string
  resolved_by?: string (FK User admin)
  created_at: timestamp
  resolved_at?: timestamp
}
```

## Integraciones externas

- **Stripe**: Refunds y ajustes de payout en resolución de disputas

## Consideraciones de seguridad

- Todos los endpoints requieren rol 'admin'
- Auditoría de todas las acciones admin (logs)
- Evidencias de disputas almacenadas en S3 privado

## Testing & QA

### Casos de prueba relacionados

- `TC-RF-011-01`: Aprobación de servicio
- `TC-RF-011-02`: Bloqueo de usuario
- `TC-BR-005-01`: Resolución de disputa

## TODOs

- [ ] Definir esquema Prisma (Dispute)
- [ ] Implementar endpoints de moderación
- [ ] Dashboard de métricas
- [ ] Lógica de resolución de disputas
- [ ] Auditoría de acciones admin
- [ ] Tests de autorización
