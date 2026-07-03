import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as FileSystem from 'expo-file-system/legacy';

let foldersCache: Record<string, string> | null = null;

export async function getGoogleDriveAccessToken(): Promise<string> {
  const { accessToken } = await GoogleSignin.getTokens();
  return accessToken;
}

export async function findFileOrFolder(accessToken: string, name: string, extraQuery?: string): Promise<string | null> {
  let q = `name = '${name}' and trashed = false`;
  if (extraQuery) {
    q += ` and ${extraQuery}`;
  }
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error('[GoogleDrive] Find failed:', txt);
    return null;
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

async function createFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const url = 'https://www.googleapis.com/drive/v3/files';
  const body: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    body.parents = [parentId];
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to create folder ${name}: ${txt}`);
  }
  const data = await res.json();
  return data.id;
}

export async function ensureKnoVaultFolders(accessToken: string): Promise<Record<string, string>> {
  if (foldersCache) return foldersCache;

  // 1. Search for root "KnoVault" folder
  let rootId = await findFileOrFolder(accessToken, 'KnoVault', "mimeType = 'application/vnd.google-apps.folder'");
  if (!rootId) {
    rootId = await createFolder(accessToken, 'KnoVault');
  }

  const subfolders = [
    'Notes',
    'Projects',
    'Goals',
    'Reminders',
    'Workspace',
    'Special Days',
    'Attachments',
    'Images',
    'Backup',
  ];
  const cache: Record<string, string> = { KnoVault: rootId };

  for (const folder of subfolders) {
    let subId = await findFileOrFolder(
      accessToken,
      folder,
      `mimeType = 'application/vnd.google-apps.folder' and '${rootId}' in parents`
    );
    if (!subId) {
      subId = await createFolder(accessToken, folder, rootId);
    }
    cache[folder] = subId;
  }

  foldersCache = cache;
  return cache;
}

export async function uploadJsonFile(
  accessToken: string,
  folderName: string,
  fileName: string,
  data: any
): Promise<string> {
  const folders = await ensureKnoVaultFolders(accessToken);
  const parentId = folders[folderName];
  if (!parentId) throw new Error(`Folder ${folderName} not found`);

  // Check if file already exists
  let fileId = await findFileOrFolder(accessToken, fileName, `'${parentId}' in parents`);

  if (fileId) {
    // Update existing file content
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to update file ${fileName}: ${txt}`);
    }
    return fileId;
  } else {
    // Create new file metadata
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const metadata = {
      name: fileName,
      parents: [parentId],
      mimeType: 'application/json',
    };
    const metadataRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    if (!metadataRes.ok) {
      const txt = await metadataRes.text();
      throw new Error(`Failed to create metadata for ${fileName}: ${txt}`);
    }
    const metadataData = await metadataRes.json();
    const newId = metadataData.id;

    // Upload content
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${newId}?uploadType=media`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!uploadRes.ok) {
      const txt = await uploadRes.text();
      throw new Error(`Failed to upload content for ${fileName}: ${txt}`);
    }
    return newId;
  }
}

export async function uploadMediaFile(
  accessToken: string,
  folderName: string,
  fileName: string,
  localUri: string,
  mimeType: string
): Promise<string> {
  const folders = await ensureKnoVaultFolders(accessToken);
  const parentId = folders[folderName];
  if (!parentId) throw new Error(`Folder ${folderName} not found`);

  // Check if file already exists
  let fileId = await findFileOrFolder(accessToken, fileName, `'${parentId}' in parents`);

  if (!fileId) {
    // Create new metadata
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const metadata = {
      name: fileName,
      parents: [parentId],
      mimeType: mimeType,
    };
    const metadataRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    if (!metadataRes.ok) {
      const txt = await metadataRes.text();
      throw new Error(`Failed to create metadata for media ${fileName}: ${txt}`);
    }
    const metadataData = await metadataRes.json();
    fileId = metadataData.id;
  }

  // Upload binary content using expo-file-system
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    headers: { Authorization: `Bearer ${accessToken}` },
    httpMethod: 'PATCH',
    uploadType: (FileSystem as any).UploadType.BINARY_CONTENT,
  });

  if (result.status !== 200) {
    throw new Error(`Failed to upload media file ${fileName}: ${result.body}`);
  }

  return fileId!;
}

export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to delete file ${fileId}: ${txt}`);
  }
}

export async function listFolderFiles(
  accessToken: string,
  folderName: string
): Promise<{ id: string; name: string }[]> {
  const folders = await ensureKnoVaultFolders(accessToken);
  const parentId = folders[folderName];
  if (!parentId) throw new Error(`Folder ${folderName} not found`);

  const q = `'${parentId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to list files in ${folderName}: ${txt}`);
  }
  const data = await res.json();
  return data.files || [];
}

export async function downloadJsonFile(accessToken: string, fileId: string): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to download file ${fileId}: ${txt}`);
  }
  return await res.json();
}
