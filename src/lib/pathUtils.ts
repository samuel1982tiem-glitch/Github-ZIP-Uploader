export interface PathValidationDetail {
  originalPath: string;
  normalizedPath: string;
  isValid: boolean;
  isIgnored: boolean;
  error?: string;
  isDuplicate?: boolean;
  duplicateOf?: string;
  isNormalizedDifferent: boolean;
}

export interface PathValidationErrorItem {
  originalPath: string;
  normalizedPath?: string;
  reason: string;
  status?: string;
}

export interface PathValidationSummary {
  totalFiles: number;
  validFilesCount: number;
  invalidFilesCount: number;
  duplicateCount: number;
  normalizedCount: number;
  ignoredCount: number;
  isValid: boolean;
  errors: PathValidationErrorItem[];
  warnings: {
    originalPath: string;
    normalizedPath: string;
    reason: string;
  }[];
}

/**
 * Checks if a path or filename is OS metadata / trash created by OS
 */
export function isIgnoredFile(path: string): boolean {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);

  // Ignore __MACOSX folders and .DS_Store, Thumbs.db, desktop.ini
  if (parts.some((p) => p === '__MACOSX' || p === '.DS_Store' || p === 'Thumbs.db' || p === 'desktop.ini')) {
    return true;
  }

  const fileName = parts[parts.length - 1];
  if (fileName && fileName.startsWith('._')) {
    return true; // macOS resource fork file
  }

  return false;
}

/**
 * Normalizes and validates a path for GitHub Git Tree compatibility.
 * Every ZIP entry MUST pass through this function before any GitHub API calls are made.
 *
 * Rules:
 * - Convert "\" to "/"
 * - Remove leading "./"
 * - Remove leading "/"
 * - Collapse repeated "/"
 * - Remove harmless "." components
 * - Reject ".." components (unsafe traversal)
 * - Reject empty paths
 * - Preserve spaces inside legitimate filenames
 * - Preserve Unicode, UTF-8, and Portuguese characters/accents
 * - Ignore OS metadata (__MACOSX, .DS_Store, etc.)
 */
export function normalizeAndValidateGitPath(rawPath: string): PathValidationDetail {
  const originalPath = rawPath;

  // 1. Check ignored OS metadata
  if (isIgnoredFile(rawPath)) {
    return {
      originalPath,
      normalizedPath: '',
      isValid: false,
      isIgnored: true,
      error: 'OS metadata file ignored (__MACOSX, .DS_Store, Thumbs.db, etc.)',
      isNormalizedDifferent: false,
    };
  }

  // 2. Standardize slashes: replace backslashes with forward slashes
  let working = rawPath.replace(/\\/g, '/');

  // Strip drive letters if any (e.g. "C:")
  working = working.replace(/^[a-zA-Z]:/, '');

  // 3. Split by "/"
  const rawParts = working.split('/');

  // 4. Check for dangerous path traversal ".."
  // Do NOT silently normalize dangerous ".." traversal. Reject paths containing ".."
  if (rawParts.includes('..')) {
    console.log(`[PATH ERROR] Original: "${originalPath}" Reason: Path contains ".."`);
    return {
      originalPath,
      normalizedPath: working,
      isValid: false,
      isIgnored: false,
      error: 'Path contains ".." (unsafe path traversal)',
      isNormalizedDifferent: true,
    };
  }

  // 5. Filter out empty components and harmless "." components
  const cleanParts = rawParts.filter((part) => part !== '' && part !== '.');

  // 6. If no parts remain, reject as empty
  if (cleanParts.length === 0) {
    console.log(`[PATH ERROR] Original: "${originalPath}" Reason: Path is empty or resolves to root`);
    return {
      originalPath,
      normalizedPath: '',
      isValid: false,
      isIgnored: false,
      error: 'Path is empty or resolves to repository root',
      isNormalizedDifferent: true,
    };
  }

  // 7. Join parts to create repo-relative path
  const normalizedPath = cleanParts.join('/');

  // Check if normalizedPath differs from originalPath
  const isNormalizedDifferent = originalPath !== normalizedPath;

  // Debugging logs (Requirement 8)
  if (isNormalizedDifferent) {
    console.log(`[PATH] Original: "${originalPath}" -> Normalized: "${normalizedPath}"`);
  } else {
    console.log(`[PATH] Original: "${originalPath}" Validated: YES`);
  }

  return {
    originalPath,
    normalizedPath,
    isValid: true,
    isIgnored: false,
    isNormalizedDifferent,
  };
}

