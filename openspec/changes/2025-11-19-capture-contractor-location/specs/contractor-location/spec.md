# Spec: Ubicación y Zona de Operación de Contratistas

**Módulo:** `contractor-location`
**Versión:** 1.0.0
**Última actualización:** 2025-11-19
**Estado:** Propuesta

---

## Propósito

Este módulo permite a los contratistas registrar su ubicación física (dirección base de operaciones) y configurar su zona de cobertura de servicios. Esta información es fundamental para:

1. **Búsqueda geográfica:** Permitir a clientes encontrar contratistas cercanos
2. **Validación de cobertura:** Verificar que un contratista atiende la ubicación del cliente antes de aceptar reservas
3. **Cálculo de logística:** Estimar tiempos de desplazamiento y costos de traslado
4. **Transparencia:** Mostrar a clientes dónde opera cada contratista

El módulo integra AWS Location Service para geocodificación server-side, garantizando coordenadas precisas sin exponer credenciales al cliente.

---

## Alcance

### Incluido
- Captura de dirección normalizada (calle, número, colonia, ciudad, estado, CP, país)
- Geocodificación automática vía AWS Location Service Place Index
- Inferencia de timezone por coordenadas
- Configuración de zona de operación tipo RADIUS (radio en km)
- Validación de input con Zod (server-side)
- Control de acceso basado en ownership y roles
- Restricciones de edición según estado del perfil (DRAFT/ACTIVE)
- API RESTful autenticada
- UI de captura en onboarding y settings

### Fuera de Alcance (Futuro)
- Zonas tipo POLYGON (polígonos personalizados)
- Múltiples ubicaciones por contratista
- Búsqueda geográfica de contratistas (módulo `search`)
- Cálculo de rutas y ETAs (módulo `booking`)
- Jobs de re-geocodificación asíncrona
- Dashboard de admin con mapa de cobertura

---

## ADDED Requirements

### Requirement: Captura de Dirección Normalizada (RF-CTR-LOC-001)

El sistema MUST permitir a un contratista autenticado registrar su dirección base de operaciones con campos estructurados (calle, número, colonia, ciudad, estado, código postal, país).

**Actor:** CONTRACTOR (owner del perfil)

**Precondiciones:**
- Usuario autenticado con rol CONTRACTOR
- Existe un ContractorProfile asociado al usuario
- El perfil está en estado DRAFT
- No existe ubicación previa registrada

**Poscondiciones:**
- Dirección guardada en tabla `ContractorServiceLocation`
- Geocodificación iniciada (RF-CTR-LOC-002)

**Reglas de Negocio:**
- Todos los campos son requeridos excepto `interiorNumber` y `neighborhood`
- La dirección debe pertenecer a un país soportado (MX, US, CO, PE, AR)
- El código postal debe seguir formato del país (MX: 5 dígitos)
- Un contratista solo puede tener una ubicación base (relación 1:1)

#### Scenario: Registro exitoso de dirección completa

**Given:** Contratista con perfil en DRAFT sin ubicación previa
**When:** Envía POST `/api/contractors/{id}/location` con dirección válida completa
**Then:**
- Sistema valida campos con Zod
- Dirección se guarda en BD
- Geocodificación se ejecuta (RF-CTR-LOC-002)
- Response 201 con ubicación creada

#### Scenario: Rechazo por perfil en estado ACTIVE

**Given:** Contratista con perfil en ACTIVE
**When:** Intenta crear ubicación
**Then:**
- Sistema valida estado del perfil
- Rechaza con error 400 "Profile must be in DRAFT state"
- No se modifica BD

---

### Requirement: Geocodificación Automática con AWS Location Service (RF-CTR-LOC-002)

El sistema MUST geocodificar automáticamente la dirección ingresada usando AWS Location Service Place Index, obteniendo coordenadas (lat/lng) y dirección normalizada.

**Actor:** Sistema (servidor)

