import sharp, { Sharp } from 'sharp';
import { createMock } from '@golevelup/ts-vitest';
import { ImageService } from './image.service';

vi.mock('sharp', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof import('sharp') }>();
  const fn = vi.fn((input, options) => {
    return mod.default(input as any, options as any); // Sharp's complex overloads make exact parameter typing difficult here, any is fine for the internal mock wrapper
  });
  Object.assign(fn, mod.default);
  return {
    ...mod,
    default: fn,
  };
});

describe('ImageService', () => {
  let service: ImageService;
  let testImage: Buffer;

  beforeAll(async () => {
    service = new ImageService();
    // Create a simple 100x100 red jpeg for testing
    testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();
  });

  describe('getMetadata', () => {
    it('should return correct metadata', async () => {
      const metadata = await service.getMetadata(testImage);
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
      expect(metadata.format).toBe('jpeg');
      expect(metadata.size).toBeGreaterThan(0);
    });

    it('should return default values when metadata is missing', async () => {
      vi.mocked(sharp).mockReturnValueOnce(
        createMock<Sharp>({
          metadata: vi.fn().mockResolvedValue({}),
        }),
      );

      const result = await service.getMetadata(Buffer.from('test'));
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
      expect(result.format).toBe('');
      expect(result.size).toBe(4);
    });
  });

  describe('resizeImage', () => {
    it('should resize to specific dimensions', async () => {
      const resized = await service.resizeImage(testImage, {
        width: 50,
        height: 50,
      });
      const metadata = await service.getMetadata(resized);
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });

    it('should convert format', async () => {
      const converted = await service.resizeImage(testImage, {
        format: 'webp',
      });
      const metadata = await service.getMetadata(converted);
      expect(metadata.format).toBe('webp');
    });

    it('should convert to png', async () => {
      const converted = await service.resizeImage(testImage, {
        format: 'png',
      });
      const metadata = await service.getMetadata(converted);
      expect(metadata.format).toBe('png');
    });
  });

  describe('resizeToMaxDimension', () => {
    it('should resize landscape image correctly', async () => {
      const landscape = await sharp({
        create: {
          width: 200,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const resized = await service.resizeToMaxDimension(landscape, 100);
      const metadata = await service.getMetadata(resized);
      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(50);
    });

    it('should resize portrait image correctly', async () => {
      const portrait = await sharp({
        create: {
          width: 100,
          height: 200,
          channels: 3,
          background: { r: 0, g: 0, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      const resized = await service.resizeToMaxDimension(portrait, 100);
      const metadata = await service.getMetadata(resized);
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(100);
    });

    it('should return original image (converted) if already smaller than maxDimension', async () => {
      const smallImage = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await service.resizeToMaxDimension(smallImage, 100);
      const metadata = await service.getMetadata(result);

      // It basically just calls convertFormat -> resizeImage, so dimensions should stay same
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });
  });

  describe('createThumbnail', () => {
    it('should create a thumbnail with specified dimensions', async () => {
      const thumbnail = await service.createThumbnail(testImage, 50, 50);
      const metadata = await service.getMetadata(thumbnail);
      // createThumbnail uses 'inside' fit, so it will fit within the box
      expect(metadata.width).toBeLessThanOrEqual(50);
      expect(metadata.height).toBeLessThanOrEqual(50);
    });
  });

  describe('validateImage', () => {
    it('should return true for valid images', async () => {
      const isValid = await service.validateImage(testImage);
      expect(isValid).toBe(true);
    });

    it('should return false for too large images', async () => {
      const isValid = await service.validateImage(testImage, 0.000001); // Extremely small limit
      expect(isValid).toBe(false);
    });

    it('should return false for unsupported image formats', async () => {
      // Create a TIFF image which is not in the allowed list
      const tiffImage = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .tiff()
        .toBuffer();

      const isValid = await service.validateImage(tiffImage);
      expect(isValid).toBe(false);
    });
  });

  describe('convertFormat', () => {
    it('should convert image format', async () => {
      const converted = await service.convertFormat(testImage, 'png');
      const metadata = await service.getMetadata(converted);
      expect(metadata.format).toBe('png');
    });
  });

  describe('prepareImageUpdates', () => {
    it('should correctly identify images to create, update, and delete', () => {
      const existing = [
        { id: '1', url: 'url1', mimeType: 'image/jpeg' },
        { id: '2', url: 'url2', mimeType: 'image/jpeg' },
      ];
      const incoming = [
        { id: '1', url: 'url1-updated', mimeType: 'image/jpeg' }, // Update
        { url: 'url3', mimeType: 'image/png' }, // Create
      ];

      const updates = service.prepareImageUpdates(existing, incoming);

      expect(updates?.deleteMany?.id?.in).toContain('2');
      expect(updates?.update).toHaveLength(1);
      expect(updates?.update?.[0].where.id).toBe('1');
      expect(updates?.create).toHaveLength(1);
      expect(updates?.create?.[0].url).toBe('url3');
    });

    it('should return undefined if incoming images are missing', () => {
      // @ts-expect-error Testing invalid input
      expect(service.prepareImageUpdates([], undefined)).toBeUndefined();
    });

    it('should handle empty lists correctly', () => {
      const updates = service.prepareImageUpdates([], []);
      expect(updates).toEqual({
        deleteMany: undefined,
        create: undefined,
        update: undefined,
      });
    });
  });
});
