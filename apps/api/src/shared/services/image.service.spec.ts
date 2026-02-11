import sharp from 'sharp';
import { ImageService } from './image.service';

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
  });
});
