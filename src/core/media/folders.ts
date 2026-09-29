import type { MediaFolder } from "./types";

/** "Parent / Child / Folder" for a folder id (client-safe). */
export function folderTrailPath(folders: MediaFolder[], folderId: string): string {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const names: string[] = [];
  let current = byId.get(folderId);
  while (current && names.length < 50) {
    names.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return names.join(" / ");
}
