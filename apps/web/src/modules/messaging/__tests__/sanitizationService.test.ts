// Mock isomorphic-dompurify before importing the service
jest.mock('isomorphic-dompurify', () => ({
    __esModule: true,
    default: {
        sanitize: (text: string) => text.replace(/<[^>]*>?/gm, ''),
    },
}));

import { sanitizationService } from '../services/sanitizationService';

describe('SanitizationService', () => {
    describe('sanitizeText', () => {
        it('should strip HTML tags', () => {
            const input = '<script>alert("xss")</script>Hello <b>World</b>';
            const expected = 'alert("xss")Hello World';
            expect(sanitizationService.sanitizeText(input)).toBe(expected);
        });

        it('should trim whitespace', () => {
            const input = '  Hello World  ';
            const expected = 'Hello World';
            expect(sanitizationService.sanitizeText(input)).toBe(expected);
        });
    });

    describe('validateLinks', () => {
        it('should allow text without links', () => {
            expect(sanitizationService.validateLinks('Hello World')).toBe(true);
        });

        it('should allow https links', () => {
            expect(sanitizationService.validateLinks('Check this https://example.com')).toBe(true);
        });

        it('should reject http links', () => {
            expect(sanitizationService.validateLinks('Check this http://example.com')).toBe(false);
        });

        it('should reject ftp links', () => {
            expect(sanitizationService.validateLinks('Check this ftp://example.com')).toBe(false);
        });
    });

    describe('truncateText', () => {
        it('should not truncate text shorter than max length', () => {
            expect(sanitizationService.truncateText('Hello', 10)).toBe('Hello');
        });

        it('should truncate text longer than max length', () => {
            expect(sanitizationService.truncateText('Hello World', 5)).toBe('Hello');
        });
    });
});
