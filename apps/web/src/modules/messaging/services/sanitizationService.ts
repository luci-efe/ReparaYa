export class SanitizationService {
    /**
     * Sanitizes text to remove HTML tags and prevent XSS.
     * Uses multiple layers of protection with proper ordering:
     * 1. Strip all HTML tags first (before decoding entities)
     * 2. Remove dangerous URI schemes (with case-insensitive patterns)
     * 3. Remove remaining angle brackets
     * 4. Decode safe entities only at display time (not here)
     */
    sanitizeText(text: string): string {
        let cleanText = text;

        // 1. Remove dangerous URI schemes first (case-insensitive, handles whitespace)
        // Must be done before any decoding to prevent bypass
        cleanText = cleanText.replace(/j[\s]*a[\s]*v[\s]*a[\s]*s[\s]*c[\s]*r[\s]*i[\s]*p[\s]*t[\s]*:/gi, '');
        cleanText = cleanText.replace(/d[\s]*a[\s]*t[\s]*a[\s]*:/gi, '');
        cleanText = cleanText.replace(/v[\s]*b[\s]*s[\s]*c[\s]*r[\s]*i[\s]*p[\s]*t[\s]*:/gi, '');

        // 2. Strip all HTML tags (multiple passes to catch nested/malformed tags)
        // This handles cases like <script<script> or unclosed tags
        let previousLength;
        do {
            previousLength = cleanText.length;
            cleanText = cleanText.replace(/<[^>]*>?/gm, '');
        } while (cleanText.length !== previousLength);
        
        // 3. Remove any remaining angle brackets that could be used for injection
        cleanText = cleanText.replace(/[<>]/g, '');

        // 4. Remove on* event handler patterns that might have survived (multiple passes)
        do {
            previousLength = cleanText.length;
            cleanText = cleanText.replace(/\bon\w+\s*=/gi, '');
        } while (cleanText.length !== previousLength);

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
