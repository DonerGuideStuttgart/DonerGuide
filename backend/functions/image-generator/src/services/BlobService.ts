import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

export class BlobService {
  private containerClient: ContainerClient;

  constructor() {
    // Try to get explicit endpoint (preferred)
    let endpoint = process.env.IMAGE_GENERATOR_STORAGE_ENDPOINT;
    const accountName = process.env.IMAGE_GENERATOR_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.IMAGE_GENERATOR_STORAGE_KEY; // Optional, usually managed identity
    const containerName = process.env.IMAGE_GENERATOR_STORAGE_CONTAINER_NAME ?? "generated-images";

    // Fallback: construct endpoint from account name if missing
    if (!endpoint && accountName) {
      endpoint = `https://${accountName}.blob.core.windows.net`;
    }

    if (!endpoint) {
      // Fallback for local emulator or legacy connection string
      const connectionString = process.env.IMAGE_GENERATOR_STORAGE_CONNECTION_STRING;
      if (connectionString) {
        this.containerClient =
          BlobServiceClient.fromConnectionString(connectionString).getContainerClient(containerName);
        return;
      }
      throw new Error("IMAGE_GENERATOR_STORAGE_ENDPOINT or account name is required");
    }

    let blobServiceClient: BlobServiceClient;

    if (accountName && accountKey) {
      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      blobServiceClient = new BlobServiceClient(endpoint, credential);
    } else {
      blobServiceClient = new BlobServiceClient(endpoint, new DefaultAzureCredential());
    }

    this.containerClient = blobServiceClient.getContainerClient(containerName);
  }

  public async ensureContainerExists(): Promise<void> {
    await this.containerClient.createIfNotExists({ access: "blob" });
  }

  public async uploadImage(imageId: string, buffer: Buffer, mimeType = "image/png"): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(imageId);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimeType },
    });
    return blockBlobClient.url;
  }
}