**Precondiciones:**
- Dirección válida guardada (RF-CTR-LOC-001)
- AWS Location Service configurado con Place Index `reparaya-places`
- Credenciales AWS válidas en env vars

**Poscondiciones:**
- Si geocodificación exitosa:
  - `baseLatitude`, `baseLongitude` guardados
  - `normalizedAddress` guardado (formato devuelto por AWS)
  - `geocodingStatus = SUCCESS`
  - `timezone` inferido con librería `geo-tz`
- Si geocodificación falla:
  - `geocodingStatus = FAILED`
  - `baseLatitude`, `baseLongitude` = null
  - Usuario notificado con mensaje claro

**Reglas de Negocio:**
- Timeout de geocodificación: 5 segundos
- Retry con exponential backoff: 3 intentos
- Solo aceptar resultados con `Relevance >= 0.8` (AWS score)
- Si múltiples resultados, elegir el de mayor relevance
- Timezone se infiere por coordenadas (librería `geo-tz`)

#### Scenario: Geocodificación exitosa con alta relevancia

**Given:** Dirección "Av. Insurgentes Sur 123, Roma Norte, Ciudad de México, CDMX, 06700, MX"
**When:** Sistema llama a AWS Location Service
**Then:**
- AWS devuelve resultado con Relevance 0.95
- Coordenadas: lat=19.432608, lng=-99.133209
- Dirección normalizada: "Avenida Insurgentes Sur 123, Colonia Roma Norte, Ciudad de México, CDMX 06700, México"
- Timezone: "America/Mexico_City"
- `geocodingStatus = SUCCESS`

#### Scenario: Fallo por timeout de AWS

**Given:** Dirección válida
**When:** AWS Location Service no responde en 5 segundos
**Then:**
- Sistema intenta 3 veces con exponential backoff
- Después de 3 fallos, guarda con `geocodingStatus = FAILED`
- Response 201 con mensaje: "No pudimos validar la dirección automáticamente. Verifica los datos."
- Usuario puede editar dirección y reintentar

#### Scenario: Dirección ambigua con múltiples resultados

**Given:** Dirección "Calle 5 de Mayo 10, México"
**When:** AWS devuelve 3 resultados con relevance [0.7, 0.85, 0.6]
**Then:**
- Sistema elige resultado con relevance 0.85
- Guarda coordenadas y dirección normalizada de ese resultado
- `geocodingStatus = SUCCESS`

---

### Requirement: Configuración de Zona de Operación (RF-CTR-LOC-003)

El sistema MUST permitir al contratista configurar su zona de cobertura mediante un radio en kilómetros desde su ubicación base.

**Actor:** CONTRACTOR (owner del perfil)

**Precondiciones:**
- Ubicación base registrada (RF-CTR-LOC-001)
- Geocodificación exitosa (opcional: permite configurar zona aunque geocoding falle)

**Poscondiciones:**
- Zona guardada con `zoneType = RADIUS` y `radiusKm`
- Clientes pueden ver zona (sin dirección exacta)

**Reglas de Negocio:**
- Tipo de zona MVP: solo RADIUS
- Radio mínimo: 1 km
- Radio máximo: 100 km
- Radio debe ser número entero positivo
- Tipo POLYGON reservado para futuro (validación rechaza)

#### Scenario: Configuración de zona con radio de 15 km

**Given:** Contratista con ubicación base geocodificada
**When:** Envía POST con `serviceZone: { type: 'RADIUS', radiusKm: 15 }`
**Then:**
- Sistema valida que radiusKm está en rango [1, 100]
- Guarda `zoneType = RADIUS`, `radiusKm = 15`
- Response incluye zona configurada

#### Scenario: Rechazo de radio fuera de rango

**Given:** Contratista intenta configurar zona
**When:** Envía `radiusKm: 150`
**Then:**
- Validador Zod falla
- Response 400 con error: "El radio debe estar entre 1 y 100 km"

---

### Requirement: Edición de Ubicación y Zona (RF-CTR-LOC-004)

El sistema MUST permitir editar la ubicación y zona de operación con restricciones según el estado del perfil del contratista.

