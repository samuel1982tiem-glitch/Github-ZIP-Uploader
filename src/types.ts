import { PathValidationDetail, PathValidationSummary } from './lib/pathUtils';

export type { PathValidationDetail, PathValidationErrorItem, PathValidationSummary } from './lib/pathUtils';

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  html_url: string;
  default_branch: string;
  pushed_at: string;
  description: string | null;
  permissions?: {
    admin?: boolean;
    push?: boolean;
    pull?: boolean;
  };
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected?: boolean;
}

export interface ZipFileItem {
  id: string;
  relativePath: string; // e.g., "src/App.jsx"
  originalPath: string; // Original raw path inside ZIP before normalization
  targetPath: string;   // Destination path in repo, e.g., "subfolder/src/App.jsx"
  size: number;         // File size in bytes
  isBinary: boolean;
  content: Uint8Array;
  selected: boolean;    // Included in the upload
  validation: PathValidationDetail;
}

export interface ZipExtractionResult {
  fileName: string;
  totalFiles: number;
  totalUncompressedSize: number;
  totalCompressedSize: number;
  files: ZipFileItem[];
  warnings: string[];
  validationSummary: PathValidationSummary;
}

export type UploadStage =
  | 'idle'
  | 'extracting'
  | 'fetching_ref'
  | 'uploading_blobs'
  | 'creating_tree'
  | 'creating_commit'
  | 'updating_ref'
  | 'success'
  | 'error';

export interface UploadLogItem {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export interface UploadProgress {
  stage: UploadStage;
  message: string;
  currentFile?: string;
  completedBlobs: number;
  totalBlobs: number;
  error?: string;
  logs: UploadLogItem[];
}

export type DryRunStatus = 'ADD' | 'OVERWRITE' | 'UNTOUCHED';

export interface DryRunItem {
  path: string;
  status: DryRunStatus;
  sizeInZip?: number;
  existingSha?: string;
}

export interface DryRunResult {
  addedCount: number;
  overwrittenCount: number;
  untouchedRepoCount: number;
  items: DryRunItem[];
}

export interface CommitResult {
  commitSha: string;
  commitUrl: string;
  repoUrl: string;
  branchUrl: string;
  treeSha: string;
  totalFiles: number;
  totalSize: number;
  branch: string;
  repoFullName: string;
  destination: string;
  commitMessage: string;
}

export interface AuthState {
  token: string | null;
  user: GitHubUser | null;
  authMethod: 'pat' | 'oauth' | null;
  isLoading: boolean;
  error: string | null;
}
