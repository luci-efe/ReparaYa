# Modelo de Datos - ReparaYa

## 1. Dominios y Módulos de Negocio

ReparaYa está organizado en los siguientes módulos de dominio:

- **auth**: Autenticación y autorización (Clerk + roles)
- **users**: Gestión de perfiles (clientes, contratistas, admins)
- **services**: Catálogo y búsqueda de servicios
- **booking**: Creación y gestión de reservas
- **payments**: Integración Stripe (anticipos, liquidaciones, webhooks)
- **messaging**: Mensajería en contexto de reserva
- **ratings**: Calificaciones y reseñas
- **admin**: Moderación y gestión administrativa

---

## 2. Entidades Principales y sus Atributos

### 2.1 Dominio: AUTH

#### Entidad: `user`
Almacena información de usuarios en la plataforma (clientes, contratistas y admins).

**Atributos:**
- `id` (uuid): Identificador único
- `email` (citext): Email único y verificable
- `password_hash` (text): Hash de contraseña (NO almacenar contraseña en claro)
- `name` (varchar 120): Nombre completo del usuario
- `phone` (varchar 20): Teléfono (opcional)
- `role` (enum): Rol del usuario. Valores permitidos:
  - `ADMIN`: Administrador de plataforma
  - `CONTRACTOR`: Contratista/Proveedor de servicios
  - `CLIENT`: Cliente que solicita servicios
- `email_verified_at` (timestamptz): Timestamp de verificación de email
- `blocked` (boolean): Flag de bloqueo por incumplimiento (default: false)
- `created_at`, `updated_at` (timestamptz): Auditoría temporal

**Índices:**
- `idx_user_email_unique`: Unicidad en email
- `idx_user_role`: Búsqueda por rol
- `idx_user_blocked`: Filtrado de usuarios bloqueados

**Constraints:**
- Validación de rol permitido

---

### 2.2 Dominio: USERS

#### Entidad: `contractor_profile`
Extiende información específica de contratistas (1:1 con user cuando role=CONTRACTOR).

**Atributos:**
- `user_id` (uuid): FK → user.id (Primary Key)
- `accepts_outside` (boolean): ¿Acepta trabajos fuera de su cobertura primaria? (default: false)
- `outside_markup_percent` (smallint): Recargo aplicable fuera de cobertura. Valores permitidos:
  - `0`: Sin recargo
  - `10`: 10% de recargo
  - `20`: 20% de recargo
- `about` (varchar 300): Descripción/biografía del contratista (opcional)

**Constraints:**
- Validación: `outside_markup_percent` solo puede ser {0, 10, 20}

**Índices:**
- `idx_contractor_profile_outside`: Filtrado por política de cobertura

---

#### Entidad: `contractor_coverage`
Define las zonas (municipios) donde un contratista ofrece servicios.

**Atributos:**
- `id` (uuid): Identificador único
- `contractor_user_id` (uuid): FK → user.id (debe ser contratista)
- `municipality_id` (int): FK → municipality.id
- `is_primary` (boolean): ¿Es la cobertura primaria? (para recargos)

**Relación Única:** Un contratista no puede duplicar cobertura en un municipio
- `uq_coverage_contractor_muni`: UNIQUE(contractor_user_id, municipality_id)

**Índices:**
- `idx_coverage_contractor`: Búsqueda de zonas por contratista
- `idx_coverage_municipality`: Búsqueda de contratistas por zona

---

#### Entidad: `municipality` (Catálogo)
Catálogo de municipios/zonas de cobertura (ZMG - Zona Metropolitana de Guadalajara, generalizables).

**Atributos:**
- `id` (serial): Identificador único
- `name` (varchar 80): Nombre del municipio (UNIQUE)

**Ejemplos:** Guadalajara, Zapopan, Tlaquepaque, Tonalá, etc.

---

#### Entidad: `address`
Direcciones de entrega/servicio de clientes.

**Atributos:**
- `id` (uuid): Identificador único
- `user_id` (uuid): FK → user.id (propietario de la dirección)
- `street` (varchar 140): Calle principal
- `ext_number` (varchar 20): Número exterior
- `int_number` (varchar 20): Número interior (opcional)
- `neighborhood` (varchar 140): Colonia (opcional)
- `municipality_id` (int): FK → municipality.id (zona de servicio)
- `postal_code` (varchar 10): Código postal
- `lat` (decimal 10,7): Latitud (para geocodificación)
- `lng` (decimal 10,7): Longitud
- `is_default` (boolean): ¿Es la dirección por defecto? (default: false)

**Índices:**
- `idx_address_user`: Búsqueda de direcciones por usuario
- `idx_address_municipality`: Búsqueda de direcciones por zona

---

### 2.3 Dominio: SERVICES

#### Entidad: `category` (Catálogo)
Categorías de servicios disponibles en la plataforma.

**Atributos:**
- `id` (serial): Identificador único
- `name` (varchar 100): Nombre de categoría (UNIQUE)

**Ejemplos:** Plomería, Electricidad, Limpieza, Carpintería, Reparación de electrodomésticos, etc.

---

#### Entidad: `service`
Servicios ofrecidos por contratistas en la plataforma.

**Atributos:**
- `id` (uuid): Identificador único
- `contractor_user_id` (uuid): FK → user.id (propietario/contratista)
- `category_id` (int): FK → category.id (tipo de servicio)
- `title` (varchar 100): Nombre descriptivo del servicio
- `description` (varchar 1000): Descripción detallada
- `hours_estimated` (numeric 3,1): Tiempo estimado de ejecución en horas
  - Rango recomendado: 0.5 a 12.0 horas
  - Ejemplos: 0.5 (30 min), 1.0, 2.0, 4.0, 8.0, etc.
