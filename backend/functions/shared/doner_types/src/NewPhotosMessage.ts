import { Photo } from "./Photo";

export interface NewPhotosMessage {
  id: string;
  photos: Photo[];
}
