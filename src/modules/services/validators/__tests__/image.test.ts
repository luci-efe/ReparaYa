/**
 * Image Validators Unit Tests
 *
 * Comprehensive tests for image upload and management validation schemas
 *
 * @module services/validators/__tests__/image
 */

import {
  requestUploadUrlSchema,
  confirmImageUploadSchema,
  updateImageSchema,
  reorderImagesSchema,
  imageCountValidationSchema,
  isAllowedMimeType,
  isFileSizeValid,
  getFileExtension,
  mimeTypeToExtension,
  IMAGE_VALIDATION_CONSTANTS,
} from '../image';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_SERVICE,
} from '../../types/image';

describe('Image Validators', () => {
  describe('requestUploadUrlSchema', () => {
    const validRequest = {
      fileName: 'service-photo.jpg',
      fileType: 'image/jpeg',
      fileSize: 5 * 1024 * 1024, // 5 MB
    };

    describe('fileName validation', () => {
      it('should accept valid filename', () => {
        const result = requestUploadUrlSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should reject empty filename', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('requerido');
        }
      });

      it('should reject filename longer than 255 characters', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'a'.repeat(250) + '.jpg',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('255 caracteres');
        }
      });

      it('should accept filename with hyphens', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'my-service-photo.jpg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept filename with underscores', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'my_service_photo.jpg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept filename with dots', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo.final.v2.jpg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept filename with numbers', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo123.jpg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept .jpg extension', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo.jpg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept .jpeg extension', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo.jpeg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept .png extension', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo.png',
          fileType: 'image/png',
        });
        expect(result.success).toBe(true);
      });

      it('should accept .webp extension', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo.webp',
          fileType: 'image/webp',
        });
        expect(result.success).toBe(true);
      });

      it('should accept uppercase extension', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo.JPG',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid extension', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo.gif',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('extensión válida');
        }
      });

      it('should reject filename without extension', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo',
        });
        expect(result.success).toBe(false);
      });

      it('should reject filename with path traversal (..)', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: '../etc/passwd.jpg',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('navegación');
        }
      });

      it('should reject filename with forward slash', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'folder/photo.jpg',
        });
        expect(result.success).toBe(false);
      });

      it('should reject filename with backslash', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'folder\\photo.jpg',
        });
        expect(result.success).toBe(false);
      });

      it('should reject filename with special characters', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileName: 'photo@service!.jpg',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('fileType validation', () => {
      it('should accept image/jpeg', () => {
        const result = requestUploadUrlSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should accept image/png', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileType: 'image/png',
        });
        expect(result.success).toBe(true);
      });

      it('should accept image/webp', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileType: 'image/webp',
        });
        expect(result.success).toBe(true);
      });

      it('should reject image/gif', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileType: 'image/gif',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('no permitido');
        }
      });

      it('should reject application/pdf', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileType: 'application/pdf',
        });
        expect(result.success).toBe(false);
      });

      it('should reject video/mp4', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileType: 'video/mp4',
        });
        expect(result.success).toBe(false);
      });

      it('should reject empty fileType', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileType: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('fileSize validation', () => {
      it('should accept valid file size', () => {
        const result = requestUploadUrlSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
      });

      it('should accept minimum file size (1 KB)', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileSize: 1024,
        });
        expect(result.success).toBe(true);
      });

      it('should accept maximum file size (10 MB)', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileSize: MAX_IMAGE_SIZE_BYTES,
        });
        expect(result.success).toBe(true);
      });

      it('should reject file size above maximum (10 MB)', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileSize: MAX_IMAGE_SIZE_BYTES + 1,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('10 MB');
        }
      });

      it('should reject file size below minimum (1 KB)', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileSize: 1023,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('al menos 1 KB');
        }
      });

      it('should reject zero file size', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileSize: 0,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative file size', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileSize: -1024,
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-integer file size', () => {
        const result = requestUploadUrlSchema.safeParse({
          ...validRequest,
          fileSize: 1024.5,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('confirmImageUploadSchema', () => {
    const validConfirmation = {
      s3Key: 'contractor-services/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/abcd1234-5678-90ef-ghij-klmnopqrstuv.jpg',
      s3Url: 'https://reparaya-media-dev.s3.us-west-2.amazonaws.com/contractor-services/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/abcd1234-5678-90ef-ghij-klmnopqrstuv.jpg',
      width: 1920,
      height: 1080,
      altText: 'Servicio de reparación de tuberías',
    };

    describe('s3Key validation', () => {
      it('should accept valid S3 key', () => {
        const result = confirmImageUploadSchema.safeParse(validConfirmation);
        expect(result.success).toBe(true);
      });

      it('should reject empty S3 key', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Key: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('requerida');
        }
      });

      it('should reject S3 key without correct prefix', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Key: 'uploads/photo.jpg',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('prefijo correcto');
        }
      });

      it('should reject S3 key with invalid format', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Key: 'contractor-services/invalid-format.jpg',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Formato');
        }
      });

      it('should accept S3 key with .png extension', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Key: validConfirmation.s3Key.replace('.jpg', '.png'),
        });
        expect(result.success).toBe(true);
      });

      it('should accept S3 key with .webp extension', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Key: validConfirmation.s3Key.replace('.jpg', '.webp'),
        });
        expect(result.success).toBe(true);
      });

      it('should accept S3 key with .jpeg extension', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Key: validConfirmation.s3Key.replace('.jpg', '.jpeg'),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('s3Url validation', () => {
      it('should accept valid S3 URL', () => {
        const result = confirmImageUploadSchema.safeParse(validConfirmation);
        expect(result.success).toBe(true);
      });

      it('should reject invalid URL format', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Url: 'not-a-url',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('URL');
        }
      });

      it('should reject non-S3 URL', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Url: 'https://example.com/photo.jpg',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Amazon S3');
        }
      });

      it('should accept S3 URL with .s3. pattern', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          s3Url: 'https://bucket.s3.region.amazonaws.com/key.jpg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept S3 URL with .amazonaws.com pattern', () => {
        const result = confirmImageUploadSchema.safeParse(validConfirmation);
        expect(result.success).toBe(true);
      });
    });

    describe('width validation', () => {
      it('should accept valid width', () => {
        const result = confirmImageUploadSchema.safeParse(validConfirmation);
        expect(result.success).toBe(true);
      });

      it('should accept undefined width (optional)', () => {
        const { width, ...confirmationWithoutWidth } = validConfirmation;
        const result = confirmImageUploadSchema.safeParse(confirmationWithoutWidth);
        expect(result.success).toBe(true);
      });

      it('should accept minimum width (1px)', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          width: 1,
        });
        expect(result.success).toBe(true);
      });

      it('should accept maximum width (10000px)', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          width: 10000,
        });
        expect(result.success).toBe(true);
      });

      it('should reject width below minimum', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          width: 0,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('1px');
        }
      });

      it('should reject width above maximum', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          width: 10001,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('10000px');
        }
      });

      it('should reject non-integer width', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          width: 1920.5,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative width', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          width: -100,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('height validation', () => {
      it('should accept valid height', () => {
        const result = confirmImageUploadSchema.safeParse(validConfirmation);
        expect(result.success).toBe(true);
      });

      it('should accept undefined height (optional)', () => {
        const { height, ...confirmationWithoutHeight } = validConfirmation;
        const result = confirmImageUploadSchema.safeParse(confirmationWithoutHeight);
        expect(result.success).toBe(true);
      });

      it('should accept minimum height (1px)', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          height: 1,
        });
        expect(result.success).toBe(true);
      });

      it('should accept maximum height (10000px)', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          height: 10000,
        });
        expect(result.success).toBe(true);
      });

      it('should reject non-integer height', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          height: 1080.5,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('altText validation', () => {
      it('should accept valid alt text', () => {
        const result = confirmImageUploadSchema.safeParse(validConfirmation);
        expect(result.success).toBe(true);
      });

      it('should accept undefined alt text (optional)', () => {
        const { altText, ...confirmationWithoutAltText } = validConfirmation;
        const result = confirmImageUploadSchema.safeParse(confirmationWithoutAltText);
        expect(result.success).toBe(true);
      });

      it('should trim whitespace from alt text', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          altText: '  Valid alt text  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.altText).toBe('Valid alt text');
        }
      });

      it('should reject alt text longer than 255 characters', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          altText: 'a'.repeat(256),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('255 caracteres');
        }
      });

      it('should reject alt text shorter than 3 characters if provided', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          altText: 'ab',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('al menos 3 caracteres');
        }
      });

      it('should accept alt text with minimum length (3 chars)', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          altText: 'abc',
        });
        expect(result.success).toBe(true);
      });

      it('should accept alt text with maximum length (255 chars)', () => {
        const result = confirmImageUploadSchema.safeParse({
          ...validConfirmation,
          altText: 'a'.repeat(255),
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('updateImageSchema', () => {
    it('should accept valid update data', () => {
      const result = updateImageSchema.safeParse({
        order: 2,
        altText: 'Updated alt text',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (no updates)', () => {
      const result = updateImageSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept order update only', () => {
      const result = updateImageSchema.safeParse({
        order: 3,
      });
      expect(result.success).toBe(true);
    });

    it('should accept altText update only', () => {
      const result = updateImageSchema.safeParse({
        altText: 'New alt text',
      });
      expect(result.success).toBe(true);
    });

    it('should accept minimum order (0)', () => {
      const result = updateImageSchema.safeParse({
        order: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum order (4)', () => {
      const result = updateImageSchema.safeParse({
        order: MAX_IMAGES_PER_SERVICE - 1,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative order', () => {
      const result = updateImageSchema.safeParse({
        order: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject order above maximum', () => {
      const result = updateImageSchema.safeParse({
        order: MAX_IMAGES_PER_SERVICE,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer order', () => {
      const result = updateImageSchema.safeParse({
        order: 2.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reorderImagesSchema', () => {
    it('should accept valid image IDs array', () => {
      const result = reorderImagesSchema.safeParse({
        imageIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept single image ID', () => {
      const result = reorderImagesSchema.safeParse({
        imageIds: ['123e4567-e89b-12d3-a456-426614174000'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept maximum number of images (5)', () => {
      const result = reorderImagesSchema.safeParse({
        imageIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
          '123e4567-e89b-12d3-a456-426614174003',
          '123e4567-e89b-12d3-a456-426614174004',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty array', () => {
      const result = reorderImagesSchema.safeParse({
        imageIds: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos un');
      }
    });

    it('should reject more than 5 images', () => {
      const result = reorderImagesSchema.safeParse({
        imageIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174001',
          '123e4567-e89b-12d3-a456-426614174002',
          '123e4567-e89b-12d3-a456-426614174003',
          '123e4567-e89b-12d3-a456-426614174004',
          '123e4567-e89b-12d3-a456-426614174005',
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('5 imágenes');
      }
    });

    it('should reject invalid UUID in array', () => {
      const result = reorderImagesSchema.safeParse({
        imageIds: ['not-a-uuid', '123e4567-e89b-12d3-a456-426614174001'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject duplicate IDs', () => {
      const result = reorderImagesSchema.safeParse({
        imageIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '123e4567-e89b-12d3-a456-426614174000',
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('únicos');
      }
    });
  });

  describe('imageCountValidationSchema', () => {
    it('should accept valid count within limit', () => {
      const result = imageCountValidationSchema.safeParse({
        currentCount: 2,
        additionalImages: 2,
      });
      expect(result.success).toBe(true);
    });

    it('should accept adding up to the limit', () => {
      const result = imageCountValidationSchema.safeParse({
        currentCount: 3,
        additionalImages: 2,
      });
      expect(result.success).toBe(true);
    });

    it('should reject exceeding the limit', () => {
      const result = imageCountValidationSchema.safeParse({
        currentCount: 4,
        additionalImages: 2,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('5 imágenes');
      }
    });

    it('should accept zero current count', () => {
      const result = imageCountValidationSchema.safeParse({
        currentCount: 0,
        additionalImages: 5,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative current count', () => {
      const result = imageCountValidationSchema.safeParse({
        currentCount: -1,
        additionalImages: 2,
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero additional images', () => {
      const result = imageCountValidationSchema.safeParse({
        currentCount: 2,
        additionalImages: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('isAllowedMimeType', () => {
    it('should return true for image/jpeg', () => {
      expect(isAllowedMimeType('image/jpeg')).toBe(true);
    });

    it('should return true for image/png', () => {
      expect(isAllowedMimeType('image/png')).toBe(true);
    });

    it('should return true for image/webp', () => {
      expect(isAllowedMimeType('image/webp')).toBe(true);
    });

    it('should return false for image/gif', () => {
      expect(isAllowedMimeType('image/gif')).toBe(false);
    });

    it('should return false for application/pdf', () => {
      expect(isAllowedMimeType('application/pdf')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isAllowedMimeType('')).toBe(false);
    });
  });

  describe('isFileSizeValid', () => {
    it('should return true for valid size', () => {
      expect(isFileSizeValid(5 * 1024 * 1024)).toBe(true);
    });

    it('should return true for minimum size (1 byte)', () => {
      expect(isFileSizeValid(1)).toBe(true);
    });

    it('should return true for maximum size (10 MB)', () => {
      expect(isFileSizeValid(MAX_IMAGE_SIZE_BYTES)).toBe(true);
    });

    it('should return false for size above maximum', () => {
      expect(isFileSizeValid(MAX_IMAGE_SIZE_BYTES + 1)).toBe(false);
    });

    it('should return false for zero size', () => {
      expect(isFileSizeValid(0)).toBe(false);
    });

    it('should return false for negative size', () => {
      expect(isFileSizeValid(-1024)).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract .jpg extension', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
    });

    it('should extract .png extension', () => {
      expect(getFileExtension('photo.png')).toBe('png');
    });

    it('should extract .webp extension', () => {
      expect(getFileExtension('photo.webp')).toBe('webp');
    });

    it('should extract .jpeg extension', () => {
      expect(getFileExtension('photo.jpeg')).toBe('jpeg');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('my.photo.final.jpg')).toBe('jpg');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('photo.JPG')).toBe('jpg');
    });

    it('should return null for filename without extension', () => {
      expect(getFileExtension('photo')).toBe(null);
    });

    it('should return null for filename ending with dot', () => {
      expect(getFileExtension('photo.')).toBe('');
    });
  });

  describe('mimeTypeToExtension', () => {
    it('should map image/jpeg to jpg', () => {
      expect(mimeTypeToExtension('image/jpeg')).toBe('jpg');
    });

    it('should map image/png to png', () => {
      expect(mimeTypeToExtension('image/png')).toBe('png');
    });

    it('should map image/webp to webp', () => {
      expect(mimeTypeToExtension('image/webp')).toBe('webp');
    });

    it('should default to jpg for unknown mime type', () => {
      expect(mimeTypeToExtension('image/unknown')).toBe('jpg');
    });

    it('should default to jpg for empty string', () => {
      expect(mimeTypeToExtension('')).toBe('jpg');
    });
  });

  describe('IMAGE_VALIDATION_CONSTANTS', () => {
    it('should export correct fileName constants', () => {
      expect(IMAGE_VALIDATION_CONSTANTS.fileName.maxLength).toBe(255);
      expect(IMAGE_VALIDATION_CONSTANTS.fileName.allowedExtensions).toContain('jpg');
      expect(IMAGE_VALIDATION_CONSTANTS.fileName.allowedExtensions).toContain('png');
    });

    it('should export correct fileSize constants', () => {
      expect(IMAGE_VALIDATION_CONSTANTS.fileSize.max).toBe(MAX_IMAGE_SIZE_BYTES);
      expect(IMAGE_VALIDATION_CONSTANTS.fileSize.maxMB).toBe(10);
    });

    it('should export correct mimeTypes constants', () => {
      expect(IMAGE_VALIDATION_CONSTANTS.mimeTypes.allowed).toEqual(ALLOWED_IMAGE_MIME_TYPES);
    });

    it('should export correct dimensions constants', () => {
      expect(IMAGE_VALIDATION_CONSTANTS.dimensions.min).toBe(1);
      expect(IMAGE_VALIDATION_CONSTANTS.dimensions.max).toBe(10000);
    });

    it('should export correct altText constants', () => {
      expect(IMAGE_VALIDATION_CONSTANTS.altText.maxLength).toBe(255);
    });

    it('should export correct perService constants', () => {
      expect(IMAGE_VALIDATION_CONSTANTS.perService.maxCount).toBe(MAX_IMAGES_PER_SERVICE);
    });
  });
});
