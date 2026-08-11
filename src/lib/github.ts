import {
  CommitResult,
  DryRunItem,
  DryRunResult,
  GitHubBranch,
  GitHubRepo,
  GitHubUser,
  UploadLogItem,
  UploadProgress,
  ZipFileItem,
} from '../types';

import {
  normalizeAndValidateGitPath,
  validateAllPaths,
} from './pathUtils';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Converts Uint8Array binary content to a base64 string safely
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow with String.fromCharCode
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Creates standard authorization headers for GitHub REST API
 */
function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

/**
 * Parses GitHub API error responses into clear error messages
 */
async function parseApiError(response: Response, defaultMsg: string): Promise<Error> {
  try {
    const data = await response.json();
    if (response.status === 401) {
      return new Error('Unauthorized: Please check your GitHub Personal Access Token or permissions.');
    }
    if (response.status === 403) {
      if (response.headers.get('x-ratelimit-remaining') === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString() : 'soon';
        return new Error(`GitHub API rate limit exceeded. Rate limit resets at ${resetDate}.`);
      }
      return new Error(data.message || 'Access Forbidden: Token lacks necessary scope (requires "repo" or "Contents: write").');
    }
    if (response.status === 404) {
      return new Error(data.message || 'Resource not found: Verify owner, repository name, or token permissions.');
    }
    if (response.status === 422) {
      return new Error(data.message || 'Unprocessable entity: Check branch name or path validity.');
    }
    return new Error(data.message || `${defaultMsg} (HTTP ${response.status})`);
  } catch {
    return new Error(`${defaultMsg} (HTTP ${response.status})`);
  }
}

/**
 * Fetches authenticated user profile from GitHub
 */
export async function fetchAuthenticatedUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    throw await parseApiError(res, 'Failed to fetch user profile');
  }

  const data = await res.json();
  return {
    login: data.login,
    avatar_url: data.avatar_url,
    name: data.name,
    html_url: data.html_url,
    public_repos: data.public_repos,
    total_private_repos: data.total_private_repos,
  };
}

/**
 * Fetches repositories accessible by the token (sorted by recent push)
 */
export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(`${GITHUB_API_BASE}/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member`, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    throw await parseApiError(res, 'Failed to fetch repositories');
  }

  const data = await res.json();
  return data.map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
    },
    private: repo.private,
    html_url: repo.html_url,
    default_branch: repo.default_branch || 'main',
    pushed_at: repo.pushed_at,
    description: repo.description,
    permissions: repo.permissions,
  }));
}

/**
 * Fetches branches for a given repository
 */
