# Especificación: Testing y QA

## Propósito y alcance

Define la estrategia de pruebas completa para ReparaYa, incluyendo unitarias,
integración, E2E, performance y seguridad.

## Requisitos relacionados

- Todos los RF y RNF deben tener casos de prueba trazables

## Estrategia de pruebas

### 1. Unitarias (Jest)

**Cobertura objetivo**: ≥ 70% en módulos core

Áreas:
- Servicios de dominio (lógica de negocio)
- Utilidades (validaciones, helpers)
- Cálculos (comisiones, precios según BR-001/BR-002)

Ejemplo:
```typescript
describe('CommissionService', () => {
  it('should calculate contractor payout correctly', () => {
    const basePrice = 1000;
    const result = commissionService.calculateContractorPayout(basePrice);
    expect(result).toBe(850); // 1000 - 15%
  });
});
```

### 2. Integración (Jest + Supertest)

Áreas:
- Endpoints HTTP con autenticación
- Webhooks (Clerk, Stripe)
- Integración con servicios externos (mocks o test mode)

Ejemplo:
```typescript
describe('POST /api/bookings', () => {
  it('should create booking and payment intent', async () => {
    const response = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ service_id: '...', availability_id: '...' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('checkout_url');
  });
});
```

### 3. End-to-End (Playwright)

Flujos críticos:
- Búsqueda → detalle → reserva → pago → confirmación
- Contratista: publicar servicio → gestionar reserva → marcar completada
- Admin: moderar servicio → resolver disputa

### 4. Performance (k6)

Objetivos:
- Búsqueda: P95 ≤ 1.2s con 10 RPS sostenidos
- Checkout: P95 ≤ 1.5s
- Webhooks: P95 ≤ 0.8s

Dataset de prueba:
- 300+ servicios
- 200+ usuarios
- 200+ reservas históricas

Ejemplo k6:
```javascript
export default function () {
  const response = http.get('http://localhost:3000/api/services/search?location=Guadalajara');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1200ms': (r) => r.timings.duration < 1200,
  });
}
```

### 5. Seguridad

- OWASP Top 10 básico
- Autorización por rol (intentar acceder como rol incorrecto)
- Sanitización de inputs (XSS en mensajería)
- Rate limiting

## Trazabilidad

Cada caso de prueba debe:
- Tener ID único: `TC-[RF|RNF|BR]-XXX-YY`
- Referirse a requisito específico
- Documentarse en STP

Ejemplo:
- `TC-RF-001-01`: Búsqueda por ubicación → RF-001
- `TC-BR-002-01`: Cálculo de comisiones → BR-002

## Ambiente de pruebas

- Local: Docker Compose con Postgres, servicios mock
- Stripe: Test mode
- AWS: Localstack o recursos dev aislados
- Clerk: Test environment

## Criterios de aceptación

- Cobertura ≥ 70% en módulos core
- Todos los RF de prioridad alta tienen casos E2E
- Tests de performance cumplen objetivos P95/P99
- Sin vulnerabilidades OWASP críticas

## TODOs

- [ ] Configurar Jest y Testing Library
- [ ] Configurar Playwright para E2E
- [ ] Configurar k6 para performance
- [ ] Crear dataset de prueba (seeds)
- [ ] Implementar casos críticos
- [ ] Integración con CI/CD (GitHub Actions)
