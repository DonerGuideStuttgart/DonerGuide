import { Photo } from "./Photo";

/**
 * @deprecated Use PhotoClassificationMessage for decoupled processing.
 */
export interface NewPhotosMessage {
  id: string;
  photos: Photo[];
}