/**
 * Combines destination folder and relative file path into a clean, normalized repository target path.
 * Guarantees a repository-relative path without leading slashes or Windows backslashes.
 */
export function buildTargetPath(cleanRelativePath: string, destinationFolder: string): string {
  const normRel = normalizeAndValidateGitPath(cleanRelativePath);
  const relPath = normRel.isValid ? normRel.normalizedPath : cleanRelativePath.replace(/\\/g, '/').replace(/^\/+/, '');

  if (!destinationFolder || destinationFolder.trim() === '' || destinationFolder.trim() === '/') {
    return relPath;
  }

  const normDest = normalizeAndValidateGitPath(destinationFolder);
  const destPath = normDest.isValid ? normDest.normalizedPath : destinationFolder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  if (!destPath) {
    return relPath;
  }

  const destParts = destPath.split('/').filter(Boolean);
  const relParts = relPath.split('/').filter(Boolean);

  return [...destParts, ...relParts].join('/');
}

/**
 * Validates an array of target file items for duplicates, invalid paths, and unsafe traversals.
 */
export function validateAllPaths(
  files: { id: string; relativePath: string; originalPath?: string; targetPath: string; selected: boolean }[]
): PathValidationSummary {
  const activeFiles = files.filter((f) => f.selected);
  const totalFiles = activeFiles.length;

  let validFilesCount = 0;
  let invalidFilesCount = 0;
  let duplicateCount = 0;
  let normalizedCount = 0;
  let ignoredCount = 0;

  const errors: PathValidationErrorItem[] = [];
  const warnings: { originalPath: string; normalizedPath: string; reason: string }[] = [];

  const seenPaths = new Map<string, string>(); // targetPath -> originalPath

  for (const file of activeFiles) {
    const origPath = file.originalPath || file.relativePath;

    // Validate targetPath directly
    const norm = normalizeAndValidateGitPath(file.targetPath);

    if (norm.isIgnored) {
      ignoredCount++;
      continue;
    }

    if (!norm.isValid) {
      invalidFilesCount++;
      errors.push({
        originalPath: origPath,
        normalizedPath: norm.normalizedPath,
        reason: norm.error || 'Invalid path format',
        status: 'Unsafe Path',
      });
      continue;
    }

    const finalPath = norm.normalizedPath;

    // Check for duplicate target paths
    if (seenPaths.has(finalPath)) {
      duplicateCount++;
      const firstOriginal = seenPaths.get(finalPath)!;
      errors.push({
        originalPath: origPath,
        normalizedPath: finalPath,
        reason: `Duplicate normalized path: Both "${origPath}" and "${firstOriginal}" resolve to "${finalPath}"`,
        status: 'Duplicate Path',
      });
    } else {
      seenPaths.set(finalPath, origPath);
      validFilesCount++;
    }

    if (norm.isNormalizedDifferent) {
      normalizedCount++;
      warnings.push({
        originalPath: origPath,
        normalizedPath: finalPath,
        reason: 'Path automatically normalized to standard Git relative format',
      });
    }
  }

  const isValid = invalidFilesCount === 0 && duplicateCount === 0;

  return {
    totalFiles,
    validFilesCount,
    invalidFilesCount,
    duplicateCount,
    normalizedCount,
    ignoredCount,
    isValid,
    errors,
    warnings,
  };
}
