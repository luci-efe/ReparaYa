import { PaymentRepository } from '../repositories/paymentRepository';
import { CreatePaymentDTO } from '../types';
import { Payment, PaymentStatus } from '@prisma/client';

export class PaymentService {
    private repository: PaymentRepository;

    constructor() {
        this.repository = new PaymentRepository();
    }

    async simulatePayment(data: CreatePaymentDTO): Promise<Payment> {
        // 1. Create pending payment
        const payment = await this.repository.create(data);

        // 2. Simulate processing delay (optional, can be done in controller)

        // 3. Update to SUCCEEDED
        return this.repository.updateStatus(payment.id, PaymentStatus.SUCCEEDED, {
            simulated: true,
            processedAt: new Date().toISOString(),
        });
    }

    async getPaymentsByBooking(bookingId: string): Promise<Payment[]> {
        return this.repository.findByBookingId(bookingId);
    }
}