export async function fetchRepoBranches(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/branches?per_page=100`,
    {
      headers: getHeaders(token),
    }
  );

  if (!res.ok) {
    throw await parseApiError(res, `Failed to fetch branches for ${owner}/${repo}`);
  }

  const data = await res.json();
  return data.map((b: any) => ({
    name: b.name,
    commit: {
      sha: b.commit.sha,
      url: b.commit.url,
    },
    protected: b.protected,
  }));
}

/**
 * Fetches the recursive file tree of the specified branch to perform Dry Run comparisons
 */
export async function fetchCurrentBranchTree(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<{ paths: Set<string>; treeSha: string; commitSha: string }> {
  // 1. Get branch commit reference
  const refRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { headers: getHeaders(token) }
  );

  if (!refRes.ok) {
    throw await parseApiError(refRes, `Branch "${branch}" not found in ${owner}/${repo}`);
  }

  const refData = await refRes.json();
  const commitSha = refData.object.sha;

  // 2. Get commit object for base tree SHA
  const commitRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${commitSha}`,
    { headers: getHeaders(token) }
  );

  if (!commitRes.ok) {
    throw await parseApiError(commitRes, 'Failed to fetch commit details');
  }

  const commitData = await commitRes.json();
  const treeSha = commitData.tree.sha;

  // 3. Get recursive tree
  const treeRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`,
    { headers: getHeaders(token) }
  );

  const paths = new Set<string>();

  if (treeRes.ok) {
    const treeData = await treeRes.json();
    if (Array.isArray(treeData.tree)) {
      for (const item of treeData.tree) {
        if (item.type === 'blob') {
          paths.add(item.path);
        }
      }
    }
  }

  return { paths, treeSha, commitSha };
}

/**
 * Compares files in ZIP against existing repository tree for Dry Run analysis
 */
export async function performDryRun(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: ZipFileItem[]
): Promise<DryRunResult> {
  const { paths: existingPaths } = await fetchCurrentBranchTree(token, owner, repo, branch);

  let addedCount = 0;
  let overwrittenCount = 0;
  const items: DryRunItem[] = [];
  const touchedPaths = new Set<string>();

  for (const file of files) {
    if (!file.selected) continue;
    touchedPaths.add(file.targetPath);

    if (existingPaths.has(file.targetPath)) {
      overwrittenCount++;
      items.push({
        path: file.targetPath,
        status: 'OVERWRITE',
        sizeInZip: file.size,
      });
    } else {
      addedCount++;
      items.push({
        path: file.targetPath,
        status: 'ADD',
        sizeInZip: file.size,
      });
    }
  }

  // Calculate untouched files in repository
  let untouchedCount = 0;
  for (const existingPath of existingPaths) {
    if (!touchedPaths.has(existingPath)) {
      untouchedCount++;
      items.push({
        path: existingPath,
        status: 'UNTOUCHED',
      });
    }
  }

  return {
    addedCount,
    overwrittenCount,
    untouchedRepoCount: untouchedCount,
    items,
  };
}

/**
 * Uploads all files from ZIP using GitHub's Git Data API in 1 logical Git Commit
 */
export async function uploadZipToGitHub(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  files: ZipFileItem[],
  commitMessage: string,
  destination: string,
  onProgress: (progress: UploadProgress) => void
): Promise<CommitResult> {
  const logs: UploadLogItem[] = [];

  function addLog(text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    const logItem: UploadLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      text,
      type,
    };
    logs.push(logItem);
    return logItem;
  }

  const activeFiles = files.filter((f) => f.selected);
  if (activeFiles.length === 0) {
    throw new Error('No files selected for upload.');
  }

  // Preflight path validation BEFORE any GitHub API calls or blob creations
  const pathValidation = validateAllPaths(activeFiles);
  if (!pathValidation.isValid) {
    addLog(`[PATH ERROR] Upload blocked: ${pathValidation.errors.length} invalid or duplicate path(s) detected.`, 'error');
    for (const err of pathValidation.errors) {
      addLog(`[PATH ERROR] Original: "${err.originalPath}" -> Reason: ${err.reason}`, 'error');
    }
    throw new Error(
      `Preflight Path Validation Failed: ${pathValidation.errors.length} path issue(s) detected. Please resolve or deselect invalid paths before committing.`
    );
  }

  const totalBlobs = activeFiles.length;

  try {
    // Stage 1: Fetch branch reference
    addLog(`Initializing upload for ${totalBlobs} files to ${owner}/${repo} (${branch})...`, 'info');
    addLog(`✓ Preflight path validation passed: ${pathValidation.validFilesCount} repository-relative paths validated`, 'success');
    onProgress({
      stage: 'fetching_ref',
      message: `Fetching branch "${branch}" reference...`,
      completedBlobs: 0,
      totalBlobs,
      logs,
    });

    const refRes = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
      { headers: getHeaders(token) }
    );

    if (!refRes.ok) {
      const err = await parseApiError(refRes, `Branch "${branch}" not found in ${owner}/${repo}`);
      addLog(`Failed to fetch branch reference: ${err.message}`, 'error');
      throw err;
    }

    const refData = await refRes.json();
    const commitSha = refData.object.sha;
    addLog(`Found latest commit on branch "${branch}": ${commitSha.substring(0, 7)}`, 'success');

    // Fetch commit object for base tree SHA
    const commitRes = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${commitSha}`,
      { headers: getHeaders(token) }
    );

    if (!commitRes.ok) {
      const err = await parseApiError(commitRes, 'Failed to fetch commit object');
      addLog(`Error fetching commit object: ${err.message}`, 'error');
      throw err;
    }

    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;
    addLog(`Retrieved base Git tree SHA: ${baseTreeSha.substring(0, 7)}`, 'info');

    // Stage 2: Create Blobs
    onProgress({
      stage: 'uploading_blobs',
      message: `Creating Git blobs (0/${totalBlobs})...`,
      completedBlobs: 0,
      totalBlobs,
      logs,
    });

    addLog(`Starting creation of ${totalBlobs} Git blobs...`, 'info');

    const fileBlobMap = new Map<string, string>();
    let completedCount = 0;
    const concurrencyLimit = 5; // Concurrent upload limit

    // Helper function for uploading single blob
    async function uploadSingleBlob(file: ZipFileItem): Promise<void> {
      const base64Content = uint8ArrayToBase64(file.content);
      const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
          content: base64Content,
          encoding: 'base64',
        }),
      });

      if (!res.ok) {
        const err = await parseApiError(res, `Failed blob creation for file "${file.targetPath}"`);
        addLog(`Error uploading blob for "${file.targetPath}": ${err.message}`, 'error');
        throw err;
      }

      const blobData = await res.json();
      fileBlobMap.set(file.id, blobData.sha);
      completedCount++;

      onProgress({
        stage: 'uploading_blobs',
        message: `Creating Git blobs (${completedCount}/${totalBlobs})...`,
        currentFile: file.targetPath,
        completedBlobs: completedCount,
        totalBlobs,
        logs,
      });
    }

    // Process blobs with concurrency control
    for (let i = 0; i < activeFiles.length; i += concurrencyLimit) {
      const chunk = activeFiles.slice(i, i + concurrencyLimit);
      await Promise.all(chunk.map((f) => uploadSingleBlob(f)));
    }

    addLog(`All ${totalBlobs} Git blobs created successfully!`, 'success');

    // Stage 3: Create Git Tree
    onProgress({
      stage: 'creating_tree',
      message: 'Constructing new Git tree object...',
      completedBlobs: totalBlobs,
      totalBlobs,
      logs,
    });

    addLog('Building Git tree items array...', 'info');

    const treeItems = activeFiles.map((f) => {
      const norm = normalizeAndValidateGitPath(f.targetPath);
      const gitPath = norm.isValid ? norm.normalizedPath : f.targetPath.replace(/\\/g, '/').replace(/^\/+/, '');
      return {
        path: gitPath,
        mode: '100644', // Standard file mode
        type: 'blob',
        sha: fileBlobMap.get(f.id)!,
      };
    });

    const createTreeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    if (!createTreeRes.ok) {
      const err = await parseApiError(createTreeRes, 'Failed to create Git tree');
      addLog(`Error creating Git tree: ${err.message}`, 'error');
      throw err;
    }

    const treeData = await createTreeRes.json();
    const newTreeSha = treeData.sha;
    addLog(`Git tree created successfully (SHA: ${newTreeSha.substring(0, 7)})`, 'success');

    // Stage 4: Create Commit
    onProgress({
      stage: 'creating_commit',
      message: 'Creating Git commit object...',
      completedBlobs: totalBlobs,
      totalBlobs,
      logs,
    });

    addLog(`Creating commit with message: "${commitMessage}"`, 'info');

    const createCommitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        message: commitMessage || 'Upload ZIP archive',
        tree: newTreeSha,
        parents: [commitSha],
      }),
    });

    if (!createCommitRes.ok) {
      const err = await parseApiError(createCommitRes, 'Failed to create commit');
      addLog(`Error creating commit: ${err.message}`, 'error');
      throw err;
    }

    const commitObj = await createCommitRes.json();
    const newCommitSha = commitObj.sha;
    addLog(`Commit object created (SHA: ${newCommitSha.substring(0, 7)})`, 'success');

    // Stage 5: Update Branch Ref
    onProgress({
      stage: 'updating_ref',
      message: `Updating branch reference "${branch}"...`,
      completedBlobs: totalBlobs,
      totalBlobs,
      logs,
    });

    const updateRefRes = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: 'PATCH',
        headers: getHeaders(token),
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
      }
    );

    if (!updateRefRes.ok) {
      const err = await parseApiError(updateRefRes, `Failed to update branch "${branch}" reference`);
      addLog(`Error updating branch reference: ${err.message}`, 'error');
      throw err;
    }

    addLog(`Branch "${branch}" reference updated to ${newCommitSha.substring(0, 7)}!`, 'success');

    const totalSize = activeFiles.reduce((acc, curr) => acc + curr.size, 0);

    const result: CommitResult = {
      commitSha: newCommitSha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommitSha}`,
      repoUrl: `https://github.com/${owner}/${repo}`,
      branchUrl: `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branch)}`,
      treeSha: newTreeSha,
      totalFiles: totalBlobs,
      totalSize,
      branch,
      repoFullName: `${owner}/${repo}`,
      destination: destination || '/',
      commitMessage: commitMessage || 'Upload ZIP archive',
    };

    onProgress({
      stage: 'success',
      message: 'Upload and commit completed successfully!',
      completedBlobs: totalBlobs,
      totalBlobs,
      logs,
    });

    return result;
  } catch (error) {
    const errorMsg = (error as Error).message || 'An unexpected error occurred during upload.';
    onProgress({
      stage: 'error',
      message: 'Upload failed.',
      completedBlobs: 0,
      totalBlobs,
      error: errorMsg,
      logs,
    });
    throw error;
  }
}
