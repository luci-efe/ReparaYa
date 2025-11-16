# Resumen Ejecutivo: Modelo de Datos - ReparaYa

## Descripción General

ReparaYa es un **marketplace de servicios locales** (plomería, electricidad, limpieza, reparaciones, etc.) que conecta **clientes** con **contratistas**. El modelo de datos está diseñado para soportar:

- Búsqueda y catálogo de servicios por ubicación y categoría
- Reservas con **anticipo obligatorio** (20% del precio)
- Pagos mediante **Stripe** (Checkout para clientes, Connect para contratistas)
- Gestión de disputas y reseñas
- Auditoría y moderación administrativa

## Estadísticas del Modelo

| Métrica | Valor |
|---------|-------|
| **Entidades principales** | 15 tablas |
| **Dominios de negocio** | 8 módulos |
| **Enums/Estados** | 25+ estados distribuidos |
| **Índices recomendados** | 15+ índices críticos |
| **Relaciones** | 22 FK principales |
| **Reglas de negocio** | 7 BR (BR-001 a BR-007) |
| **Líneas de documentación** | 1,200+ (este documento) |

## Las 10 Entidades Más Críticas

1. **User**: Almacena clientes, contratistas, admins
2. **ContractorProfile**: Extiende datos de contratistas (verificación, Stripe Connect)
3. **Service**: Servicios publicados (precio base, descripción, imágenes)
4. **Booking**: El núcleo - vincula cliente, contratista, servicio, dirección y estado
5. **Payment**: Transacciones de pago (anticipos, liquidaciones, reembolsos)
6. **Rating**: Calificaciones y reseñas
7. **Dispute**: Gestión de conflictos
8. **Message**: Chat cliente-contratista
9. **Availability**: Horarios de disponibilidad del servicio
10. **Address**: Direcciones de servicio

## Flujo de Dinero (Ejemplo Práctico)

```
CLIENTE PAGA $1,265 MXN
│
├─→ ANTICIPO $253 (20%) ─┐
│   [Debitado inmediatamente]  │
│                              │
├─→ LIQUIDACION $1,012 (80%)   │
│   [Pendiente para contratista] 
│                              │
└─→ DESGLOSES:                 │
    - Precio base: $1,000      │
    - Recargo por ubicación: $100 (10%)
    - Recargo plataforma: $165 (15% sobre $1,100)
    
    CONTRATISTA RECIBE:
    - Ingreso bruto: $850 (1,000 - 15% comisión)
    - Fees Stripe: ~$25
    - NETO: ~$825
    
    PLATAFORMA RETIENE:
    - Comisión: $150 (15% sobre $1,000)
    - Recargo plataforma: $165
    - TOTAL: $315 (~25% del precio público)
```

## Estados de Booking (Máquina de Estados)

```
PENDING_PAYMENT (recién creada, esperando anticipo)
  ↓ [pago exitoso del anticipo]
CONFIRMED (pagada, programada)
  ↓ [contratista en ruta]
ON_ROUTE
  ↓ [llega al sitio]
ON_SITE
  ↓ [comienza servicio]
IN_PROGRESS
  ↓ [termina servicio y cliente paga liquidación]
COMPLETED ← [cliente puede calificar aquí]
  ↓ [si hay problema]
DISPUTED (investigación admin)

O en cualquier momento antes de COMPLETED:
→ CANCELLED (con posible penalización)
```

## 7 Reglas de Negocio Clave

| BR | Nombre | Fórmula/Descripción | Impacto |
|----|--------|---------|--------|
| **BR-001** | Precios y Recargos | P = B × (1+R%) × (1+M%) | Define precio cobrado al cliente |
| **BR-002** | Comisiones | Ic = B - (C% × B) | Ingreso del contratista |
| **BR-003** | Anticipo y Liquidación | Anticipo=20%×P, Liquidación=80%×P | Flujo de dinero |
| **BR-004** | Cancelaciones | Si <24h = penalidad P% | Reembolsos |
| **BR-005** | Disputas | Admin revisa, resuelve a favor de una parte | Retención de pagos |
| **BR-006** | Facturación | Comprobantes según LFPDPPP | Cumplimiento legal |
| **BR-007** | KYC/Verificación | RFC + datos bancarios obligatorios | Seguridad de payouts |

## Campos Monetarios en Booking (El Corazón Financiero)

```
basePrice: $1,000 (lo que establece el contratista en Service)
    ↓ [puede incluir ajustes]
finalPrice: $1,000 (precio final acordado)
    ↓ [divide en dos pagos]
    ├─→ anticipoAmount: $200 (20% del finalPrice)
    ├─→ liquidacionAmount: $800 (80% del finalPrice)
    ├─→ comisionAmount: $150 (15% del basePrice - para la plataforma)
    └─→ contractorPayoutAmount: $850 (lo que recibe el contratista)
```

**Crítico:** La comisión se aplica sobre el basePrice. El contratista recibe `basePrice - comisionAmount` después de completar el servicio.

