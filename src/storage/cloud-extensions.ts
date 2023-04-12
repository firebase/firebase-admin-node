import {
  Bucket,
  BucketOptions,
  File,
  FileOptions,
  Storage as StorageClient,
} from "@google-cloud/storage";
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
  downloadTokens: string;
}
export class FirebaseStorageFile extends File {
  // Gets metadata from firebase backend instead of GCS
  getFirebaseMetadata(): Promise<FirebaseMetadata> {
    // We need to talk to the firebase storage endpoints instead of the google cloud bucket endpoint
    const endpoint = "https://firebasestorage.googleapis.com/v0";
    // Build any custom headers based on the defined interceptors on the parent
    // storage object and this object
    const storageInterceptors = this.storage?.interceptors || [];
    const fileInterceptors = this.interceptors || [];
    const allInterceptors = storageInterceptors.concat(fileInterceptors);
    const uri = `${endpoint}/b/${this.bucket.name}/o/${encodeURIComponent(
      this.name
    )}`;
    console.log(uri);

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


  async getDownloadUrl(): Promise<string> {
    const { downloadTokens } = await this.getFirebaseMetadata();
    const [token] = downloadTokens.split(",");
    const baseUrl =
      process.env.STORAGE_EMULATOR_HOST ||
      "https://firebasestorage.googleapis.com";
    return `${baseUrl}/v0/b/${this.bucket.name}/o/${encodeURIComponent(
      this.name
    )}?alt=media&token=${token}`;
  }
}

export class FirebaseStorageBucket extends Bucket {
  file(name: string, options?: FileOptions): FirebaseStorageFile {
    return new FirebaseStorageFile(this, name, options);
  }
}

export class FirebaseStorageClient extends StorageClient {
  bucket(bucketName: string, options?: BucketOptions): FirebaseStorageBucket {
    return new FirebaseStorageBucket(this, bucketName, options);
  }
}
