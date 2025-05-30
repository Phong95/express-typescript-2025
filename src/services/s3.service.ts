import { Readable } from "node:stream";
import { IS3AuthenticateModel, S3Provider } from "@/models/s3/s3.model";
import { env } from "@/utils/env-config.util";
import {
  GetObjectAttributesCommandOutput,
  HeadObjectCommandOutput,
  ListObjectVersionsCommandOutput,
  ListObjectsV2CommandOutput,
  S3Client,
  S3ClientConfig,
} from "@aws-sdk/client-s3";
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectAttributesCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectVersionsCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutObjectAclCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export abstract class S3Service {
  protected s3Client: S3Client;
  protected model: IS3AuthenticateModel;

  constructor(model: IS3AuthenticateModel) {
    this.model = model;

    const config: S3ClientConfig = {
      credentials: {
        accessKeyId: model.accessKey,
        secretAccessKey: model.secretKey,
      },
      forcePathStyle: true,
    };

    // Configure based on provider
    switch (model.provider) {
      case S3Provider.AMAZON:
        config.region = "ap-southeast-1";
        break;
      case S3Provider.WASABI:
      case S3Provider.BACKBLAZE:
      case S3Provider.VIETTEL:
        if (model.endpoint) {
          config.endpoint = model.endpoint;
          config.region = "us-east-1"; // Default region for custom endpoints
        }
        break;
    }

    this.s3Client = new S3Client(config);
  }

  /**
   * Generate presigned URL for downloading
   */
  public async getPresignedUrl(
    objectKey: string,
    bucketName?: string,
    versionId?: string
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName || this.model.defaultBucketName,
        Key: objectKey,
        VersionId: versionId || undefined,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.model.presignedDuration,
      });

      return url;
    } catch (error) {
      console.error(`Error: '${error}'`);
      return "";
    }
  }

  /**
   * Get temporary public URL by changing ACL temporarily
   */
  public async getTemporaryPublicUrl(
    objectKey: string,
    bucketName?: string,
    versionId?: string
  ): Promise<string> {
    try {
      const bucket = bucketName || this.model.defaultBucketName;

      // Set object ACL to public-read
      const setAclCommand = new PutObjectAclCommand({
        Bucket: bucket,
        Key: objectKey,
        ACL: "public-read",
      });

      await this.s3Client.send(setAclCommand);

      // Construct public URL
      const publicUrl = `${this.model.endpoint}/${bucket}/${objectKey}`;

      // Schedule ACL revert to private
      setTimeout(async () => {
        try {
          const revertAclCommand = new PutObjectAclCommand({
            Bucket: bucket,
            Key: objectKey,
            ACL: "private",
          });
          await this.s3Client.send(revertAclCommand);
        } catch (error) {
          console.error(`Error reverting ACL: ${error}`);
        }
      }, this.model.presignedDuration * 1000);

      return publicUrl;
    } catch (error) {
      console.error(`Error: '${error}'`);
      return "";
    }
  }

  /**
   * Generate presigned URL for uploading
   */
  public async putPresignedUrl(
    objectKey: string,
    bucketName?: string,
    contentType = "binary/octet-stream"
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName || this.model.defaultBucketName,
        Key: objectKey,
        ContentType: contentType,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.model.presignedDuration,
      });

      return url;
    } catch (error) {
      console.error(`Error: '${error}'`);
      return "";
    }
  }

  /**
   * Get object metadata
   */
  public async getObjectMetadata(
    objectKey: string,
    bucketName?: string,
    versionId?: string
  ): Promise<HeadObjectCommandOutput | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName || this.model.defaultBucketName,
        Key: objectKey,
        VersionId: versionId || undefined,
      });

      const response = await this.s3Client.send(command);
      return response;
    } catch (error) {
      console.error(`Error: '${error}'`);
      return null;
    }
  }

  /**
   * Download file to local path
   */
  public async download(
    bucketName: string,
    objectKey: string,
    localPath: string
  ): Promise<void> {
    try {
      const fs = require("node:fs");
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });

      const response = await this.s3Client.send(command);

      if (response.Body) {
        const stream = response.Body as Readable;
        const writeStream = fs.createWriteStream(localPath);
        stream.pipe(writeStream);

        return new Promise((resolve, reject) => {
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });
      }
    } catch (error) {
      console.error(`Error: ${error}`);
      throw error;
    }
  }

  /**
   * Upload file from local path
   */
  public async upload(
    bucketName: string,
    objectKey: string,
    localPath: string
  ): Promise<boolean> {
    try {
      const fs = require("node:fs");
      const fileStream = fs.createReadStream(localPath);

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: bucketName,
          Key: objectKey,
          Body: fileStream,
        },
      });

      await upload.done();
      return true;
    } catch (error) {
      console.error(`Error: ${error}`);
      return false;
    }
  }

  /**
   * Upload from stream
   */
  public async uploadStream(
    bucketName: string,
    objectKey: string,
    stream: Readable
  ): Promise<boolean> {
    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: bucketName,
          Key: objectKey,
          Body: stream,
        },
      });

      await upload.done();
      return true;
    } catch (error) {
      console.error(`Error: ${error}`);
      return false;
    }
  }

  /**
   * Delete file
   */
  public async deleteFile(bucketName: string, key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response.$metadata.httpStatusCode === 204;
    } catch (error) {
      console.error(
        `Error encountered on server. Message: '${error}' when deleting an object`
      );
      return false;
    }
  }

  /**
   * Change content type of existing object
   */
  public async changeContentType(
    bucketName: string,
    objectKey: string,
    contentType: string
  ): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        CopySource: `${bucketName}/${objectKey}`,
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType,
        MetadataDirective: "REPLACE",
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }

  /**
   * Check if bucket exists
   */
  public async doesBucketExist(bucketName: string): Promise<boolean> {
    try {
      const command = new ListBucketsCommand({});
      const response = await this.s3Client.send(command);

      return (
        response.Buckets?.some((bucket) => bucket.Name === bucketName) || false
      );
    } catch (error) {
      console.error(
        `Error encountered on server. Message: '${error}' when checking bucket existence`
      );
      return false;
    }
  }

  /**
   * Create bucket
   */
  public async createBucket(bucketName: string): Promise<void> {
    try {
      const command = new CreateBucketCommand({
        Bucket: bucketName,
      });

      await this.s3Client.send(command);
      console.log("Bucket created successfully.");
    } catch (error) {
      console.error(
        `Error encountered on server. Message: '${error}' when creating a bucket`
      );
    }
  }

  /**
   * Configure CORS for bucket
   */
  public async configureCORS(bucketName: string): Promise<void> {
    try {
      const command = new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "POST", "PUT", "DELETE"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["x-amz-request-id"],
              MaxAgeSeconds: 3000,
            },
          ],
        },
      });

      await this.s3Client.send(command);
      console.log("CORS configuration applied successfully.");
    } catch (error) {
      console.error(
        `Error encountered on server. Message: '${error}' when applying CORS configuration`
      );
    }
  }

  /**
   * Add public bucket policy
   * WARNING: This makes the bucket publicly accessible
   */
  public async addBucketPolicy(bucketName: string): Promise<void> {
    try {
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject", "s3:PutObject"],
            Resource: `arn:aws:s3:::${bucketName}/*`,
          },
        ],
      };

      const command = new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy),
      });

      await this.s3Client.send(command);
      console.log("Bucket policy added successfully.");
    } catch (error) {
      console.error(
        `Error encountered on server. Message: '${error}' when adding bucket policy`
      );
    }
  }

  /**
   * Get object attributes (marked as obsolete in original)
   */
  public async getObjectAttributes(
    objectKey: string,
    eTag?: string
  ): Promise<GetObjectAttributesCommandOutput | null> {
    try {
      const command = new GetObjectAttributesCommand({
        Bucket: this.model.defaultBucketName,
        Key: objectKey,
        ObjectAttributes: [
          "ETag",
          "ObjectParts",
          "ObjectSize",
          "Checksum",
          "StorageClass",
        ],
      });

      const response = await this.s3Client.send(command);
      return response;
    } catch (error) {
      console.error(`Error: '${error}'`);
      return null;
    }
  }

  /**
   * List object versions (marked as obsolete in original)
   */
  public async listVersions(
    objectKey: string,
    eTag?: string
  ): Promise<ListObjectVersionsCommandOutput | null> {
    try {
      const command = new ListObjectVersionsCommand({
        Bucket: this.model.defaultBucketName,
        MaxKeys: 10,
        Prefix: objectKey,
      });

      const response = await this.s3Client.send(command);
      return response;
    } catch (error) {
      console.error(`Error: '${error}'`);
      return null;
    }
  }

  /**
   * List objects in bucket
   */
  public async getObjects(
    bucketName: string
  ): Promise<ListObjectsV2CommandOutput> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
      });

      const response = await this.s3Client.send(command);
      return response;
    } catch (error) {
      console.error(`Error: ${error}`);
      throw error;
    }
  }
}

// Example usage and Express route setup
export class ConcreteS3Service extends S3Service {}
const config: IS3AuthenticateModel = {
  provider: env.S3_PROVIDER,
  accessKey: env.S3_ACCESS_KEY,
  secretKey: env.S3_SECRET_KEY,
  endpoint: env.S3_ENDPOINT,
  defaultBucketName: env.S3_DEFAULT_BUCKET_NAME,
  publicBucketName: env.S3_PUBLIC_BUCKET_NAME,
  tempBucketName: env.S3_TEMP_BUCKET_NAME,
  presignedDuration: env.S3_PRESIGNED_DURATION,
};
export const viettelS3Service = new ConcreteS3Service(config);