- `price_base_B` (numeric 12,2): Precio base en MXN (B)
  - Constraint: price_base_B > 0
  - No incluye recargos de plataforma
- `active` (boolean): Estado de publicación (default: true)
- `created_at`, `updated_at` (timestamptz): Auditoría temporal

**Índices:**
- `idx_service_contractor`: Búsqueda de servicios por contratista
- `idx_service_category`: Búsqueda de servicios por categoría
- `idx_service_active`: Filtrado de servicios activos

---

#### Entidad: `service_schedule`
Horarios de disponibilidad de un servicio (bloques de tiempo por día de semana).

**Atributos:**
- `id` (uuid): Identificador único
- `service_id` (uuid): FK → service.id
- `day_of_week` (smallint): Día de la semana (0=Domingo ... 6=Sábado)
  - Constraint: 0 ≤ day_of_week ≤ 6
- `start_time` (time): Hora de inicio (sin zona horaria)
- `end_time` (time): Hora de término

**Constraints:**
- Validación: start_time < end_time
  - Nota: No se pueden cruzar medianoche (servicio por día)

**Índices:**
- `idx_schedule_service_day`: Búsqueda eficiente de horarios disponibles

---

#### Entidad: `service_photo`
Fotos/imágenes del servicio para galería visual.

**Atributos:**
- `id` (uuid): Identificador único
- `service_id` (uuid): FK → service.id
- `url` (text): URL de imagen (almacenada en S3/CDN)
- `size_mb` (numeric 4,2): Tamaño de archivo en MB
  - Constraint: size_mb ≤ 5.00 (máximo 5 MB por foto)
- `created_at` (timestamptz): Timestamp de upload

**Constraints Únicos:**
- `uq_service_photo_url`: UNIQUE(service_id, url)

**Límites UI:**
- Máximo 5 fotos por servicio

---

### 2.4 Dominio: BOOKING

#### Entidad: `reservation`
Solicitudes de reserva de servicios (el núcleo del modelo de negocio).

**Atributos:**

**Identificadores y Referencias:**
- `id` (uuid): Identificador único
- `client_user_id` (uuid): FK → user.id (cliente que solicita el servicio)
- `contractor_user_id` (uuid): FK → user.id (contratista que atiende)
- `service_id` (uuid): FK → service.id (servicio reservado)
- `address_id` (uuid): FK → address.id (dirección de ejecución)

**Temporalidad:**
- `start_at` (timestamptz): Fecha y hora de inicio del servicio
- `hours_estimated` (numeric 3,1): Duración estimada (copia del servicio)
- `created_at`, `updated_at` (timestamptz): Auditoría

**Estados:**
- `status` (enum): Estado de la reserva. Valores permitidos:
  - `CREATED`: Recién creada (antes de pago)
  - `ON_ROUTE`: Contratista en ruta hacia el cliente
  - `ON_SITE`: Contratista llegó al sitio
  - `IN_PROGRESS`: Servicio en ejecución
  - `COMPLETED`: Servicio completado
  - `NO_SHOW`: Contratista no se presentó
  - `DISPUTED`: Disputa abierta
  - `CANCELED`: Reserva cancelada

**Transiciones Válidas de Estado:**
```
CREATED → [CANCELED, DISPUTED]
ON_ROUTE → [ON_SITE, CANCELED, DISPUTED]
ON_SITE → [IN_PROGRESS, CANCELED, DISPUTED]
IN_PROGRESS → [COMPLETED, CANCELED, DISPUTED]
COMPLETED → [DISPUTED]
NO_SHOW → [DISPUTED]
DISPUTED → [RESOLVED_UPHOLD_CLIENT, RESOLVED_UPHOLD_CONTRACTOR]
CANCELED → (terminal)
```

**Precios (Reglas de Negocio):**
- `recargo_percent` (smallint): Recargo por ubicación fuera de cobertura primaria
  - Valores permitidos: {0, 10, 20}
  - Constraint: recargo_percent IN (0, 10, 20)
  - Aplicado por política del contratista (contractor_profile.outside_markup_percent)

- `markup_percent` (smallint): Recargo de plataforma (R%)
  - Valor por defecto: 15% (configurable globalmente)
  - Se aplica sobre precio base

- `price_base_B` (numeric 12,2): Precio base del servicio (MXN)
  - **BR-001**: Copia del service.price_base_B en momento de reserva

- `price_base_adjusted_Bp` (numeric 12,2): Precio base ajustado por recargo de ubicación
  - Fórmula: **Bp = B × (1 + recargo_percent/100)**
  - Ejemplo: Si B=1000 y recargo=10%, entonces Bp=1100

- `price_public_P` (numeric 12,2): Precio cobrado al cliente
  - Fórmula: **P = Bp × (1 + markup_percent/100)**
  - **BR-001**: Incluye recargo de plataforma sobre precio base ajustado
  - Ejemplo: Si Bp=1100 y markup=15%, entonces P=1265

- `anticipo_amount` (numeric 12,2): Monto cobrado al crear la reserva
  - **BR-003**: Configurable, típicamente 20% de P
  - Fórmula: **Anticipo = P × 0.20** (configurable)
  - Ejemplo: Si P=1265, anticipo=253

- `liquidacion_amount` (numeric 12,2): Monto liberado al contratista al completar
  - **BR-003**: Complemento del anticipo
  - Fórmula: **Liquidación = P - Anticipo = P × 0.80**
  - **BR-002**: Comisión C% se resta de B (no de P), sobre contratista
  - Ingreso del contratista: **Ic = B - (C% × B)** (sin considerar fees Stripe)
  - Ejemplo: Si B=1000 y comisión=15%, contratista recibe 850

