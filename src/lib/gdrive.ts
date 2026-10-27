import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Initializes Google Drive using OAuth2 Refresh Token (Personal 15GB Drive Support)
 */
function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("[GDrive] Missing OAuth2 credentials in .env");
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!drive) {
    throw new Error("Google Drive API OAuth2 credentials not configured.");
  }

  const sanitizedName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const fileMetadata: { name: string; parents?: string[] } = {
    name: sanitizedName,
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType: mimeType || "application/octet-stream",
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, name, webViewLink, webContentLink",
  });

  const fileId = response.data.id;
  if (!fileId) throw new Error("Failed to retrieve file ID from Google Drive.");

  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: { role: "reader", type: "anyone" },
    });
  } catch (permErr) {
    console.warn("[GDrive] Warning: Could not set public permissions", permErr);
  }

  return response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}