import {
  Bucket,
  BucketOptions,
  File,
  FileOptions,
  Storage as StorageClient,
  StorageOptions,
} from "@google-cloud/storage";
import { FirebaseError } from "../utils/error";
interface FirebaseMetadata {
  name: string;
  bucket: string;
  generation: string;
  metageneration: string;
  contentType: string;
  timeCreated: string;
  updated: string;
  storageClass: string;
  size: string;
  md5Hash: string;
  contentEncoding: string;
  contentDisposition: string;
  crc32c: string;
  etag: string;
  downloadTokens?: string;
}
/**
 * An extension of the existing Google Cloud File class that allows users to utilize firebase-specific features.
 */
export class FirebaseStorageFile extends File {
  constructor(
    bucket: FirebaseStorageBucket,
    name: string,
    private endpoint: string,
    options?: FileOptions
  ) {
    super(bucket, name, options);
  }
  /**
   * Gets metadata from firebase backend instead of GCS
   * @returns {FirebaseMetadata}
   */
  getFirebaseMetadata(): Promise<FirebaseMetadata> {
    // Build any custom headers based on the defined interceptors on the parent
    // storage object and this object
    const storageInterceptors = this.storage?.interceptors || [];
    const fileInterceptors = this.interceptors || [];
    const allInterceptors = storageInterceptors.concat(fileInterceptors);
    const uri = `${this.endpoint}/b/${this.bucket.name}/o/${encodeURIComponent(
      this.name
    )}`;

    const headers = allInterceptors.reduce((acc, curInterceptor) => {
      const currentHeaders = curInterceptor.request({
        uri,
      });

      Object.assign(acc, currentHeaders.headers);
      return acc;
    }, {});
    return new Promise((resolve, reject) => {
      this.storage.makeAuthenticatedRequest(
        {
          method: "GET",
          uri,
          headers,
        },
        (err, body) => {
          if (err) {
            reject(err);
          } else {
            resolve(body);
          }
        }
      );
    });
  }

  /**
   * Gets the download URL for a given file. Will throw a `FirebaseError` if there are no download tokens available.
   * @returns {Promise<string>}
   */
  async getDownloadUrl(): Promise<string> {
    const { downloadTokens } = await this.getFirebaseMetadata();
    if (!downloadTokens) {
      throw new FirebaseError({
        code: "storage/no-download-token",
        message:
          "No download token available. Please create one in the Firebase Console.",
      });
    }
    const [token] = downloadTokens.split(",");
    return `${this.endpoint}/v0/b/${this.bucket.name}/o/${encodeURIComponent(
      this.name
    )}?alt=media&token=${token}`;
  }
}

/**
 * Extension of `Bucket` to allow for Firebase specific features.
 */
export class FirebaseStorageBucket extends Bucket {
  private endpoint: string;
  constructor(client: FirebaseStorageClient, bucketName: string, endpoint: string, options?: BucketOptions) {
    super(client, bucketName, options);
    this.endpoint = endpoint;
  }
  /**
   * 
   * @param name
   * @param options
   * @returns {FirebaseStorageFile}
   */
  file(name: string, options?: FileOptions): FirebaseStorageFile {
    return new FirebaseStorageFile(this, name, this.endpoint, options);
  }
}
/**
 * Extension of `StorageClient` to allow for Firebase specific features.
 */
export class FirebaseStorageClient extends StorageClient {
  constructor(private endpoint: string, options?: StorageOptions) {
    super(options);
  }
  
  /**
   * 
   * @param bucketName 
   * @param options 
   * @returns {FirebaseStorageBucket}
   */
  bucket(bucketName: string, options?: BucketOptions): FirebaseStorageBucket {
    return new FirebaseStorageBucket(this, bucketName, this.endpoint, options);
  }
}