**Moneda:**
- `currency` (char 3): Moneda de transacción (default: 'MXN')
  - MVP soporta solo MXN

**Índices:**
- `idx_reservation_client_start`: Búsqueda de reservas de cliente por fecha
- `idx_reservation_contractor_start`: Búsqueda de reservas de contratista por fecha
- `idx_reservation_status`: Filtrado por estado

---

### 2.5 Dominio: PAYMENTS

#### Entidad: `payment`
Registro de transacciones de pago (anticipos, liquidaciones, reembolsos).

**Atributos:**
- `id` (uuid): Identificador único
- `reservation_id` (uuid): FK → reservation.id (vinculada a reserva)
- `type` (enum): Tipo de pago:
  - `ANTICIPO`: Pago inicial cobrado al cliente
  - `LIQUIDACION`: Pago final al contratista tras completar
  - `REFUND`: Reembolso (por cancelación con penalización)

- `status` (enum): Estado de la transacción:
  - `INITIATED`: Iniciado, esperando confirmación
  - `SUCCEEDED`: Confirmado y procesado
  - `FAILED`: Falló (reintentos agotados)

- `amount` (numeric 12,2): Monto en MXN

**Integración Stripe:**
- `stripe_checkout_session_id` (varchar 120): ID de sesión de Checkout (anticipos)
- `stripe_payment_intent_id` (varchar 120): ID de PaymentIntent
- `stripe_charge_id` (varchar 120): ID de Charge confirmado
- `stripe_transfer_id` (varchar 120): ID de Transfer (payout a contratista)

**Auditoría:**
- `created_at`, `updated_at` (timestamptz)

**Índices:**
- `idx_payment_reservation`: Búsqueda de pagos por reserva
- `idx_payment_type_status`: Búsqueda de transacciones por tipo y estado

**Reglas de Idempotencia:**
- **BR-003**: Basada en `stripe_payment_intent_id` y `event.id` de webhooks
- Evita duplicación por reintentos

---

### 2.6 Dominio: MESSAGING

#### Entidad: `message`
Mensajería dentro del contexto de una reserva (chat cliente-contratista).

**Atributos:**
- `id` (uuid): Identificador único
- `reservation_id` (uuid): FK → reservation.id (contexto de reserva)
- `sender_user_id` (uuid): FK → user.id (quién envía el mensaje)
- `content` (text): Cuerpo del mensaje (saneado en capa aplicación)
- `created_at` (timestamptz): Timestamp de creación

**Política de Retención:**
- **RNF**: Eliminación automática de mensajes > 7 días tras cierre de reserva
- Justificación: Privacidad y cumplimiento LFPDPPP

**Índices (implícitos):**
- Búsqueda por reservation_id (usualmente ordenada por created_at DESC)

---

### 2.7 Dominio: RATINGS

#### Entidad: `review` (Calificación y Reseña)
Calificaciones y comentarios sobre reservas completadas.

**Atributos:**
- `id` (uuid): Identificador único
- `reservation_id` (uuid): FK → reservation.id
  - **BR-009**: Requiere que reservation.status = `COMPLETED`
  - Una reseña por par (cliente, contratista) por reserva

- `reviewer_user_id` (uuid): FK → user.id (quién califica)
- `reviewee_user_id` (uuid): FK → user.id (quién es calificado)

- `stars` (smallint): Calificación numérica
  - Constraint: 1 ≤ stars ≤ 5
  - **RF-009**: Obligatoria

- `text` (varchar 500): Comentario escrito (opcional)
  - Sujeto a moderación por admin (puede ser removido)

- `status` (enum): Estado de la reseña:
  - `ACTIVE`: Visible en plataforma
  - `REMOVED_BY_ADMIN`: Removida por moderación

- `removed_reason` (varchar 280): Motivo de remoción (si aplica)
- `created_at` (timestamptz): Timestamp

**Constraints Únicos:**
- `uq_review_unique_per_party`: UNIQUE(reservation_id, reviewer_user_id)
  - Una única reseña por dirección de calificación

**Índices:**
- `idx_review_reviewee_created`: Calificaciones recibidas por usuario y fecha
  - Usado para calcular promedio de ratings

---

### 2.8 Dominio: ADMIN

#### Entidad: `dispute`
Disputas abiertas sobre pagos, servicios no realizados o incumplimientos.

**Atributos:**
- `id` (uuid): Identificador único
- `reservation_id` (uuid): FK → reservation.id (única disputa por reserva)
- `initiator_user_id` (uuid): FK → user.id (quién abre la disputa)

- `status` (enum): Estado de la disputa:
  - `OPEN`: En proceso de revisión
  - `RESOLVED_UPHOLD_CLIENT`: Resuelta a favor del cliente
  - `RESOLVED_UPHOLD_CONTRACTOR`: Resuelta a favor del contratista

- `resolution_notes` (varchar 1000): Notas de resolución (motivo y evidencia revisada)
- `created_at` (timestamptz): Timestamp de apertura
- `resolved_at` (timestamptz): Timestamp de resolución (NULL si aún abierta)

**Flujo:**
- Se abre cuando hay incumplimiento (BR-005)
- Admin revisa evidencia (mensajes, fotos, etc.)
- Se resuelve en favor de una de las partes
- **BR-003**: Si dispute → retención de liquidación por T horas

---

#### Entidad: `admin_audit_log`
Registro de auditoría de acciones administrativas sensibles (lite).

**Atributos:**
- `id` (uuid): Identificador único
- `admin_user_id` (uuid): FK → user.id (admin que ejecuta la acción)

