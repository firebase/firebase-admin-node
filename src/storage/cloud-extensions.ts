import {
  Bucket,
  BucketOptions,
  File,
  FileOptions,
  Storage as StorageClient,
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
  private endpoint: string;
  constructor(
    bucket: FirebaseStorageBucket,
    name: string,
    options?: FileOptions
  ) {
    super(bucket, name, options);
    this.endpoint = (process.env.STORAGE_EMULATOR_HOST || process.env.STORAGE_HOST_OVERRIDE || 'https://firebasestorage.googleapis.com') + '/v0';
  }
  /**
   * Gets metadata from Firebase backend instead of GCS
   * @returns {FirebaseMetadata}
   */
  private getFirebaseMetadata(): Promise<FirebaseMetadata> {
    // Build any custom headers based on the defined interceptors on the parent
    // storage object and this object
    const uri = `${this.endpoint}/b/${this.bucket.name}/o/${encodeURIComponent(
      this.name
    )}`;

    return new Promise((resolve, reject) => {
      this.storage.makeAuthenticatedRequest(
        {
          method: "GET",
          uri,
        },
        (err, body) => {
          console.log(body);
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
    return `${this.endpoint}/b/${this.bucket.name}/o/${encodeURIComponent(
      this.name
    )}?alt=media&token=${token}`;
  }
}

/**
 * Extension of `Bucket` to allow for Firebase specific features.
 */
export class FirebaseStorageBucket extends Bucket {
  /**
   * @param name
   * @param options
   * @returns {FirebaseStorageFile}
   */
  file(name: string, options?: FileOptions): FirebaseStorageFile {
    return new FirebaseStorageFile(this, name, options);
  }
}
/**
 * Extension of `StorageClient` to allow for Firebase specific features.
 */
export class FirebaseStorageClient extends StorageClient {
  /**
   * 
   * @param bucketName 
   * @param options 
   * @returns {FirebaseStorageBucket}
   */
  bucket(bucketName: string, options?: BucketOptions): FirebaseStorageBucket {
    return new FirebaseStorageBucket(this, bucketName, options);
  }
}
