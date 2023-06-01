import { File } from '@google-cloud/storage';
export interface FirebaseMetadata {
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

export function getFirebaseMetadata(
  endpoint: string,
  file: File
): Promise<FirebaseMetadata> {
  const uri = `${endpoint}/b/${file.bucket.name}/o/${encodeURIComponent(
    file.name
  )}`;

  return new Promise((resolve, reject) => {
    file.storage.makeAuthenticatedRequest(
      {
        method: 'GET',
        uri,
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
