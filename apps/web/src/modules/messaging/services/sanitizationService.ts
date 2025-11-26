import DOMPurify from 'isomorphic-dompurify';

export class SanitizationService {
    /**
     * Sanitizes text to remove HTML tags and prevent XSS.
     * Uses DOMPurify for robust sanitization.
     */
    sanitizeText(text: string): string {
        // Use DOMPurify with strict config for text-only content
        const cleanText = DOMPurify.sanitize(text, {
            ALLOWED_TAGS: [], // No HTML tags allowed
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true, // Preserve text content
            FORBID_TAGS: ['style', 'script'], // Defense-in-depth
            FORBID_ATTR: ['style', 'onerror', 'onload'], // Block event handlers
        });
        return cleanText.trim();
    }

    /**
     * Validates that the text does not contain forbidden links.
     * Only https:// links are allowed.
     */
    validateLinks(text: string): boolean {
        const urlRegex = /(http|https|ftp):\/\/[^\s/$.?#].[^\s]*/gi;
        const matches = text.match(urlRegex);

        if (!matches) return true;

        for (const match of matches) {
            if (!match.startsWith('https://')) {
                return false;
            }
        }

        return true;
    }

    /**
     * Truncates text to a maximum length.
     */
    truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength);
    }
}

export const sanitizationService = new SanitizationService();