- `action_type` (enum): Tipo de acción:
  - `DELETE_REVIEW`: Eliminación de reseña
  - `BLOCK_ACCOUNT`: Bloqueo de usuario
  - `PASSWORD_RESET`: Reset de contraseña forzado
  - `RESOLVE_DISPUTE`: Resolución de disputa

- `target_type` (varchar 40): Tipo de entidad afectada:
  - 'REVIEW', 'USER', 'DISPUTE', 'RESERVATION'
- `target_id` (uuid): ID de la entidad afectada
- `reason` (varchar 280): Motivo de la acción
- `created_at` (timestamptz): Timestamp

**Índices:**
- `idx_audit_admin_created`: Auditoría por admin y fecha
- `idx_audit_target`: Búsqueda de acciones sobre entidad específica

---

## 3. Reglas de Negocio (BR)

### BR-001: Precios y Recargos

**Fórmula:**
```
Precio base del servicio: B (price_base_B)
Recargo de ubicación: R% (0%, 10%, o 20%)
Precio base ajustado: Bp = B × (1 + R/100)
Recargo de plataforma: M% (markup_percent, default 15%)
Precio público al cliente: P = Bp × (1 + M/100)
```

**Ejemplo Práctico:**
```
- Servicio base (B): $1,000 MXN
- Recargo ubicación (R%): 10% → Bp = 1,100
- Recargo plataforma (M%): 15% → P = 1,265
- Cliente paga: $1,265 MXN
```

---

### BR-002: Comisiones

**Fórmula:**
```
Comisión de plataforma: C% (aplicada sobre B, NO sobre P)
Ingreso del contratista: Ic = B - (C% × B)
Fees de pasarela: Descontados del Ic
```

**Nota Crítica:** La comisión se calcula sobre el precio base B, no sobre el precio público P. Esto protege la rentabilidad del contratista de los recargos de plataforma.

**Ejemplo Práctico:**
```
- Servicio base (B): $1,000 MXN
- Comisión (C%): 15%
- Ingreso bruto contratista: 1,000 - 150 = $850 MXN
- Fees Stripe (~3%): ~25.50
- Ingreso neto contratista: ~$824.50 MXN
```

---

### BR-003: Anticipo y Liquidación

**Fórmula:**
```
Anticipo cobrado al cliente: A% × P (configurable, típicamente 20%)
Liquidación al contratista: (100% - A%) × P
Liberación: Al marcar COMPLETED o tras ventana de retención T si hay disputa
```

**Flujo Temporal:**
1. Cliente reserva → **Anticipo = 20% × P** debitado inmediatamente
2. Contratista marca COMPLETED → **Liquidación = 80% × P** se agenda
3. Si disputa abierta → retención de liquidación por T horas (ej. 72h) durante investigación
4. Al resolver disputa → Liquidación liberada o reembolso iniciado

**Ejemplo Práctico:**
```
- Precio público (P): $1,265 MXN
- Anticipo (20%): $253 MXN (debitado al cliente)
- Liquidación (80%): $1,012 MXN (pendiente para contratista)
- A contratista: $850 (tras comisión 15%)
- A plataforma: $162 (comisión sobre $1,000)
```

---

### BR-004: Cancelaciones

**Política por Ventanas Temporales:**
```
Cancelación ≥ 24 horas antes: Sin penalización
Cancelación < 24 horas: Penalización P% (ej. 10%) retenida por plataforma
```

**Flujo:**
1. Cliente cancela < 24h antes → Anticipo reducido por P%
2. Contratista no se presenta → Automáticamente NO_SHOW
3. Reembolso = Anticipo - (P% × Anticipo) → Cliente
4. Plataforma retiene penalización

---

### BR-005: Disputas

**Apertura:**
- Por cliente: Servicio no realizado, defectuoso, incompleto
- Por contratista: Daños causados por cliente, no pudo acceder

**Resolución:**
- Admin revisa evidencia (mensajes, fotos, auditoría)
- Resuelve a favor de una de las partes
- Liquidación se ajusta según resolución

**Retención:** Liquidación se retiene por T horas (default 72h) durante investigación

---

### BR-006: Facturación

**Requisito Legal:**
- Emisión de comprobantes según LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de Particulares)
- MVP: Comprobantes simplificados en email
- Futuro: RFC/CFDI integrado

---

### BR-007: KYC/Verificación

**Para Contratistas:**
- Verificación mínima obligatoria para recibir pagos:
  - ID fiscal (RFC)
  - Información bancaria
  - Validación de información
- Sin KYC completo → No se liberan pagos (quedan en retención)

---

## 4. Enums y Estados Clave

### 4.1 Estados de Reserva (reservation.status)

| Estado | Descripción | Transiciones Válidas | Duración Típica |
|--------|-------------|--------|---------|
| CREATED | Recién creada, antes de pago | → CANCELED, DISPUTED | Segundos |
| ON_ROUTE | Contratista en ruta | → ON_SITE, CANCELED, DISPUTED | Minutos a horas |
| ON_SITE | Contratista en el sitio | → IN_PROGRESS, CANCELED, DISPUTED | Minutos |
| IN_PROGRESS | Servicio en ejecución | → COMPLETED, CANCELED, DISPUTED | Horas |
| COMPLETED | Servicio terminado, pago liberado | → DISPUTED | Terminal |
| NO_SHOW | Contratista no se presentó | → DISPUTED | Terminal |
| DISPUTED | Disputa abierta, bajo investigación | → RESOLVED_* | Horas a días |
| CANCELED | Cancelada por cliente o admin | Terminal | - |

---

### 4.2 Roles de Usuario (user.role)

