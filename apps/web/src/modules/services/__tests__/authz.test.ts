import { describe, it, expect } from '@jest/globals';
import {
  isServiceOwner,
  canEditService,
  canPublishService,
  canModerateService,
} from '../utils/authz';
import {
  mockServiceDraft,
  mockServiceActive,
  mockVerifiedContractor,
  mockUnverifiedContractor,
} from '../test-fixtures';

describe('authz - isServiceOwner', () => {
  it('TC-SERVICE-031: debe retornar true si el contratista es dueño del servicio', () => {
    const result = isServiceOwner(mockServiceDraft, 'contractor-verified-123');

    expect(result).toBe(true);
  });

  it('TC-SERVICE-031-02: debe retornar false si el contratista no es dueño del servicio', () => {
    const result = isServiceOwner(mockServiceDraft, 'contractor-other-999');

    expect(result).toBe(false);
  });

  it('TC-SERVICE-031-03: debe retornar false si contractorId es undefined', () => {
    const result = isServiceOwner(mockServiceDraft, '');

    expect(result).toBe(false);
  });
});

describe('authz - canEditService', () => {
  it('TC-SERVICE-032: debe permitir edición a ADMIN', () => {
    const result = canEditService(mockServiceDraft, 'user-admin-123', 'ADMIN');

    expect(result).toBe(true);
  });

  it('TC-SERVICE-032-02: debe permitir edición al dueño CONTRACTOR', () => {
    const serviceWithContractorUserId = {
      ...mockServiceDraft,
      contractor: {
        id: 'user-contractor-123', // userId del contractor
        businessName: 'García Plumbing',
        verified: true,
      },
    };

    const result = canEditService(serviceWithContractorUserId, 'user-contractor-123', 'CONTRACTOR');

    expect(result).toBe(true);
  });

  it('TC-SERVICE-032-03: debe rechazar edición a CONTRACTOR que no es dueño', () => {
    const serviceWithContractorUserId = {
      ...mockServiceDraft,
      contractor: {
        id: 'user-contractor-123',
        businessName: 'García Plumbing',
        verified: true,
      },
    };

    const result = canEditService(serviceWithContractorUserId, 'user-contractor-other-999', 'CONTRACTOR');

    expect(result).toBe(false);
  });

  it('TC-SERVICE-032-04: debe rechazar edición a CLIENT', () => {
    const result = canEditService(mockServiceDraft, 'user-client-456', 'CLIENT');

    expect(result).toBe(false);
  });

  it('TC-SERVICE-032-05: debe rechazar edición si rol es desconocido', () => {
    const result = canEditService(mockServiceDraft, 'user-unknown-789', 'UNKNOWN_ROLE');

    expect(result).toBe(false);
  });

  it('TC-SERVICE-032-06: debe rechazar edición si contractor es undefined en servicio', () => {
    const serviceWithoutContractor = {
      ...mockServiceDraft,
      contractor: undefined,
    };

    const result = canEditService(serviceWithoutContractor, 'user-contractor-123', 'CONTRACTOR');

    expect(result).toBe(false);
  });
});

describe('authz - canPublishService', () => {
  it('TC-SERVICE-033: debe permitir publicación a contratista verificado', () => {
    const result = canPublishService(mockVerifiedContractor);

    expect(result).toBe(true);
  });

  it('TC-SERVICE-033-02: debe rechazar publicación a contratista no verificado', () => {
    const result = canPublishService(mockUnverifiedContractor);

    expect(result).toBe(false);
  });

  it('TC-SERVICE-033-03: debe rechazar si verified es null', () => {
    const contractorWithNullVerified = {
      ...mockVerifiedContractor,
      verified: null as any,
    };

    const result = canPublishService(contractorWithNullVerified);

    expect(result).toBe(false);
  });

  it('TC-SERVICE-033-04: debe rechazar si verified es undefined', () => {
    const contractorWithUndefinedVerified = {
      ...mockVerifiedContractor,
      verified: undefined as any,
    };

    const result = canPublishService(contractorWithUndefinedVerified);

    expect(result).toBe(false);
  });
});

describe('authz - canModerateService', () => {
  it('TC-SERVICE-034: debe permitir moderación a ADMIN', () => {
    const result = canModerateService('ADMIN');

    expect(result).toBe(true);
  });

  it('TC-SERVICE-034-02: debe rechazar moderación a CONTRACTOR', () => {
    const result = canModerateService('CONTRACTOR');

    expect(result).toBe(false);
  });

  it('TC-SERVICE-034-03: debe rechazar moderación a CLIENT', () => {
    const result = canModerateService('CLIENT');

    expect(result).toBe(false);
  });

  it('TC-SERVICE-034-04: debe rechazar moderación a rol desconocido', () => {
    const result = canModerateService('UNKNOWN_ROLE');

    expect(result).toBe(false);
  });

  it('TC-SERVICE-034-05: debe rechazar moderación si rol es vacío', () => {
    const result = canModerateService('');

    expect(result).toBe(false);
  });
});

describe('authz - integration scenarios', () => {
  it('TC-SERVICE-035: escenario completo - contratista verificado puede editar y publicar su propio servicio', () => {
    const contractorUserId = 'user-contractor-123';
    const serviceWithContractorUserId = {
      ...mockServiceDraft,
      contractor: {
        id: contractorUserId,
        businessName: 'García Plumbing',
        verified: true,
      },
    };

    // Puede editar
    const canEdit = canEditService(serviceWithContractorUserId, contractorUserId, 'CONTRACTOR');
    expect(canEdit).toBe(true);

    // Puede publicar (si está verificado)
    const canPublish = canPublishService(mockVerifiedContractor);
    expect(canPublish).toBe(true);

    // No puede moderar
    const canModerate = canModerateService('CONTRACTOR');
    expect(canModerate).toBe(false);
  });

  it('TC-SERVICE-036: escenario completo - admin puede editar y moderar cualquier servicio', () => {
    const adminUserId = 'user-admin-789';

    // Puede editar cualquier servicio
    const canEdit = canEditService(mockServiceDraft, adminUserId, 'ADMIN');
    expect(canEdit).toBe(true);

    // Puede moderar
    const canModerate = canModerateService('ADMIN');
    expect(canModerate).toBe(true);
  });

  it('TC-SERVICE-036-02: escenario completo - cliente no puede editar, publicar ni moderar', () => {
    const clientUserId = 'user-client-456';

    // No puede editar
    const canEdit = canEditService(mockServiceDraft, clientUserId, 'CLIENT');
    expect(canEdit).toBe(false);

    // No puede moderar
    const canModerate = canModerateService('CLIENT');
    expect(canModerate).toBe(false);
  });

  it('TC-SERVICE-036-03: escenario completo - contratista no verificado no puede publicar', () => {
    const contractorUserId = 'user-contractor-unverified-456';
    const serviceWithUnverifiedContractor = {
      ...mockServiceDraft,
      contractorId: 'contractor-unverified-456',
      contractor: {
        id: contractorUserId,
        businessName: 'Electricistas Profesionales',
        verified: false,
      },
    };

    // Puede editar su propio servicio
    const canEdit = canEditService(serviceWithUnverifiedContractor, contractorUserId, 'CONTRACTOR');
    expect(canEdit).toBe(true);

    // NO puede publicar (no verificado)
    const canPublish = canPublishService(mockUnverifiedContractor);
    expect(canPublish).toBe(false);
  });
});
