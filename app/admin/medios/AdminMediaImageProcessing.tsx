"use client";
import { AdminPhotoTools } from "./AdminPhotoTools";

export function AdminMediaImageProcessing({mediaId,profileName}:{mediaId:string;profileName:string}) {
  return <AdminPhotoTools images={[{id:mediaId,url:`/media/${encodeURIComponent(mediaId)}`}]} profileName={profileName} />;
}
