// Enums and Interfaces
export enum S3Provider {
  AMAZON = "AMAZON",
  WASABI = "WASABI",
  BACKBLAZE = "BACKBLAZE",
  VIETTEL = "VIETTEL",
}

export interface S3Bucket {
  name: string;
  isPublicPolicy?: boolean;
  isForTempFile?: boolean;
}

export interface IS3AuthenticateModel {
  provider: S3Provider;
  accessKey: string;
  secretKey: string;
  endpoint?: string;
  defaultBucketName: string;
  publicBucketName: string;
  tempBucketName: string;
  //   defaultBucket: S3Bucket;
  //   buckets: S3Bucket[];
  presignedDuration: number; // in seconds
}
