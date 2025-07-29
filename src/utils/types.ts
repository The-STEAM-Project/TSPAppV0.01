export interface Student {
  uuid: string;
  folder_id: string | null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink: string;
  webViewLink: string;
  createdTime: string;
  size?: string;
}