| Rol | Descripción | Permisos Clave |
|-----|-----------|---------|
| CLIENT | Cliente que contrata servicios | Buscar, reservar, calificar, abrir disputas |
| CONTRACTOR | Proveedor de servicios | Publicar servicios, ver reservas, marcar estados, recibir pagos |
| ADMIN | Administrador de plataforma | Moderar contenido, resolver disputas, bloquear usuarios, ver métricas |

---

### 4.3 Tipos de Pago (payment.type)

| Tipo | Descripción | Timing | Monto |
|------|-----------|--------|-------|
| ANTICIPO | Cobrado al cliente al reservar | Inmediato | 20% × P |
| LIQUIDACION | Pagado al contratista al completar | Tras COMPLETED + ventana retención | 80% × P (menos comisión) |
| REFUND | Reembolso por cancelación | Al cancelar | Anticipo - penalización |

---

### 4.4 Estados de Pago (payment.status)

| Estado | Descripción |
|--------|-----------|
| INITIATED | Creado, esperando procesamiento Stripe |
| SUCCEEDED | Confirmado y procesado exitosamente |
| FAILED | Falló en Stripe, reintentos agotados |

---

### 4.5 Estados de Reseña (review.status)

| Estado | Descripción |
|--------|-----------|
| ACTIVE | Visible en plataforma |
| REMOVED_BY_ADMIN | Removida por moderación (spam, ofensivo, etc.) |

---

### 4.6 Estados de Disputa (dispute.status)

| Estado | Descripción | Impacto en Liquidación |
|--------|-----------|---------|
| OPEN | Bajo investigación | Retenida por T horas |
| RESOLVED_UPHOLD_CLIENT | Resuelta a favor de cliente | Reembolso total; contratista recibe solo comisión base |
| RESOLVED_UPHOLD_CONTRACTOR | Resuelta a favor de contratista | Liquidación total liberada |

---

### 4.7 Acciones Admin (admin_audit_log.action_type)

| Acción | Entidad Afectada | Propósito |
|--------|---------|---------|
| DELETE_REVIEW | REVIEW | Remover contenido ofensivo o spam |
| BLOCK_ACCOUNT | USER | Bloquear usuario por incumplimiento |
| PASSWORD_RESET | USER | Reset forzado de contraseña |
| RESOLVE_DISPUTE | DISPUTE | Resolver disputa y ajustar pagos |

---

## 5. Relaciones y Cardinalidades Clave

```
USER (1) ──── (1..N) ADDRESS
USER (1) ──── (1) CONTRACTOR_PROFILE (si role=CONTRACTOR)
CONTRACTOR_PROFILE (1) ──── (1..N) CONTRACTOR_COVERAGE
CONTRACTOR_COVERAGE (N) ──── (1) MUNICIPALITY

CONTRACTOR_PROFILE (1) ──── (1..N) SERVICE
SERVICE (N) ──── (1) CATEGORY
SERVICE (1) ──── (1..N) SERVICE_SCHEDULE
SERVICE (1) ──── (1..5) SERVICE_PHOTO

RESERVATION (N) ──── (1) SERVICE
RESERVATION (N) ──── (1) ADDRESS
RESERVATION (1) ──── (1..N) PAYMENT
RESERVATION (1) ──── (1..N) MESSAGE
RESERVATION (0..1) ──── (1) REVIEW
RESERVATION (0..1) ──── (1) DISPUTE

USER ──── (1..N) REVIEW (como reviewer)
USER ──── (1..N) REVIEW (como reviewee)
USER ──── (1..N) MESSAGE (como sender)
USER ──── (1..N) DISPUTE (como initiator)
USER ──── (1..N) ADMIN_AUDIT_LOG (como admin)
```

---

## 6. Consideraciones de Performance e Índices

### 6.1 Índices Críticos

**Por Dominio:**

| Índice | Tabla | Columnas | Propósito | Selectividad |
|--------|-------|----------|---------|---------|
| idx_user_email_unique | user | email | Verificación única, login | Muy alta |
| idx_user_role | user | role | Filtrado por rol (3 valores) | Baja |
| idx_service_contractor | service | contractor_user_id | Listado de servicios por contratista | Media |
| idx_service_active | service | active | Búsqueda de servicios publicados | Media |
| idx_reservation_client_start | reservation | client_user_id, start_at | Histórico del cliente | Media |
| idx_reservation_contractor_start | reservation | contractor_user_id, start_at | Histórico del contratista | Media |
| idx_reservation_status | reservation | status | Filtrado por estado | Baja-Media |
| idx_payment_type_status | payment | type, status | Búsqueda de transacciones pendientes | Baja |
| idx_address_municipality | address | municipality_id | Búsqueda de clientes por zona | Media |
| idx_coverage_municipality | contractor_coverage | municipality_id | Búsqueda de contratistas por zona | Media |
| idx_review_reviewee_created | review | reviewee_user_id, created_at | Cálculo de promedio de calificaciones | Media |

### 6.2 Índices Geoespaciales (Futuros)

Para optimizar búsquedas por ubicación:
```sql
CREATE INDEX idx_address_geom 
  ON address USING GIST (
    ll_to_earth(lat, lng)
  );
```

**Nota:** PostGIS Earth Distance para búsquedas radiales por distancia.

---

## 7. Moneda y Precisión Numérica

### 7.1 Especificación de Tipos

- **Montos en MXN:** `numeric(12,2)`
  - Rango: -999,999,999.99 a 999,999,999.99
  - Precisión: 2 decimales (centavos)
  - Justificación: SQL, no float (evita errores de precisión)

- **Horas estimadas:** `numeric(3,1)`
  - Rango: 0.0 a 999.9 horas
  - Ejemplo: 0.5, 1.0, 2.5, 4.0, 8.0, 12.0

