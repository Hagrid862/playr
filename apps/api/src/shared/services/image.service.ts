import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export type FitType = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

@Injectable()
export class ImageService {
  /**
   * Get image metadata
   */
  async getMetadata(image: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(image).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || '',
      size: image.length,
    };
  }

  /**
   * Resize image with various options
   */
  async resizeImage(image: Buffer, options: ResizeOptions = {}): Promise<Buffer> {
    const { width, height, fit = 'contain', quality = 80, format = 'jpeg' } = options;

    let sharpInstance = sharp(image);

    // Resize if width or height is specified
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: fit as FitType,
        withoutEnlargement: true, // Don't enlarge images smaller than specified dimensions
      });
    }

    // Set format and quality
    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
    }

    return sharpInstance.toBuffer();
  }

  /**
   * Resize image to fit within specified dimensions (maintains aspect ratio)
   * If width > maxDimension, resize to maxDimension width
   * If height > maxDimension, resize to maxDimension height
   */
  async resizeToMaxDimension(
    image: Buffer,
    maxDimension: number,
    quality: number = 80,
    format: 'jpeg' | 'png' | 'webp' = 'jpeg',
  ): Promise<Buffer> {
    const metadata = await this.getMetadata(image);
    const { width, height } = metadata;

    // If image is already smaller than maxDimension in both dimensions, return original
    if (width <= maxDimension && height <= maxDimension) {
      return this.convertFormat(image, format, quality);
    }

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth: number;
    let newHeight: number;

    if (width > height) {
      // Landscape image - resize based on width
      newWidth = maxDimension;
      newHeight = Math.round((height * maxDimension) / width);
    } else {
      // Portrait or square image - resize based on height
      newHeight = maxDimension;
      newWidth = Math.round((width * maxDimension) / height);
    }

    return this.resizeImage(image, {
      width: newWidth,
      height: newHeight,
      fit: 'inside',
      quality,
      format,
    });
  }

  /**
   * Create a thumbnail (small version) of the image
   */
  async createThumbnail(
    image: Buffer,
    maxWidth: number = 300,
    maxHeight: number = 300,
    quality: number = 70,
  ): Promise<Buffer> {
    return this.resizeImage(image, {
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      quality,
      format: 'jpeg',
    });
  }

  /**
   * Validate image format and size
   */
  async validateImage(image: Buffer, maxSizeMB: number = 50): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(image);
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      // Check file size
      if (metadata.size > maxSizeBytes) {
        throw new Error(`Image size exceeds ${maxSizeMB}MB limit`);
      }

      // Check format
      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      if (!allowedFormats.includes(metadata.format.toLowerCase())) {
        throw new Error(`Unsupported image format: ${metadata.format}`);
      }

      return true;
    } catch (error) {
      console.error('Image validation failed:', error);
      return false;
    }
  }

  /**
   * Convert image to different format
   */
  async convertFormat(
    image: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 80,
  ): Promise<Buffer> {
    return this.resizeImage(image, { format: targetFormat, quality });
  }

  /**
   * Prepare image update data for Prisma nested operations
   * Compares existing images with incoming images and determines what to create, update, or delete
   */
  prepareImageUpdates(
    existingImages: { id: string; url: string; mimeType: string }[],
    incomingImages: { id?: string; url: string; mimeType: string }[],
  ):
    | {
        deleteMany?: { id?: { in?: string[] } };
        create?: { url: string; mimeType: string }[];
        update?: {
          where: { id: string };
          data: { url: string; mimeType: string };
        }[];
      }
    | undefined {
    if (!incomingImages) return undefined;

    const existingImageIds = existingImages.map((img) => img.id);
    const imagesToDelete = existingImageIds.filter(
      (id) => !incomingImages.some((img) => img.id === id),
    );

    const imagesToCreate = incomingImages.filter((img) => !img.id);
    const imagesToUpdate = incomingImages.filter((img) => img.id);

    return {
      deleteMany:
        imagesToDelete.length > 0
          ? {
              id: {
                in: imagesToDelete,
              },
            }
          : undefined,
      create:
        imagesToCreate.length > 0
          ? imagesToCreate.map((image) => ({
              url: image.url,
              mimeType: image.mimeType,
            }))
          : undefined,
      update:
        imagesToUpdate.length > 0
          ? imagesToUpdate.map((image) => ({
              where: { id: image.id! },
              data: {
                url: image.url,
                mimeType: image.mimeType,
              },
            }))
          : undefined,
    };
  }
}
