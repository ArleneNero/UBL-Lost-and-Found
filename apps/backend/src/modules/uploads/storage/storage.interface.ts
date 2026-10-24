export interface ObjectMetadata {
  contentLength: number;
  contentType: string;
  exists: boolean;
}

export interface StorageProvider {
  /**
   * Generates a presigned PUT URL for direct browser/client upload
   */
  getPresignedPutUrl(
    storagePath: string,
    contentType: string,
    contentLength: number,
    expiresInSeconds: number
  ): Promise<string>;

  /**
   * Checks object existence and retrieves metadata (size, MIME) from storage
   */
  headObject(key: string): Promise<ObjectMetadata>;

  /**
   * Generates a temporary signed read URL for accessing private images
   */
  getPresignedReadUrl(
    storagePath: string,
    expiresInSeconds: number
  ): Promise<string>;

  /**
   * Optional helper to simulate direct PUT in tests or local dev
   */
  simulatePut?(
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void>;
}
