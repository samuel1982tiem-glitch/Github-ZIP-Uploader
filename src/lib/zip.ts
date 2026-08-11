import JSZip from 'jszip';
import { ZipExtractionResult, ZipFileItem } from '../types';
import {
  isIgnoredFile,
  normalizeAndValidateGitPath,
  buildTargetPath,
  validateAllPaths,
} from './pathUtils';

export { isIgnoredFile, normalizeAndValidateGitPath, buildTargetPath, validateAllPaths };

/**
 * Detects if a byte array represents binary content
 */
function isBinaryContent(filename: string, content: Uint8Array): boolean {
  // Common binary extensions
  const binaryExtensions = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'avif', 'bmp', 'tiff',
    'pdf', 'zip', 'gz', 'tar', '7z', 'rar',
    'mp3', 'wav', 'ogg', 'mp4', 'webm', 'mov', 'avi',
    'woff', 'woff2', 'ttf', 'eot', 'otf',
    'exe', 'dll', 'so', 'dylib', 'class', 'jar', 'pyc', 'wasm', 'bin', 'db', 'sqlite',
    'psd', 'ai', 'sketch', 'fig'
  ]);

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (binaryExtensions.has(ext)) {
    return true;
  }

  // Text extensions explicitly known
  const textExtensions = new Set([
    'txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'sass',
    'less', 'xml', 'yaml', 'yml', 'toml', 'env', 'gitignore', 'gitattributes', 'svg',
    'sh', 'bash', 'zsh', 'bat', 'ps1', 'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'go', 'rs', 'swift', 'kt', 'kts', 'sql', 'graphql', 'vue', 'svelte', 'astro'
  ]);

  if (textExtensions.has(ext)) {
    return false;
  }

  // Fallback: byte scan inspection (first 1024 bytes)
  const sampleSize = Math.min(content.length, 1024);
  let nullBytes = 0;
  let nonPrintable = 0;

  for (let i = 0; i < sampleSize; i++) {
    const byte = content[i];
    if (byte === 0) {
      nullBytes++;
    } else if (byte < 9 || (byte > 13 && byte < 32)) {
      nonPrintable++;
    }
  }

  if (nullBytes > 0) return true;
  if (sampleSize > 0 && nonPrintable / sampleSize > 0.1) return true;

  return false;
}

/**
 * Sanitizes and cleans relative paths from ZIP files to prevent path traversal attacks
 */
export function sanitizePath(rawPath: string): { cleanPath: string; warning?: string } {
  const norm = normalizeAndValidateGitPath(rawPath);
  return {
    cleanPath: norm.normalizedPath,
    warning: norm.error,
  };
}

/**
 * Extracts a ZIP file in the browser, ignoring OS metadata and building file items
 */
export function extractZipArchive(
  zipFile: File,
  destinationFolder: string = ''
): Promise<ZipExtractionResult> {
  return new Promise(async (resolve, reject) => {
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipFile);
      const fileItems: ZipFileItem[] = [];
      const warnings: string[] = [];
      let totalUncompressedSize = 0;

      // Extract each file in ZIP
      const entries = Object.keys(loadedZip.files);

      for (const entryName of entries) {
        const zipEntry = loadedZip.files[entryName];

        // Skip directories
        if (zipEntry.dir) {
          continue;
        }

        // Skip OS metadata (__MACOSX, .DS_Store, etc.)
        if (isIgnoredFile(entryName)) {
          continue;
        }

        // Normalize and validate path
        const norm = normalizeAndValidateGitPath(entryName);
        if (norm.isIgnored) {
          continue;
        }

        if (norm.error) {
          warnings.push(`"${entryName}": ${norm.error}`);
        }

        const cleanRelativePath = norm.normalizedPath || entryName.replace(/\\/g, '/');
        const targetPath = buildTargetPath(cleanRelativePath, destinationFolder);

        // Read binary content as Uint8Array
        const content = await zipEntry.async('uint8array');
        const isBinary = isBinaryContent(cleanRelativePath, content);

        totalUncompressedSize += content.length;

        fileItems.push({
          id: Math.random().toString(36).substring(2, 11),
          relativePath: cleanRelativePath,
          originalPath: entryName,
          targetPath,
          size: content.length,
          isBinary,
          content,
          selected: true,
          validation: norm,
        });
      }

      // Preflight validation summary across all extracted files
      const validationSummary = validateAllPaths(fileItems);

      resolve({
        fileName: zipFile.name,
        totalFiles: fileItems.length,
        totalUncompressedSize,
        totalCompressedSize: zipFile.size,
        files: fileItems,
        warnings,
        validationSummary,
      });
    } catch (error) {
      reject(new Error(`Failed to extract ZIP archive: ${(error as Error).message}`));
    }
  });
}

/**
 * Utility to convert byte sizes into human readable strings (e.g. "3.8 MB")
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
