import { InvocationContext } from "@azure/functions";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { Place } from "doner_types";

export async function getImages(
    context: InvocationContext,
    containerClient: ContainerClient,
    place: Place
): Promise<string[]> {
    const downloadPromises = place.photos.map(async (photo) => {
        const blobClient = containerClient.getBlockBlobClient(photo.id);
        
        try {
            const blobExists = await blobClient.exists();
            if (!blobExists) {
                context.error("Image not found for store:", place.id, "Photo ID:", photo.id);
                return null;
            }
            
            const buffer = await blobClient.downloadToBuffer();
            const base64 = buffer.toString("base64");
            return `data:${photo.mimeType};base64,${base64}`;
        } catch (error: any) {
            context.error(`Failed to download photo ${photo.id}: ${error.message}`);
            return null;
        }
    });

    const results = await Promise.all(downloadPromises);
    
    // Filter out null values from failed downloads
    return results.filter((img): img is string => img !== null);
}