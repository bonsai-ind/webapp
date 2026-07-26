import type { ApiClient } from "./get-json";
import { getBlob } from "./get-json";

// downloadFile fetches an authenticated path as a Blob and hands it to the
// browser as a named download (object URL + a transient <a download> click —
// the standard pattern; auth headers rule out a plain href).
export async function downloadFile(session: ApiClient, path: string, filename: string): Promise<void> {
  const blob = await getBlob(session, path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
