import 'multer';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { StorageOperationFailedException } from '../../common/exceptions/storage-failed.exception.js';

export const StoragePaths = {
  avatar: (userId: number) => `users/${userId}/avatar`,
  fabrics: (userId: number) => `users/${userId}/fabrics`,
  patterns: (userId: number) => `users/${userId}/patterns`,
} as const;

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly internalEndpoint?: string;
  private readonly publicEndpoint?: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    this.internalEndpoint = this.configService.get<string>('S3_ENDPOINT');
    this.publicEndpoint = this.configService.get<string>('S3_PUBLIC_ENDPOINT');

    const region =
      this.configService.get<string>('S3_REGION') ||
      this.configService.get<string>('AWS_REGION', 'eu-central-1');

    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true' ||
      Boolean(this.internalEndpoint);

    const accessKeyId =
      this.configService.get<string>('S3_ACCESS_KEY') ||
      this.configService.get<string>('AWS_ACCESS_KEY_ID', 'test');

    const secretAccessKey =
      this.configService.get<string>('S3_SECRET_KEY') ||
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY', 'test');

    this.s3Client = new S3Client({
      region,
      endpoint: this.internalEndpoint || undefined,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folderPath: string,
  ): Promise<string> {
    const extension = file.originalname.split('.').pop();
    const key = `${folderPath}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await this.s3Client.send(command);
      return key;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new StorageOperationFailedException('upload', details);
    }
  }

  async generatePresignedUrl(
    key: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      let url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

       if (this.internalEndpoint && this.publicEndpoint) {
        url = url.replace(this.internalEndpoint, this.publicEndpoint);
      }

      return url;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new StorageOperationFailedException('read', details);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new StorageOperationFailedException('delete', details);
    }
  }
}