**Actor:** CONTRACTOR (owner) o ADMIN

**Precondiciones:**
- Ubicación existe
- Usuario autenticado

**Poscondiciones:**
- Si perfil en DRAFT: actualización directa
- Si perfil en ACTIVE: solo ADMIN puede editar
- Si dirección cambió: re-geocodificación automática

**Reglas de Negocio:**
- Perfil en DRAFT: CONTRACTOR owner puede editar libremente
- Perfil en ACTIVE/SUSPENDED: solo ADMIN puede editar
- Si se cambia dirección, `geocodingStatus` vuelve a PENDING y se ejecuta geocoding
- Si solo se cambia zona, no se re-geocodifica

#### Scenario: Edición exitosa en perfil DRAFT

**Given:** Contratista con perfil DRAFT y ubicación existente
**When:** Envía PATCH `/api/contractors/{id}/location` con nuevo `radiusKm: 20`
**Then:**
- Sistema actualiza `radiusKm` a 20
- No se ejecuta geocoding (dirección no cambió)
- Response 200 con ubicación actualizada

#### Scenario: Bloqueo de edición en perfil ACTIVE

**Given:** Contratista con perfil ACTIVE
**When:** Intenta PATCH `/api/contractors/{id}/location`
**Then:**
- Sistema valida estado del perfil
- Rechaza con 403 "Only admins can edit location of active profiles"

#### Scenario: Re-geocodificación al cambiar dirección

**Given:** Contratista edita `city` de "CDMX" a "Monterrey"
**When:** Envía PATCH con nueva ciudad
**Then:**
- Sistema detecta cambio en dirección
- Cambia `geocodingStatus` a PENDING
- Ejecuta geocoding con nueva dirección
- Actualiza coordenadas y timezone

---

### Requirement: Visualización de Ubicación según Rol (RF-CTR-LOC-005)

El sistema MUST devolver información de ubicación filtrada según el rol del solicitante, protegiendo la privacidad de la dirección exacta del contratista.

**Actor:** CONTRACTOR (owner), CLIENT, ADMIN

**Precondiciones:**
- Usuario autenticado
- Ubicación existe

**Poscondiciones:**
- Response con DTO selectivo según rol

**Reglas de Negocio:**
- **CONTRACTOR (owner) ve:** Dirección completa, coordenadas exactas, timezone, zona
- **ADMIN ve:** Todo (igual que owner)
- **CLIENT ve:** Solo ciudad, estado, coordenadas aproximadas (2 decimales), zona de cobertura
- **Usuario no autenticado:** Error 401

#### Scenario: Owner consulta su ubicación

**Given:** Contratista autenticado consulta su propia ubicación
**When:** GET `/api/contractors/{id}/location`
**Then:**
- Response incluye:
  - `address`: Objeto completo con calle, número, colonia, etc.
  - `coordinates`: { lat: 19.432608, lng: -99.133209 } (precisión completa)
  - `timezone`: "America/Mexico_City"
  - `serviceZone`: { type: "RADIUS", radiusKm: 15 }

#### Scenario: Cliente consulta ubicación de contratista

**Given:** Cliente autenticado consulta ubicación de otro contratista
**When:** GET `/api/contractors/{otherId}/location`
**Then:**
- Response incluye:
  - `city`: "Ciudad de México"
  - `state`: "CDMX"
  - `coordinates`: { lat: 19.43, lng: -99.13 } (aproximado a 2 decimales)
  - `serviceZone`: { type: "RADIUS", radiusKm: 15 }
- NO incluye dirección exacta ni timezone

---

### Requirement: Performance de Geocodificación (RNF-CTR-LOC-001)

La geocodificación MUST completarse en un tiempo aceptable para no afectar la experiencia del usuario durante el onboarding.

**Métrica:** Percentil 95 (P95) de latencia de geocoding ≤ 1.5 segundos

**Validación:**
- Test de carga con k6
- 10 VUs concurrentes
- 95% de requests válidos, 5% inválidos
- Medición: tiempo desde llamada a AWS hasta response

