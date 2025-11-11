# Especificación: Publicación de Servicios (Contratistas)

## Propósito y alcance

Permite a contratistas crear, editar y gestionar sus servicios publicados,
incluyendo disponibilidad, precios y medios.

## Requisitos relacionados

- **RF-004**: Publicación y disponibilidad (contratista)

## Interfaces y contratos

### Endpoints

**POST `/api/services`**
- Autorización: Contratista verificado
- Body: Datos del servicio (título, descripción, precio, ubicación, categoría)
- Respuesta: Servicio creado (status: 'under_review')

**PATCH `/api/services/:id`**
- Autorización: Propietario del servicio
- Body: Campos actualizables

**DELETE `/api/services/:id`**
- Autorización: Propietario del servicio
- Acción: Soft delete (status: 'inactive')

**POST `/api/services/:id/images`**
- Autorización: Propietario del servicio
- Body: Imagen (multipart/form-data)
- Acción: Upload a S3 y asociar a servicio

**POST `/api/services/:id/availability`**
- Autorización: Propietario del servicio
- Body: Array de slots de disponibilidad

**GET `/api/services/:id/availability`**
- Autorización: Público
- Respuesta: Slots disponibles para booking

## Modelo de datos

### Entidad: Availability

```typescript
{
  id: string
  service_id: string (FK Service)
  date: date
  start_time: time
  end_time: time
  status: 'available' | 'booked' | 'blocked'
  booking_id?: string (FK Booking)
  created_at: timestamp
  updated_at: timestamp
}
```

## Integraciones externas

- **AWS S3**: Upload de imágenes
- **Moderación**: Los servicios nuevos quedan en 'under_review' hasta aprobación admin

## Consideraciones de seguridad

- Solo contratistas verificados pueden publicar servicios
- Validar formato y tamaño de imágenes (max 5MB)
- Sanitización de descripción (anti-XSS)

## Testing & QA

### Casos de prueba relacionados

- `TC-RF-004-01`: Creación de servicio
- `TC-RF-004-02`: Gestión de disponibilidad
- `TC-RF-004-03`: Upload de imágenes

## TODOs

- [ ] Implementar CRUD de servicios
- [ ] Sistema de disponibilidad con slots
- [ ] Upload de imágenes a S3
- [ ] Moderación automática/manual
- [ ] Tests
