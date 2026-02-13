import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileBucket } from '@repo/db';
import { Env } from '../../common/config/env.schema';

export interface UploadOptions {
  contentType?: string;
}

export interface GetUrlOptions {
  expiresIn?: number;
}

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService<Env>) {
    const endpoint = this.configService.get('S3_ENDPOINT', { infer: true });
    const accessKey = this.configService.get('S3_ACCESS_KEY', { infer: true });
    const secretKey = this.configService.get('S3_SECRET_KEY', { infer: true });
    const useSsl = this.configService.get('S3_USE_SSL', { infer: true });

    this.s3Client = new S3Client({
      endpoint,
      forcePathStyle: true, // Needed for MinIO and some other S3-compatible storage
      tls: useSsl,
      credentials: {
        accessKeyId: accessKey ?? '',
        secretAccessKey: secretKey ?? '',
      },
      region: 'us-east-1', // Default region for most S3-compatible storage
    });
  }

  /**
   * Upload a file to the specified bucket
   */
  async uploadFile(
    file: Buffer,
    bucketType: FileBucket,
    key: string,
    options: UploadOptions = {},
  ): Promise<{ url: string; key: string }> {
    const bucketName = this.getBucketName(bucketType);

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: options.contentType,
    });

    try {
      await this.s3Client.send(putCommand);
      const url = this.getFileUrl(bucketType, key);
      return { url, key };
    } catch (error) {
      this.logger.error(`Failed to upload file to bucket ${bucketName} with key ${key}`, error);
      throw new Error(`Failed to upload file: ${(error as Error).message}`);
    }
  }

  /**
   * Get a presigned URL for a file (typically for private buckets)
   */
  async getPresignedUrl(
    bucketType: FileBucket,
    key: string,
    options: GetUrlOptions = {},
  ): Promise<string> {
    const bucketName = this.getBucketName(bucketType);

    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    try {
      const expiresIn = options.expiresIn ?? 3600; // Default to 1 hour
      return await getSignedUrl(this.s3Client, getCommand, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for key ${key} in bucket ${bucketName}`,
        error,
      );
      throw new Error(`Failed to generate presigned URL: ${(error as Error).message}`);
    }
  }

  /**
   * Get a direct URL for a file.
   * If it's a public bucket and S3_PUBLIC_URL is configured, it uses that.
   * Otherwise, it builds a standard S3 endpoint URL.
   */
  getFileUrl(bucketType: FileBucket, key: string): string {
    if (bucketType === FileBucket.public) {
      const publicUrl = this.configService.get('S3_PUBLIC_URL', { infer: true });
      if (publicUrl) {
        return `${publicUrl.replace(/\/$/, '')}/${key}`;
      }
    }

    const endpoint = this.configService.get('S3_ENDPOINT', { infer: true });
    const bucketName = this.getBucketName(bucketType);

    return `${endpoint?.replace(/\/$/, '')}/${bucketName}/${key}`;
  }

  /**
   * Delete a file from the specified bucket
   */
  async deleteFile(bucketType: FileBucket, key: string): Promise<void> {
    const bucketName = this.getBucketName(bucketType);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(deleteCommand);
    } catch (error) {
      this.logger.error(`Failed to delete file from bucket ${bucketName} with key ${key}`, error);
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Internal helper to resolve the actual bucket name from the environment
   */
  private getBucketName(bucketType: FileBucket): string {
    switch (bucketType) {
      case FileBucket.public: {
        const publicBucket = this.configService.get('S3_PUBLIC_BUCKET', { infer: true });
        if (!publicBucket) throw new Error('S3_PUBLIC_BUCKET is not configured');
        return publicBucket as string;
      }
      case FileBucket.private: {
        const privateBucket = this.configService.get('S3_PRIVATE_BUCKET', { infer: true });
        if (!privateBucket) throw new Error('S3_PRIVATE_BUCKET is not configured');
        return privateBucket as string;
      }
      default:
        throw new Error(`Unknown bucket type: ${bucketType}`);
    }
  }
}
