import React from 'react';
import { AlertCircle, GitBranch, Folder, MessageSquare, Check, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../lib/zip';
import { PathValidationSummary } from '../types';
import { PathValidationSummaryCard } from './PathValidationSummaryCard';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  repoFullName: string;
  branch: string;
  destination: string;
  commitMessage: string;
  fileCount: number;
  totalSize: number;
  replaceExisting: boolean;
  pathValidationSummary?: PathValidationSummary;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  repoFullName,
  branch,
  destination,
  commitMessage,
  fileCount,
  totalSize,
  replaceExisting,
  pathValidationSummary,
}) => {
  if (!isOpen) return null;

  const isBlockedByPathErrors = pathValidationSummary && !pathValidationSummary.isValid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] my-auto">
        {/* Header - Fixed Top */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Confirm GitHub Commit</h2>
              <p className="text-xs text-slate-400">Review upload details before committing</p>
            </div>
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm text-slate-300 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs sm:text-sm font-medium text-slate-200">
            You are about to upload <span className="text-indigo-400 font-bold">{fileCount} files</span> ({formatBytes(totalSize)}) to:
          </p>

          {/* Repo & Branch Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-sans">Repository:</span>
              <span className="text-indigo-300 font-bold text-xs sm:text-sm truncate">{repoFullName}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-sans">Branch:</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1 truncate">
                <GitBranch className="w-3.5 h-3.5 inline shrink-0" />
                <span className="truncate">{branch}</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-sans">Destination:</span>
              <span className="text-slate-200 flex items-center space-x-1 truncate">
                <Folder className="w-3.5 h-3.5 inline text-amber-400 shrink-0" />
                <span className="truncate">{destination || '/ (Root)'}</span>
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-500 block font-sans mb-1">Commit Message:</span>
              <p className="text-slate-200 bg-slate-900 p-2 rounded-lg font-sans italic border border-slate-800 break-words">
                "{commitMessage || 'Upload ZIP archive'}"
              </p>
            </div>
          </div>

          {/* Path Validation Status */}
          {pathValidationSummary && (
            <PathValidationSummaryCard summary={pathValidationSummary} />
          )}

          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300/90 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Nothing will be committed until you press CONFIRM.</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                {replaceExisting
                  ? 'Matching paths will overwrite existing repository files. Non-matching files remain untouched.'
                  : 'Files will be added directly into the specified branch.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions - Fixed Bottom */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-colors flex items-center space-x-1.5"
          >
            <X className="w-4 h-4" />
            <span>CANCEL</span>
          </button>

          <button
            type="button"
            disabled={isBlockedByPathErrors}
            onClick={onConfirm}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>CONFIRM & COMMIT TO GITHUB</span>
          </button>
        </div>
      </div>
    </div>
  );
};