- **Porcentajes:** `smallint`
  - Rango: -32768 a 32767
  - Limitado por constraint a {0, 10, 20}

- **Coordenadas (lat/lng):** `decimal(10,7)`
  - 10 dígitos totales, 7 decimales = precisión ~1.1 metros

### 7.2 Regla de Redondeo

**Todos los totales se redondean a 2 decimales en aplicación y BD:**
```
P = ROUND(Bp × (1 + M/100), 2)
Ic = ROUND(B - (C/100 × B), 2)
```

---

## 8. Flujo de Datos Completo: Ejemplo de Reserva

```mermaid
1. Usuario (cliente) busca servicios
   → GET /api/services/search?municipality=Guadalajara&category=Plomeria
   → Hits índices: idx_service_active, idx_address_municipality
   → Retorna: service.id, title, price_base_B, photos[]

2. Cliente visualiza detalle
   → GET /api/services/{service_id}
   → Carga: contractor_profile, review avg, service_schedule[]
   → Cliente elige dirección (address) y fecha/hora

3. Cliente inicia reserva
   → POST /api/bookings
   → Body: { service_id, address_id, start_at, contractor_user_id }
   → Sistema calcula:
     - recargo_percent (de contractor_profile.outside_markup_percent)
     - price_base_adjusted_Bp
     - price_public_P
     - anticipo_amount (20% × P)
   → Crea: reservation (status=CREATED) + payment (type=ANTICIPO, status=INITIATED)
   → Retorna: stripe checkout_url

4. Cliente paga en Stripe
   → Frontend redirige a Stripe Checkout
   → Cliente completa pago
   → Stripe envía webhook: payment_intent.succeeded

5. Backend procesa webhook
   → POST /api/webhooks/stripe
   → Verifica firma y idempotencia (stripe_payment_intent_id)
   → Actualiza: payment (status=SUCCEEDED)
   → Actualiza: reservation (status=ON_ROUTE)
   → Envía email de confirmación a contratista (AWS SES)

6. Contratista marca llegada
   → PATCH /api/bookings/{reservation_id}/state
   → Valida transición (ON_ROUTE → ON_SITE)
   → Actualiza: reservation (status=ON_SITE)
   → Auditoría: admin_audit_log (para trazabilidad)

7. Contratista marca completado
   → PATCH /api/bookings/{reservation_id}/state
   → Valida transición (IN_PROGRESS → COMPLETED)
   → Actualiza: reservation (status=COMPLETED)
   → Crea: payment (type=LIQUIDACION) con liquidacion_amount
   → Acciona: stripeService.createPayout() (Stripe Connect)
   → Stripe transfiere: B - (C% × B) - fees al contratista

8. Cliente califica
   → POST /api/reviews
   → Body: { reservation_id, stars, text }
   → Crea: review (status=ACTIVE)
   → Sistema recalcula: reviewee promedio de ratings
   → Cache se invalida (5-15 min)

9. (Opcional) Disputa
   → POST /api/disputes
   → Crea: dispute (status=OPEN)
   → Retiene: liquidacion_amount por T horas
   → Notifica: admin para revisión
   → Admin resuelve y actualiza: dispute (status=RESOLVED_*)
```

---

## 9. Matriz de Sensibilidad de Datos

| Dato | Clasificación | Almacenamiento | Retención | Cumplimiento |
|------|---------|---------|---------|---------|
| password_hash | Confidencial | BD con bcrypt/Argon2 | Mientras usuario activo | LFPDPPP |
| email | Personal | BD cifrada en tránsito | Mientras usuario activo | LFPDPPP, consentimiento |
| dirección (address) | Personal | BD, logs de auditoría | 12 meses (para conciliación) | LFPDPPP |
| números de tarjeta (PAN/CVV) | Crítico | **NO ALMACENAR** | - | PCI DSS (pasarela solo) |
| stripe payment intent id | Transaccional | BD | 12 meses (conciliación) | Auditoría Stripe |
| mensajes | Personal | BD | 7 días tras cierre reserva | Privacidad |
| coordenadas (lat/lng) | Personal | BD | Mientras usuario activo | LFPDPPP |

---

## 10. Reglas de Integridad Referencial

### 10.1 Restricciones ON DELETE/UPDATE

| FK | Relación | ON DELETE | Justificación |
|---|----------|---------|---------|
| reservation.contractor_user_id | FK user.id | RESTRICT | No se puede eliminar contratista con reservas activas |
| reservation.client_user_id | FK user.id | RESTRICT | No se puede eliminar cliente con reservas activas |
| payment.reservation_id | FK reservation.id | RESTRICT | Historial de pagos debe permanecer |
| review.reservation_id | FK reservation.id | RESTRICT | Reseñas se vinculan a reservas completadas |
| dispute.reservation_id | FK reservation.id | RESTRICT | Disputas son históricas |
| message.reservation_id | FK reservation.id | RESTRICT | Chat es histórico |
| service.contractor_user_id | FK user.id | RESTRICT | Servicios activos no se pueden eliminar (borrado lógico) |

### 10.2 Borrado Lógico

**Entidades que NO se eliminan físicamente:**
- `user` → Agregar columna `deleted_at` (soft delete)
- `service` → Usar columna `active=false`
- `review` → Usar columna `status='REMOVED_BY_ADMIN'`

**Entidades que SÍ se pueden eliminar (históricas):**
- `message` → Tras 7 días
- `admin_audit_log` → Tras período de retención (ej. 5 años)

---

## 11. Escalabilidad y Particionamiento (Futuro)

### 11.1 Estrategia para Miles de Registros