**Consecuencias de incumplimiento:**
- Onboarding lento frustra a contratistas
- Abandonos en proceso de registro

**Mitigación:**
- Timeout de 5s con retry asíncrono si falla
- Caché de resultados (no re-geocodificar si dirección no cambió)
- Opción de "guardar sin validar" y geocodificar en background job (futuro)

#### Scenario: Geocoding dentro de threshold

**Given:** 10 usuarios concurrentes creando ubicación
**When:** Se ejecuta test de carga por 1 minuto
**Then:**
- P95 de latencia ≤ 1.5 segundos
- P99 de latencia ≤ 2.5 segundos

---

### Requirement: Privacidad y Protección de Datos (RNF-CTR-LOC-002)

La dirección exacta del contratista es información sensible (PII) y MUST ser visible solo para el propietario y administradores.

**Requisitos:**
- Dirección completa solo en DTOs para owner/admin
- Coordenadas aproximadas (2 decimales ~1km precisión) para clientes
- No incluir dirección exacta en logs
- Encriptación en tránsito (HTTPS)
- Encriptación en reposo (RDS encryption)

**Validación:**
- Test de autorización: cliente no puede ver dirección completa (response no incluye campo `address`)
- Auditoría de logs: verificar que no se loguea dirección completa
- Test de API: confirmar que DTOs difieren según rol

**Consecuencias de incumplimiento:**
- Violación de privacidad del contratista
- Riesgo de acoso o visitas no autorizadas
- Posibles implicaciones legales (GDPR-like)

#### Scenario: Cliente no ve dirección exacta

**Given:** Cliente consulta ubicación de contratista
**When:** GET `/api/contractors/{id}/location`
**Then:**
- Response NO incluye campo `address`
- Response NO incluye `timezone`
- Coordenadas aproximadas a 2 decimales

---

### Requirement: Accesibilidad del Formulario (RNF-CTR-LOC-003)

El formulario de captura de dirección MUST ser accesible para usuarios con discapacidades.

**Requisitos:**
- Labels asociados a inputs (htmlFor)
- Focus states visibles (outline)
- Navegación por teclado (Tab, Shift+Tab, Enter)
- ARIA labels descriptivos
- Mensajes de error anunciados por screen readers
- Contrast ratio ≥ 4.5:1 para texto
- Touch targets ≥ 44x44px

**Validación:**
- Test automatizado con axe-core (0 violations críticas)
- Test manual con lector de pantalla (NVDA/JAWS)
- Test de navegación solo por teclado
- Lighthouse accessibility score ≥ 90

**Consecuencias de incumplimiento:**
- Exclusión de contratistas con discapacidades
- Incumplimiento de estándares web
- Posibles demandas por discriminación

#### Scenario: Navegación por teclado completa

**Given:** Usuario accede a formulario de dirección
**When:** Navega solo con teclado (Tab, Shift+Tab, Enter)
**Then:**
- Puede acceder a todos los campos en orden lógico
- Focus visible en todo momento
- Puede enviar formulario con Enter
- Mensajes de error son anunciados por screen reader

---

## Modelo de Datos

### Prisma Schema