## 15+ Índices Críticos

**TOP 5 por importancia:**
1. `idx_user_email_unique` - Para login rápido
2. `idx_service_active` - Para búsqueda de servicios
3. `idx_reservation_status` - Para filtrar por estado
4. `idx_payment_type_status` - Para conciliación
5. `idx_review_reviewee_created` - Para cálculo de ratings

Ver sección 6.1 del documento para lista completa.

## Consideraciones de Seguridad

| Dato | Acción |
|------|--------|
| password_hash | Almacenar con bcrypt/Argon2 |
| PAN/CVV tarjeta | **NUNCA almacenar** (solo Stripe) |
| stripe_payment_intent_id | Almacenar para idempotencia |
| mensajes | Eliminar tras 7 días de cierre |
| direcciones | Retener 12 meses (conciliación) |

## Roles y Permisos

**CLIENT**
- Buscar, reservar, pagar anticipos
- Calificar servicios
- Abrir disputas

**CONTRACTOR**
- Publicar servicios y horarios
- Recibir reservas
- Marcar progreso (ON_SITE, COMPLETED)
- Recibir pagos (con Stripe Connect)

**ADMIN**
- Moderar contenido
- Resolver disputas
- Bloquear usuarios
- Ver métricas

## Escalabilidad (Preparado para Crecer)

**MVP (actual):** Cientos de servicios
- índices básicos
- caché simple de ratings
- sin particionamiento

**Escala a Miles:** 
- Particionamiento por municipio
- Cache distribuido (Redis)
- Full-text search (Elasticsearch)
- Índices geoespaciales (PostGIS)

## Enums Principales (25+ Estados)

**Reservation Status (8):**
CREATED, ON_ROUTE, ON_SITE, IN_PROGRESS, COMPLETED, NO_SHOW, DISPUTED, CANCELED

**Payment Status (3):**
INITIATED, SUCCEEDED, FAILED

**Payment Type (3):**
ANTICIPO, LIQUIDACION, REFUND

**Review Status (2):**
ACTIVE, REMOVED_BY_ADMIN

**Dispute Status (3):**
OPEN, RESOLVED_UPHOLD_CLIENT, RESOLVED_UPHOLD_CONTRACTOR

**User Role (3):**
ADMIN, CONTRACTOR, CLIENT

## Retención de Datos (LFPDPPP Compliance)

| Dato | Retención | Justificación |
|------|-----------|---------|
| Mensajes | 7 días post-cierre | Privacidad |
| Pagos | 12 meses | Auditoría/Conciliación |
| Direcciones | 12 meses | Conciliación |
| Logs de admin | 5 años | Auditoría |
| Usuario bloqueado | Indefinido | Seguridad |

## Precisión Numérica

- **Montos MXN:** `numeric(12,2)` (2 decimales, evita errores float)
- **Horas estimadas:** `numeric(3,1)` (0.5 a 999.9)
- **Porcentajes:** `smallint` (limitado a {0,10,20})
- **Coordenadas:** `decimal(10,7)` (~1.1 m de precisión)

## Línea de Tiempo de una Reserva Exitosa

```
T=0: Cliente busca → GET /api/services/search
T=1: Cliente ve detalle → GET /api/services/{id}
T=2: Cliente reserva → POST /api/bookings
     Sistema calcula precios, crea payment (INITIATED)
T=3: Cliente paga en Stripe
T=4: Stripe envía webhook → /api/webhooks/stripe
     Sistema actualiza payment (SUCCEEDED), reservation (ON_ROUTE)
T=5-60min: Contratista viaja
T=60: Contratista marca ON_SITE
T=60-120min: Servicio en ejecución
T=120: Contratista marca COMPLETED
       Sistema dispara payout a Stripe Connect
T=120+: Cliente puede calificar
T=120+72h: Dinero llega a cuenta bancaria del contratista
           (después de retención de disputa de 72h si aplica)
```

## Archivo de Documentación Completa

**Ubicación:** `/home/fr/School/7mo-sem/sistemas-escalables/reparaya/ReparaYa/docs/md/`

Documento generado: `modelo_datos_reparaya.md` (1,200+ líneas)

Contiene:
- Definición completa de 15 entidades
- 7 reglas de negocio con ejemplos
- 25+ enums y estados
- Diagramas ER
- Matriz de sensibilidad de datos
- Consideraciones de performance
- Roadmap de escalabilidad

## Próximos Pasos

1. **Generar schema Prisma** desde este modelo
2. **Implementar validaciones** de reglas de negocio en capa aplicación
3. **Crear migrations** de base de datos
4. **Escribir testes** para flujos de pago y disputas
5. **Documentar APIs** con tipos generados de schema

---

**Documento Generado:** 2025-11-11  
**Fuentes:** SRS 1.1, SDD (Modelo de datos), Architecture Overview  
**Estado:** Completo y listo para implementación
