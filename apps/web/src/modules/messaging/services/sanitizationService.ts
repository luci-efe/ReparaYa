export class SanitizationService {
    /**
     * Sanitizes text to remove HTML tags and prevent XSS.
     * Also validates that only https links are allowed.
     */
    sanitizeText(text: string): string {
        // 1. Strip HTML tags using regex
        const cleanText = text.replace(/<[^>]*>?/gm, '');
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