**Particionamiento por Municipio (contractor_coverage, address):**
```sql
CREATE TABLE address_gdl AS SELECT * FROM address 
  WHERE municipality_id = (SELECT id FROM municipality WHERE name='Guadalajara');
```

**Caching de Ratings:**
```
cache_key: "user:{reviewee_user_id}:avg_rating"
TTL: 5-15 min
Invalidado: Al crear nueva review
```

**Índices Compuestos para Búsqueda:**
```sql
CREATE INDEX idx_service_search 
  ON service(category_id, contractor_user_id, active);
```

---

## 12. Resumen de Campos Clave por Flujo

### Búsqueda de Servicios
- `service.title`, `service.description`, `service.price_base_B`
- `service.active`, `service_photo.url`
- `contractor_profile.about`, `review.stars` (agregado)
- `address.municipality_id`, `contractor_coverage.municipality_id`

### Reserva
- `reservation.start_at`, `reservation.status`
- `reservation.price_base_B`, `reservation.price_public_P`
- `reservation.anticipo_amount`, `reservation.liquidacion_amount`
- `address.lat`, `address.lng`

### Pagos
- `payment.type`, `payment.status`, `payment.amount`
- `payment.stripe_payment_intent_id`, `payment.stripe_charge_id`
- `payment.stripe_transfer_id` (para payouts)

### Moderación
- `review.status`, `review.removed_reason`
- `user.blocked`, `admin_audit_log.action_type`
- `dispute.status`, `dispute.resolution_notes`


---

## APÉNDICE A: Diagrama ER Simplificado

```
┌──────────────┐
│     USER     │ ◄───── role: {CLIENT, CONTRACTOR, ADMIN}
│──────────────│       blocked, email_verified_at
│ id (uuid) PK │
│ email UNIQUE │
│ password     │
│ name, phone  │
│ role         │
│ blocked      │
└──────────────┘
      ▲
      │ 1:1 (si CONTRACTOR)
      │
┌─────┴──────────────┐
│ CONTRACTOR_PROFILE │
│────────────────────│
│ user_id (PK, FK)   │
│ accepts_outside    │
│ outside_markup_%   │ ◄─── {0, 10, 20}
│ about              │
└─────┬──────────────┘
      │ 1:N
      ▼
┌──────────────────────┐
│ CONTRACTOR_COVERAGE  │
│──────────────────────│
│ id (uuid) PK         │
│ contractor_user_id FK│
│ municipality_id FK   │
│ is_primary           │
└─────┬────────────────┘
      │ N:1
      ▼
┌────────────────┐
│  MUNICIPALITY  │
│────────────────│
│ id (serial) PK │
│ name UNIQUE    │
└────────────────┘

┌──────────────┐
│    USER      │ ◄─── 1:N
├──────────────┤
│ id (uuid) PK │
└──────────────┘
      │
      │ 1:N
      ▼
┌──────────────────┐
│    ADDRESS       │
│──────────────────│
│ id (uuid) PK     │
│ user_id FK       │
│ street, ext_num  │
│ municipality FK  │
│ lat, lng         │
│ is_default       │
└──────────────────┘

┌──────────────────────┐
│  CONTRACTOR_PROFILE  │
│──────────────────────│
│ user_id (PK, FK)     │
└──────────────────────┘
      │ 1:N
      ▼
┌──────────────┐
│   SERVICE    │
│──────────────│
│ id (uuid) PK │
│ contr_user FK│
│ category FK  │
│ title        │
│ description  │
│ hours_est    │
│ price_base_B │
│ active       │
└──────────────┘
      │
      │ N:1 (CATEGORY)
      │ 1:N (SCHEDULE)
      │ 1:5 (PHOTOS)
      ▼
┌──────────────┐   ┌──────────────────┐
│   CATEGORY   │   │ SERVICE_SCHEDULE │
│──────────────│   │──────────────────│
│ id (serial)  │   │ id (uuid)        │
│ name UNIQUE  │   │ service_id FK    │
└──────────────┘   │ day_of_week      │
                   │ start_time       │
                   │ end_time         │
                   └──────────────────┘

┌──────────────────┐
│  SERVICE_PHOTO   │
│──────────────────│
│ id (uuid)        │
│ service_id FK    │
│ url              │
│ size_mb (≤5MB)   │
└──────────────────┘

┌───────────────────────┐
│   RESERVATION (CORE)  │
│───────────────────────│
│ id (uuid) PK          │
│ client_user_id FK     │
│ contractor_user_id FK │
│ service_id FK         │
│ address_id FK         │
│ start_at              │
│ hours_estimated       │
│ status (enum) ◄────── CREATED, ON_ROUTE, ON_SITE, IN_PROGRESS,
│                       COMPLETED, NO_SHOW, DISPUTED, CANCELED
│ recargo_percent       │ ◄─── {0, 10, 20}
│ markup_percent        │ ◄─── default 15%
│ price_base_B          │
│ price_base_adjusted   │
│ price_public_P        │
│ anticipo_amount       │
│ liquidacion_amount    │
│ currency              │
└───────────────────────┘
      │
      ├─► 1:N → PAYMENT
      ├─► 1:N → MESSAGE
      ├─► 0:1 → REVIEW
      └─► 0:1 → DISPUTE

┌──────────────────┐
│    PAYMENT       │
│──────────────────│
│ id (uuid) PK     │
│ reservation FK   │
│ type (enum)      │ ◄─── ANTICIPO, LIQUIDACION, REFUND
│ status (enum)    │ ◄─── INITIATED, SUCCEEDED, FAILED
│ amount           │
│ stripe_* (IDs)   │
└──────────────────┘

┌──────────────────┐
│    MESSAGE       │
│──────────────────│
│ id (uuid) PK     │
│ reservation FK   │
│ sender_user FK   │
│ content          │
│ created_at       │
└──────────────────┘

┌──────────────────┐
│    REVIEW        │
│──────────────────│
│ id (uuid) PK     │
│ reservation FK   │
│ reviewer_user FK │
│ reviewee_user FK │
│ stars (1-5)      │
│ text             │
│ status (enum)    │ ◄─── ACTIVE, REMOVED_BY_ADMIN
└──────────────────┘

┌──────────────────┐
│    DISPUTE       │
│──────────────────│
│ id (uuid) PK     │
│ reservation FK   │
│ initiator_user FK│
│ status (enum)    │ ◄─── OPEN, RESOLVED_UPHOLD_CLIENT,
│                  │      RESOLVED_UPHOLD_CONTRACTOR
│ resolution_notes │
└──────────────────┘

┌─────────────────────┐
│ ADMIN_AUDIT_LOG     │
│─────────────────────│
│ id (uuid) PK        │
│ admin_user_id FK    │
│ action_type (enum)  │ ◄─── DELETE_REVIEW, BLOCK_ACCOUNT,
│                     │      PASSWORD_RESET, RESOLVE_DISPUTE
│ target_type, target │
│ reason              │
└─────────────────────┘
```

