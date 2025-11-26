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

        it('should handle nested/malformed tags', () => {
            const input = '<script<script>alert(1)</script>';
            const result = sanitizationService.sanitizeText(input);
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
        });

        it('should remove javascript: URIs with whitespace variations', () => {
            const inputs = [
                'Click javascript:alert(1)',
                'Click jAvAsCrIpT:alert(1)',
                'Click java\tscript:alert(1)',
            ];
            for (const input of inputs) {
                const result = sanitizationService.sanitizeText(input);
                expect(result.toLowerCase()).not.toContain('javascript:');
            }
        });

        it('should remove data: URIs', () => {
            const input = 'Image data:image/png;base64,test';
            const result = sanitizationService.sanitizeText(input);
            expect(result.toLowerCase()).not.toContain('data:');
        });

        it('should remove on* event handlers', () => {
            const input = 'onclick=alert(1) onerror=alert(2)';
            const result = sanitizationService.sanitizeText(input);
            expect(result).not.toMatch(/on\w+\s*=/i);
        });

        it('should keep encoded entities as-is (safe for text display)', () => {
            const input = '&lt;safe&gt;';
            const result = sanitizationService.sanitizeText(input);
            // Entities are NOT decoded - they are safe as text
            expect(result).toBe('&lt;safe&gt;');
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
