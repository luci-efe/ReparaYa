# Especificación: Mensajería en Ciclo de Vida de Reservas

## Propósito y alcance

Sistema de mensajería contextual entre cliente y contratista dentro de una reserva.
MVP con polling, diseñado para evolucionar a real-time (SSE/WebSockets).

## Requisitos relacionados

- **RF-008**: Mensajería
- **RNF-3.5.1**: Performance (enviar/recibir P95 ≤ 0.6s)
- **RNF-3.5.3**: Seguridad (sanitización anti-XSS)

## Interfaces y contratos

### Endpoints

**POST `/api/bookings/:bookingId/messages`**

Body:
```json
{
  "text": "..."
}
```

Validaciones:
- Usuario debe ser cliente o contratista de la reserva
- Sanitización de contenido (strip HTML, escapar caracteres especiales)
- Longitud máxima: 2000 caracteres

Acción:
- Guardar mensaje
- (Opcional) Enviar notificación por email al destinatario

**GET `/api/bookings/:bookingId/messages`**

Query params:
- `since` (timestamp, opcional): Obtener mensajes desde timestamp (para polling)

Respuesta:
```json
{
  "messages": [
    {
      "id": "...",
      "sender_id": "...",
      "sender_name": "...",
      "text": "...",
      "created_at": "2025-11-10T10:30:00Z"
    }
  ]
}
```

## Modelo de datos

### Entidad: Message

```typescript
{
  id: string
  booking_id: string (FK Booking)
  sender_id: string (FK User)
  text: string
  created_at: timestamp
}
```

### Retención

- Mensajes se retienen mínimo 7 días después del cierre de la reserva
- Proceso batch diario para eliminar mensajes expirados

## Integraciones externas

- **AWS SES**: Notificaciones por email de nuevos mensajes

## Consideraciones de seguridad

- Sanitización de contenido (prevenir XSS)
- Rate limiting por usuario (máx. 10 mensajes/minuto)
- Solo participantes de la reserva pueden ver/enviar mensajes

## Testing & QA

### Tipos de pruebas

1. **Unitarias**:
   - Sanitización de contenido
   - Validaciones de longitud

2. **Integración**:
   - Envío y recepción de mensajes
   - Notificaciones por email

3. **E2E**:
   - Flujo de chat completo en una reserva

### Casos de prueba relacionados

- `TC-RF-008-01`: Envío de mensaje exitoso
- `TC-RF-008-02`: Sanitización anti-XSS
- `TC-RF-008-03`: Retención de mensajes

## TODOs

- [ ] Definir esquema Prisma (Message)
- [ ] Implementar endpoints de mensajería
- [ ] Sanitización de contenido
- [ ] Integración SES para notificaciones
- [ ] Sistema de retención (job cron)
- [ ] Preparar para evolución a SSE/WebSocket
- [ ] Tests de sanitización
