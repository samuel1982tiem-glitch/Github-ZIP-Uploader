import React from 'react';
import { CheckCircle2, ExternalLink, GitCommit, Folder, RefreshCw, Github } from 'lucide-react';
import { CommitResult } from '../types';
import { formatBytes } from '../lib/zip';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CommitResult | null;
  onResetZip: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  result,
  onResetZip,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] my-auto">
        {/* Celebration Header */}
        <div className="p-4 sm:p-6 text-center border-b border-slate-800 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 shrink-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white">ZIP Upload Complete!</h2>
          <p className="text-xs text-slate-400 mt-1">
            Successfully committed directly to <span className="text-emerald-300 font-mono font-bold">{result.repoFullName}</span>
          </p>
        </div>

        {/* Checklist of completed tasks */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 font-medium text-slate-300">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>ZIP extracted locally in browser</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{result.totalFiles} files prepared ({formatBytes(result.totalSize)})</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Git tree created (SHA: <code className="text-slate-300">{result.treeSha.substring(0, 7)}</code>)</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Commit created (SHA: <code className="text-slate-300">{result.commitSha.substring(0, 7)}</code>)</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Branch <code className="text-emerald-300 font-bold">{result.branch}</code> updated</span>
            </div>
          </div>

          {/* Details metadata */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>Destination Path:</span>
              <span className="font-mono text-slate-200">{result.destination}</span>
            </div>
            <div className="flex justify-between">
              <span>Commit Message:</span>
              <span className="italic text-slate-300 truncate max-w-[200px]">"{result.commitMessage}"</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row gap-2.5 shrink-0">
          <a
            href={result.branchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
          >
            <Github className="w-4 h-4" />
            <span>OPEN REPOSITORY</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href={result.commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <GitCommit className="w-4 h-4 text-indigo-400" />
            <span>View Commit</span>
          </a>

          <button
            onClick={() => {
              onClose();
              onResetZip();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1"
            title="Upload another ZIP"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Upload</span>
          </button>
        </div>
      </div>
    </div>
  );
};
