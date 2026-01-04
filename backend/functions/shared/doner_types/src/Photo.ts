export interface Photo {
  id: string;
  photoUrl: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: {
    displayName: string;
    uri: string;
    photoUri: string;
  }[];
}