---

## APÉNDICE B: Matriz de Campos Monetarios

**Flujo de dinero en una reserva típica:**

| Etapa | Campo | Valor | Fórmula | Quién Recibe |
|-------|-------|-------|---------|---------|
| 1. Base | `price_base_B` | $1,000 | Definido por contratista | Contratista (neto) |
| 2. Ajuste | `price_base_adjusted_Bp` | $1,100 | B × (1 + 10%) | - |
| 3. Cliente | `price_public_P` | $1,265 | Bp × (1 + 15%) | Cliente paga |
| 4. Inicial | `anticipo_amount` | $253 | P × 20% | Plataforma (en tránsito) |
| 5. Final | `liquidacion_amount` | $1,012 | P × 80% | Contratista (en tránsito) |
| 6. Comisión | Comisión | $150 | B × 15% | Plataforma |
| 7. Neto | Contratista recibe | $850 | B - Comisión | Contratista |

**Resumen:**
- Cliente paga: $1,265
- Plataforma cobra: $150 (comisión sobre $1,000)
- Contratista neto: $850 (después de comisión y fees Stripe)
- Plataforma retiene inicialmente: $253 + $150 = $403 (anticipo + comisión)
- Plataforma libera al contratista: $850 (tras completar)

---

## APÉNDICE C: Transiciones de Estado Válidas

```
RESERVATION STATES:

CREATED (0)
  ├─► CANCELED (fin)
  └─► DISPUTED (investigación)

ON_ROUTE (1)
  ├─► ON_SITE (2) → IN_PROGRESS (3) → COMPLETED (5)
  ├─► CANCELED (fin)
  └─► DISPUTED (investigación)

IN_PROGRESS (3)
  ├─► COMPLETED (5) → [DISPUTED] (investigación)
  ├─► CANCELED (fin)
  └─► DISPUTED (investigación)

NO_SHOW (4)
  └─► DISPUTED (investigación)

COMPLETED (5)
  └─► DISPUTED (investigación)

DISPUTED (D)
  ├─► RESOLVED_UPHOLD_CLIENT (fin)
  └─► RESOLVED_UPHOLD_CONTRACTOR (fin)

CANCELED (FIN)
  └─ Terminal

Reglas:
- No hay rollback (hacia estados anteriores)
- DISPUTED es accesible desde casi cualquier estado
- COMPLETED → liberación de liquidación
- CANCELED → retención de fondos / reembolso parcial
```

---

## APÉNDICE D: Configuración Global (por Implementar)

**Tabla sugerida: `platform_config`**

```sql
CREATE TABLE platform_config (
  id UUID PRIMARY KEY,
  
  -- Precios y Comisiones
  platform_markup_percent SMALLINT DEFAULT 15,     -- BR-001
  platform_commission_percent SMALLINT DEFAULT 15, -- BR-002
  anticipo_percent SMALLINT DEFAULT 20,            -- BR-003
  
  -- Cancelaciones
  cancellation_window_hours SMALLINT DEFAULT 24,
  cancellation_penalty_percent SMALLINT DEFAULT 10, -- BR-004
  
  -- Disputas
  dispute_hold_hours SMALLINT DEFAULT 72,          -- BR-003
  
  -- Pagos
  stripe_account_id VARCHAR(120) NOT NULL,
  stripe_webhook_secret VARCHAR(120) NOT NULL,
  
  -- Auditoría
  updated_at TIMESTAMPTZ,
  updated_by UUID FK user.id
);
```

**Nota:** Estas configuraciones deben ser versionadas y auditadas en cada cambio.

---

## APÉNDICE E: Roadmap de Características Futuras

### Fase 1 (MVP Actual)
- Búsqueda básica de servicios
- Reservas con anticipo
- Pagos vía Stripe Checkout + Connect
- Mensajería simple
- Calificaciones básicas
- Admin lite

### Fase 2 (Q1 2026)
- Geolocalización avanzada (búsqueda por radio)
- Planificación de agenda recurrente
- Cupones y descuentos
- Historial de disputas mejorado
- Dashboard de contratista con métricas

### Fase 3 (Q2 2026)
- Aplicación móvil (iOS/Android)
- Sistema de recomendaciones
- Programas de lealtad
- Seguro de servicios
- Integración con sistemas contables

### Escalabilidad
- Particionamiento por municipio (miles de servicios)
- Cache distribuido (Redis)
- Search engine (Elasticsearch) para búsquedas complejas
- CDN geográfica para imágenes