```prisma
// Enums
enum GeocodingStatus {
  PENDING
  SUCCESS
  FAILED
}

enum ServiceZoneType {
  RADIUS
  POLYGON // Futuro
}

// Modelo Principal
model ContractorServiceLocation {
  id                    String   @id @default(cuid())
  contractorProfileId   String   @unique
  contractorProfile     ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)

  // Dirección estructurada
  street                String   @db.VarChar(200)
  exteriorNumber        String   @db.VarChar(20)
  interiorNumber        String?  @db.VarChar(20)
  neighborhood          String?  @db.VarChar(100)
  city                  String   @db.VarChar(100)
  state                 String   @db.VarChar(100)
  postalCode            String   @db.VarChar(10)
  country               String   @db.VarChar(2) // ISO 3166-1 alpha-2

  // Geocodificación
  baseLatitude          Decimal? @db.Decimal(10, 8)  // Rango: -90.00000000 a 90.00000000
  baseLongitude         Decimal? @db.Decimal(11, 8)  // Rango: -180.00000000 a 180.00000000
  normalizedAddress     String?  @db.Text // Dirección devuelta por AWS
  timezone              String?  @db.VarChar(50) // IANA timezone (ej. "America/Mexico_City")
  geocodingStatus       GeocodingStatus @default(PENDING)

  // Zona de operación
  zoneType              ServiceZoneType
  radiusKm              Int?     // Para tipo RADIUS
  polygonCoordinates    Json?    // Para tipo POLYGON (futuro)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Índices para búsquedas geográficas (futuro)
  @@index([baseLatitude, baseLongitude])
  @@index([city, state])
}
```

### Extensión de ContractorProfile

```prisma
model ContractorProfile {
  // ... campos existentes

  // Nueva relación
  serviceLocation       ContractorServiceLocation?
}
```

---

## Plan de Testing

### Test Cases

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-RF-CTR-LOC-001 | Crear ubicación con dirección válida y geocoding exitoso | Integración | Alta | RF-CTR-LOC-001, RF-CTR-LOC-002 |
| TC-RF-CTR-LOC-002 | Crear ubicación con dirección ambigua (múltiples resultados AWS) | Integración | Alta | RF-CTR-LOC-002 |
| TC-RF-CTR-LOC-003 | Fallo de geocoding por timeout de AWS (guardar con status FAILED) | Unitaria | Alta | RF-CTR-LOC-002 |
| TC-RF-CTR-LOC-004 | Actualizar ubicación en estado DRAFT exitoso | Integración | Alta | RF-CTR-LOC-004 |
| TC-RF-CTR-LOC-005 | Bloqueo de edición en estado ACTIVE para CONTRACTOR no admin | Integración | Alta | RF-CTR-LOC-004 |
| TC-RF-CTR-LOC-006 | Configurar zona RADIUS con 10 km válido | Unitaria | Alta | RF-CTR-LOC-003 |
| TC-RF-CTR-LOC-007 | Validación rechaza radio de 0 km y 150 km | Unitaria | Alta | RF-CTR-LOC-003 |
| TC-RF-CTR-LOC-008 | Autorización: solo owner puede editar su ubicación | Integración | Alta | RF-CTR-LOC-001, RF-CTR-LOC-004 |
| TC-RF-CTR-LOC-009 | Autorización: admin puede ver cualquier ubicación | Integración | Media | RF-CTR-LOC-005 |
| TC-RF-CTR-LOC-010 | Autorización: cliente no puede ver dirección exacta | Integración | Alta | RF-CTR-LOC-005 |
| TC-RF-CTR-LOC-011 | Re-geocodificación automática al cambiar dirección en PATCH | Integración | Media | RF-CTR-LOC-004 |
| TC-RF-CTR-LOC-012 | No re-geocodificar si solo cambia zona (sin cambio de dirección) | Integración | Media | RF-CTR-LOC-004 |
| TC-RNF-CTR-LOC-001 | Performance: geocoding P95 ≤ 1.5s | Performance | Alta | RNF-CTR-LOC-001 |
| TC-RNF-CTR-LOC-002 | Privacy: DTO selectivo según rol (cliente no ve address field) | Integración | Alta | RNF-CTR-LOC-002 |
| TC-RNF-CTR-LOC-003 | A11y: navegación por teclado en formulario de dirección | E2E | Media | RNF-CTR-LOC-003 |

---

## Referencias

- **AWS Location Service Documentation:** https://docs.aws.amazon.com/location/
- **geo-tz (timezone inference):** https://github.com/evansiroky/node-geo-tz
- **Haversine Formula:** https://en.wikipedia.org/wiki/Haversine_formula
- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **OpenSpec Methodology:** `/openspec/README.md`

---

**Fin del Spec v1.0.0**
