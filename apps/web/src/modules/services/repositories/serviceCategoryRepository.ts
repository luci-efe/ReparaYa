import { prisma } from '@/lib/db';
import type { ServiceCategoryDTO } from '../types';

export const serviceCategoryRepository = {
    /**
     * Find category by ID
     * @param id Category ID
     * @returns Category DTO or null
     */
    async findById(id: string): Promise<ServiceCategoryDTO | null> {
        const category = await prisma.serviceCategory.findUnique({
            where: { id },
        });

        return category as unknown as ServiceCategoryDTO;
    },
};
