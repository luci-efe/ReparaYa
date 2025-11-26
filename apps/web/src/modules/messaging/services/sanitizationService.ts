export class SanitizationService {
    /**
     * Sanitizes text to remove HTML tags and prevent XSS.
     * Uses multiple layers of protection:
     * 1. Removes all HTML tags
     * 2. Decodes HTML entities to prevent encoded attacks
     * 3. Validates resulting text for safety
     */
    sanitizeText(text: string): string {
        // 1. Decode HTML entities to catch encoded attacks
        let cleanText = text
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/&#x27;/gi, "'")
            .replace(/&#x2F;/gi, '/');

        // 2. Strip all HTML tags (including malformed ones)
        // This regex handles various tag formats including self-closing, malformed, and nested
        cleanText = cleanText.replace(/<[^>]*>?/gm, '');
        
        // 3. Remove any remaining angle brackets that might have slipped through
        cleanText = cleanText.replace(/[<>]/g, '');

        // 4. Remove dangerous javascript: and data: URI schemes
        cleanText = cleanText.replace(/javascript:/gi, '');
        cleanText = cleanText.replace(/data:/gi, '');
        cleanText = cleanText.replace(/vbscript:/gi, '');

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
