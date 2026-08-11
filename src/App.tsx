import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Github,
  KeyRound,
  FolderGit2,
  GitBranch,
  FileArchive,
  Folder,
  MessageSquare,
  Eye,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  ShieldCheck,
  ChevronDown,
  Info,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  AuthState,
  CommitResult,
  DryRunResult,
  GitHubBranch,
  GitHubRepo,
  GitHubUser,
  UploadProgress,
  ZipExtractionResult,
  ZipFileItem,
} from './types';

import {
  fetchAuthenticatedUser,
  fetchUserRepos,
  fetchRepoBranches,
  performDryRun,
  uploadZipToGitHub,
} from './lib/github';

import { extractZipArchive, formatBytes, buildTargetPath } from './lib/zip';
import { validateAllPaths, normalizeAndValidateGitPath } from './lib/pathUtils';

import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { FileTreePreviewModal } from './components/FileTreePreviewModal';
import { DryRunModal } from './components/DryRunModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ProgressModal } from './components/ProgressModal';
import { SuccessModal } from './components/SuccessModal';
import { PathValidationSummaryCard } from './components/PathValidationSummaryCard';
import { TokenInputBox } from './components/TokenInputBox';

export default function App() {
  // Inline Token Input state
  const [inlineToken, setInlineToken] = useState('');

  // Auth state (kept in React memory)
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null,
    authMethod: null,
    isLoading: false,
    error: null,
  });

  // Repositories & Branch selection
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearchTerm, setRepoSearchTerm] = useState('');
  const [selectedRepoFullName, setSelectedRepoFullName] = useState<string>('');
  const [customRepoInput, setCustomRepoInput] = useState<string>('');
  const [isCustomRepoMode, setIsCustomRepoMode] = useState(false);

  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [customBranchInput, setCustomBranchInput] = useState<string>('');

  // ZIP file state
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [zipResult, setZipResult] = useState<ZipExtractionResult | null>(null);
  const [zipFiles, setZipFiles] = useState<ZipFileItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Destination & Commit Message
  const [destination, setDestination] = useState<string>('');
  const [commitMessage, setCommitMessage] = useState<string>('Upload ZIP archive');

  // Modes & Options
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [isDryRunMode, setIsDryRunMode] = useState<boolean>(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDryRunModalOpen, setIsDryRunModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Dry Run & Upload results
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'idle',
    message: '',
    completedBlobs: 0,
    totalBlobs: 0,
    logs: [],
  });
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Parse repo owner and name
  const targetOwnerAndRepo = useMemo(() => {
    const fullName = isCustomRepoMode ? customRepoInput : selectedRepoFullName;
    if (!fullName || !fullName.includes('/')) return null;
    const [owner, repo] = fullName.split('/');
    return { owner: owner.trim(), repo: repo.trim() };
  }, [isCustomRepoMode, customRepoInput, selectedRepoFullName]);

  // Connect via token
  const handleConnectToken = async (token: string) => {
    setAuthState({ token: null, user: null, authMethod: null, isLoading: true, error: null });
    setGlobalError(null);
    try {
      const user = await fetchAuthenticatedUser(token);
      setAuthState({
        token,
        user,
        authMethod: 'pat',
        isLoading: false,
        error: null,
      });

      // Fetch repos
      setIsLoadingRepos(true);
      try {
        const repoList = await fetchUserRepos(token);
        setRepos(repoList);
        if (repoList.length > 0) {
          setSelectedRepoFullName(repoList[0].full_name);
        }
      } catch (err) {
        setGlobalError(`Failed loading repositories: ${(err as Error).message}`);
      } finally {
        setIsLoadingRepos(false);
      }
    } catch (err) {
      setAuthState({
        token: null,
        user: null,
        authMethod: null,
        isLoading: false,
        error: (err as Error).message,
      });
      throw err;
    }
  };

  // Disconnect / clear token
  const handleDisconnect = () => {
    setAuthState({ token: null, user: null, authMethod: null, isLoading: false, error: null });
    setRepos([]);
    setBranches([]);
    setSelectedRepoFullName('');
    setSelectedBranch('main');
  };

  // Fetch branches whenever selected repo changes
  useEffect(() => {
    if (!authState.token || !targetOwnerAndRepo) return;

    let isMounted = true;
    setIsLoadingBranches(true);

    fetchRepoBranches(authState.token, targetOwnerAndRepo.owner, targetOwnerAndRepo.repo)
      .then((branchList) => {
        if (!isMounted) return;
        setBranches(branchList);
        // Find default branch if available in repos list
        const foundRepo = repos.find((r) => r.full_name === `${targetOwnerAndRepo.owner}/${targetOwnerAndRepo.repo}`);
        const defaultBranch = foundRepo?.default_branch || (branchList.length > 0 ? branchList[0].name : 'main');
        setSelectedBranch(defaultBranch);
      })
      .catch((err) => {
        if (!isMounted) return;
        setBranches([]);
        setSelectedBranch('main');
      })
      .finally(() => {
        if (isMounted) setIsLoadingBranches(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authState.token, targetOwnerAndRepo, repos]);

  // Process ZIP File
  const handleProcessZipFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setGlobalError('Please select a valid .zip archive file.');
      return;
    }

    setGlobalError(null);
    setIsExtractingZip(true);

    try {
      const result = await extractZipArchive(file, destination);
      setZipResult(result);
      setZipFiles(result.files);
    } catch (err) {
      setGlobalError((err as Error).message);
      setZipResult(null);
      setZipFiles([]);
    } finally {
      setIsExtractingZip(false);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessZipFile(e.dataTransfer.files[0]);
    }
  };

  // Destination folder updates: re-calculate all targetPaths and run path validation
  const handleDestinationChange = (newDest: string) => {
    setDestination(newDest);
    setZipFiles((prevFiles) =>
      prevFiles.map((file) => {
        const cleanRel = file.relativePath || file.originalPath;
        const targetPath = buildTargetPath(cleanRel, newDest);
        const norm = normalizeAndValidateGitPath(targetPath);
        return {
          ...file,
          targetPath: norm.isValid ? norm.normalizedPath : targetPath,
          validation: norm,
        };
      })
    );
  };

  // Preflight path validation summary
  const pathValidationSummary = useMemo(() => {
    return validateAllPaths(zipFiles);
  }, [zipFiles]);

  // File tree preview toggles
  const handleToggleFile = (fileId: string) => {
    setZipFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleToggleAllFiles = (selectAll: boolean) => {
    setZipFiles((prev) => prev.map((f) => ({ ...f, selected: selectAll })));
  };

  // Run Dry Run simulation
  const handleRunDryRun = async () => {
    if (!authState.token) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!targetOwnerAndRepo) {
      setGlobalError('Please select a valid GitHub repository.');
      return;
    }
    if (zipFiles.length === 0) {
      setGlobalError('Please choose a ZIP file first.');
      return;
    }

    setGlobalError(null);
    setIsProgressModalOpen(true);
    setUploadProgress({
      stage: 'fetching_ref',
      message: 'Running dry run simulation...',
      completedBlobs: 0,
      totalBlobs: zipFiles.filter((f) => f.selected).length,
      logs: [{ id: '1', timestamp: new Date().toLocaleTimeString(), text: 'Starting Dry Run simulation...', type: 'info' }],
    });

    try {
      const activeBranch = selectedBranch === 'custom' ? customBranchInput : selectedBranch;
      const res = await performDryRun(
        authState.token,
        targetOwnerAndRepo.owner,
        targetOwnerAndRepo.repo,
        activeBranch,
        zipFiles
      );
      setDryRunResult(res);
      setIsProgressModalOpen(false);
      setIsDryRunModalOpen(true);
    } catch (err) {
      setUploadProgress((prev) => ({
        ...prev,
        stage: 'error',
        message: 'Dry run simulation failed.',
        error: (err as Error).message,
      }));
    }
  };

  // Perform actual GitHub upload commit
  const handleExecuteUpload = async () => {
    if (!authState.token) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!targetOwnerAndRepo) {
      setGlobalError('Please select a valid GitHub repository.');
      return;
    }
    if (zipFiles.length === 0) {
      setGlobalError('Please choose a ZIP file first.');
      return;
    }

    setIsConfirmModalOpen(false);
    setIsProgressModalOpen(true);

    const activeBranch = selectedBranch === 'custom' ? customBranchInput : selectedBranch;

    try {
      const result = await uploadZipToGitHub(
        authState.token,
        targetOwnerAndRepo.owner,
        targetOwnerAndRepo.repo,
        activeBranch,
        zipFiles,
        commitMessage,
        destination,
        (progress) => setUploadProgress(progress)
      );

      setCommitResult(result);
      setTimeout(() => {
        setIsProgressModalOpen(false);
        setIsSuccessModalOpen(true);
      }, 800);
    } catch (err) {
      // Error handled in uploadZipToGitHub callback
    }
  };

  const selectedFilesCount = zipFiles.filter((f) => f.selected).length;
  const selectedFilesTotalSize = zipFiles
    .filter((f) => f.selected)
    .reduce((acc, f) => acc + f.size, 0);

  const filteredRepos = repos.filter(
    (r) =>
      r.full_name.toLowerCase().includes(repoSearchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(repoSearchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        authState={authState}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Banner Alert if not authenticated */}
        {!authState.user && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-200">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-indigo-300">Ready for AI Studio Preview & Local Use</p>
                <p className="text-indigo-200/80 mt-0.5">
                  Connect your GitHub Personal Access Token to list your repositories and commit ZIP archives.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all whitespace-nowrap"
            >
              Connect Token
            </button>
          </div>
        )}

        {/* Global Error Notice */}
        {globalError && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 text-xs text-red-300 flex items-start justify-between gap-3">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-red-400 hover:text-red-200 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Workflow Form Container */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-800/80">
          
          {/* STEP 1: GitHub Connection */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  1
                </span>
                <span>GitHub Authentication</span>
              </label>

              {authState.user ? (
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authenticated as @{authState.user.login}</span>
                </span>
              ) : (
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                  Token Required
                </span>
              )}
            </div>

            {authState.user ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <img
                    src={authState.user.avatar_url}
                    alt={authState.user.login}
                    className="w-8 h-8 rounded-full ring-2 ring-indigo-500/30"
                  />
                  <div>
                    <p className="font-semibold text-slate-200">
                      {authState.user.name || authState.user.login}
                    </p>
                    <p className="text-slate-400 text-[11px] font-mono">{authState.user.html_url}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-colors"
                  >
                    View Token Info
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
                  >
                    Clear Token
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <TokenInputBox
                  value={inlineToken}
                  onChange={setInlineToken}
                  onSubmit={() => handleConnectToken(inlineToken)}
                  isLoading={authState.isLoading}
                  error={authState.error}
                  label="Enter Personal Access Token (PAT)"
                  submitButtonText="Connect GitHub Account"
                />
              </div>
            )}
          </div>

          {/* STEP 2: Repository Selection */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  2
                </span>
                <span>Repository</span>
              </label>

              <button
                onClick={() => setIsCustomRepoMode(!isCustomRepoMode)}
                className="text-[11px] text-indigo-400 hover:underline font-medium"
              >
                {isCustomRepoMode ? 'Switch to Repos List' : 'Enter Custom owner/repo'}
              </button>
            </div>

            {isCustomRepoMode ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={customRepoInput}
                  onChange={(e) => setCustomRepoInput(e.target.value)}
                  placeholder="e.g. username/my-repository"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600"
                />
                <p className="text-[11px] text-slate-500">
                  Type the exact full repository name formatted as <code className="text-slate-300">owner/repo</code>.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {isLoadingRepos ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Loading your GitHub repositories...</span>
                  </div>
                ) : repos.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedRepoFullName}
                      onChange={(e) => setSelectedRepoFullName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white appearance-none cursor-pointer font-mono"
                    >
                      {repos.map((r) => (
                        <option key={r.id} value={r.full_name}>
                          {r.full_name} {r.private ? '(Private)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3.5 top-3 text-slate-500 pointer-events-none" />
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 text-center space-y-1">
                    <p>No repositories automatically loaded yet.</p>
                    <button
                      onClick={() => setIsCustomRepoMode(true)}
                      className="text-indigo-400 font-semibold hover:underline text-xs"
                    >
                      Click here to enter repo name manually
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: Branch Selection */}
          <div className="p-5 sm:p-6 space-y-3">
            <label className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                3
              </span>
              <span>Branch</span>
            </label>

            <div className="space-y-2">
              {isLoadingBranches ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400 flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Fetching repository branches...</span>
                </div>
              ) : branches.length > 0 ? (
                <div className="relative">
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white appearance-none cursor-pointer font-mono"
                  >
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.name} {b.protected ? '🔒 (Protected)' : ''}
                      </option>
                    ))}
                    <option value="custom">+ Specify custom / new branch</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-3 text-slate-500 pointer-events-none" />
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  placeholder="e.g. main"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
              )}

              {selectedBranch === 'custom' && (
                <input
                  type="text"
                  value={customBranchInput}
                  onChange={(e) => setCustomBranchInput(e.target.value)}
                  placeholder="Enter custom branch name (e.g. main, dev, feature/v1)..."
                  className="w-full bg-slate-950 border border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono mt-2"
                />
              )}
            </div>
          </div>

          {/* STEP 4: ZIP File Drop Zone */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                  4
                </span>
                <span>ZIP File</span>
              </label>

              {zipResult && (
                <button
                  onClick={() => {
                    setZipResult(null);
                    setZipFiles([]);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 hover:underline flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove ZIP</span>
                </button>
              )}
            </div>

            {/* Dropzone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                  : zipResult
                  ? 'border-emerald-500/40 bg-emerald-950/20'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              {isExtractingZip ? (
                <div className="py-4 space-y-2">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    Extracting ZIP archive locally in browser...
                  </p>
                </div>
              ) : zipResult ? (
                /* Extracted Summary Card */
                <div className="space-y-3 text-left">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                        <FileArchive className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white font-mono truncate max-w-xs sm:max-w-md">
                          {zipResult.fileName}
                        </p>
                        <p className="text-[11px] text-emerald-400 font-medium">
                          ✓ Extracted entirely in browser
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Tree</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block font-semibold">Total Files</span>
                      <span className="text-slate-200 font-mono font-bold text-sm">
                        {zipFiles.length}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block font-semibold">Uncompressed</span>
                      <span className="text-slate-200 font-mono font-bold text-sm">
                        {formatBytes(zipResult.totalUncompressedSize)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block font-semibold">Archive Size</span>
                      <span className="text-slate-200 font-mono font-bold text-sm">
                        {formatBytes(zipResult.totalCompressedSize)}
                      </span>
                    </div>
                  </div>

                  {/* Preflight Path Validation Card */}
                  <PathValidationSummaryCard summary={pathValidationSummary} />
                </div>
              ) : (
                /* Unselected State */
                <label className="cursor-pointer space-y-2 block">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProcessZipFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Drop your <code className="text-indigo-400">.zip</code> archive here, or click to browse
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      ZIP is processed 100% locally in browser memory.
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* STEP 5: Destination Path */}
          <div className="p-5 sm:p-6 space-y-3">
            <label className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                5
              </span>
              <span>Destination Path</span>
            </label>

            <div className="space-y-2">
              <div className="relative">
                <Folder className="w-4 h-4 absolute left-3.5 top-3 text-amber-400 pointer-events-none" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  placeholder="/ (Root directory)"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600"
                />
              </div>

              {/* Quick Pills */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="text-slate-500 font-medium">Quick presets:</span>
                <button
                  type="button"
                  onClick={() => handleDestinationChange('')}
                  className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg font-mono text-slate-300 transition-colors"
                >
                  / (Root)
                </button>
                <button
                  type="button"
                  onClick={() => handleDestinationChange('src')}
                  className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg font-mono text-slate-300 transition-colors"
                >
                  src/
                </button>
                <button
                  type="button"
                  onClick={() => handleDestinationChange('docs')}
                  className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg font-mono text-slate-300 transition-colors"
                >
                  docs/
                </button>
              </div>
            </div>
          </div>

          {/* STEP 6: Commit Message & Options */}
          <div className="p-5 sm:p-6 space-y-4">
            <label className="text-sm font-bold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                6
              </span>
              <span>Commit Message & Options</span>
            </label>

            <div className="space-y-3">
              <div className="relative">
                <MessageSquare className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Upload ZIP archive"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                {/* Replace existing check */}
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-slate-200">Replace existing files with matching paths</span>
                    <p className="text-[11px] text-slate-400">
                      Files present in ZIP overwrite matching repo files. Unrelated repo files remain untouched.
                    </p>
                  </div>
                </label>

                {/* Dry run check */}
                <label className="flex items-center space-x-2.5 cursor-pointer pt-2 border-t border-slate-800/80">
                  <input
                    type="checkbox"
                    checked={isDryRunMode}
                    onChange={(e) => setIsDryRunMode(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-semibold text-amber-300">Dry Run Mode (Simulate without committing)</span>
                    <p className="text-[11px] text-slate-400">
                      Compares ZIP contents against GitHub tree and reports added/overwritten files without modifying repo.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Footer Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={zipFiles.length === 0}
            onClick={() => setIsPreviewModalOpen(true)}
            className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>PREVIEW FILES ({selectedFilesCount})</span>
          </button>

          {isDryRunMode ? (
            <button
              type="button"
              disabled={zipFiles.length === 0 || !targetOwnerAndRepo || !pathValidationSummary.isValid}
              onClick={handleRunDryRun}
              className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-600/20 active:scale-95 flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>
                {!pathValidationSummary.isValid
                  ? '⚠️ FIX PATH ERRORS TO RUN DRY RUN'
                  : '🔍 RUN DRY RUN SIMULATION'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={zipFiles.length === 0 || !targetOwnerAndRepo || !pathValidationSummary.isValid}
              onClick={() => {
                if (!authState.token) {
                  setIsAuthModalOpen(true);
                  return;
                }
                setIsConfirmModalOpen(true);
              }}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>
                {!pathValidationSummary.isValid
                  ? '⚠️ FIX PATH ERRORS TO COMMIT'
                  : '🚀 UNZIP & COMMIT TO GITHUB'}
              </span>
            </button>
          )}
        </div>
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        authState={authState}
        onConnectToken={handleConnectToken}
        onDisconnect={handleDisconnect}
      />

      <FileTreePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        files={zipFiles}
        destination={destination}
        onToggleFile={handleToggleFile}
        onToggleAll={handleToggleAllFiles}
        warnings={zipResult?.warnings}
      />

      <DryRunModal
        isOpen={isDryRunModalOpen}
        onClose={() => setIsDryRunModalOpen(false)}
        dryRunResult={dryRunResult}
        repoFullName={targetOwnerAndRepo ? `${targetOwnerAndRepo.owner}/${targetOwnerAndRepo.repo}` : ''}
        branch={selectedBranch === 'custom' ? customBranchInput : selectedBranch}
        onProceedToCommit={() => setIsConfirmModalOpen(true)}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleExecuteUpload}
        repoFullName={targetOwnerAndRepo ? `${targetOwnerAndRepo.owner}/${targetOwnerAndRepo.repo}` : ''}
        branch={selectedBranch === 'custom' ? customBranchInput : selectedBranch}
        destination={destination}
        commitMessage={commitMessage}
        fileCount={selectedFilesCount}
        totalSize={selectedFilesTotalSize}
        replaceExisting={replaceExisting}
        pathValidationSummary={pathValidationSummary}
      />

      <ProgressModal
        isOpen={isProgressModalOpen}
        progress={uploadProgress}
        onClose={() => setIsProgressModalOpen(false)}
      />

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        result={commitResult}
        onResetZip={() => {
          setZipResult(null);
          setZipFiles([]);
        }}
      />
    </div>
  );
}
