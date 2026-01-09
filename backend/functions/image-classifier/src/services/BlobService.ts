import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import axios from "axios";

export class BlobService {
  private containerClient: ContainerClient;
  private containerName = "photos";

  constructor() {
    const connectionString = process.env.IMAGE_CLASSIFIER_STORAGE_CONNECTION_STRING;
    if (connectionString === undefined || connectionString === "") {
      throw new Error("IMAGE_CLASSIFIER_STORAGE_CONNECTION_STRING is not defined");
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = blobServiceClient.getContainerClient(this.containerName);
  }

  /**
   * Ensures that the 'photos' container exists.
   */
  public async ensureContainerExists(): Promise<void> {
    await this.containerClient.createIfNotExists();
  }

  /**
   * Downloads an image from the given URL and uploads it to Blob Storage.
   * @param url The Google Places photo URL.
   * @param photoId The ID to use as the blob name.
   * @returns The mime type and the image buffer.
   */
  public async downloadAndUploadImage(url: string, photoId: string): Promise<{ contentType: string; buffer: Buffer }> {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      const contentType = (response.headers["content-type"] as string | undefined) ?? "image/jpeg";
      const buffer = Buffer.from(response.data as ArrayBufferLike);

      const blockBlobClient = this.containerClient.getBlockBlobClient(photoId);
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType },
      });

      return { contentType, buffer };
    } catch (error) {
      console.error(`Failed to process photo ${photoId} from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Deletes a blob from the storage.
   * @param photoId The ID of the photo to delete.
   */
  public async deleteImage(photoId: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(photoId);
    await blockBlobClient.deleteIfExists();
  }
}
