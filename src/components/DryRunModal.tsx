import React, { useState } from 'react';
import { Eye, X, PlusCircle, RefreshCw, MinusCircle, Search, FileCode } from 'lucide-react';
import { DryRunResult } from '../types';
import { formatBytes } from '../lib/zip';

interface DryRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  dryRunResult: DryRunResult | null;
  repoFullName: string;
  branch: string;
  onProceedToCommit?: () => void;
}

export const DryRunModal: React.FC<DryRunModalProps> = ({
  isOpen,
  onClose,
  dryRunResult,
  repoFullName,
  branch,
  onProceedToCommit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ADD' | 'OVERWRITE' | 'UNTOUCHED'>('ALL');

  if (!isOpen || !dryRunResult) return null;

  const filteredItems = dryRunResult.items.filter((item) => {
    const matchesSearch = item.path.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Dry Run Simulation Report</h2>
              <p className="text-xs text-slate-400">
                Target: <span className="text-slate-200 font-mono">{repoFullName}</span> ({branch})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 grid grid-cols-3 gap-3">
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl flex items-center space-x-3">
            <PlusCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-emerald-300/80 font-medium">New Files Added</p>
              <p className="text-xl font-bold text-emerald-400">{dryRunResult.addedCount}</p>
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-amber-300/80 font-medium">Existing Overwritten</p>
              <p className="text-xl font-bold text-amber-400">{dryRunResult.overwrittenCount}</p>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 p-3 rounded-xl flex items-center space-x-3">
            <MinusCircle className="w-6 h-6 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Repo Files Untouched</p>
              <p className="text-xl font-bold text-slate-200">{dryRunResult.untouchedRepoCount}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter file paths..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-900 p-1 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'ALL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({dryRunResult.items.length})
            </button>
            <button
              onClick={() => setFilterStatus('ADD')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'ADD' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Added ({dryRunResult.addedCount})
            </button>
            <button
              onClick={() => setFilterStatus('OVERWRITE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'OVERWRITE' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Overwritten ({dryRunResult.overwrittenCount})
            </button>
            <button
              onClick={() => setFilterStatus('UNTOUCHED')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'UNTOUCHED' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Untouched ({dryRunResult.untouchedRepoCount})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 divide-y divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No files found matching criteria.
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 text-xs"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-200 truncate">{item.path}</span>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {item.sizeInZip && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatBytes(item.sizeInZip)}
                    </span>
                  )}

                  {item.status === 'ADD' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      + NEW FILE
                    </span>
                  )}
                  {item.status === 'OVERWRITE' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      ↺ REPLACES EXISTING
                    </span>
                  )}
                  {item.status === 'UNTOUCHED' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      — UNTOUCHED IN REPO
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            ℹ Dry run mode makes <strong>zero changes</strong> to your GitHub repository.
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 px-4 rounded-xl text-xs transition-colors"
            >
              Close Report
            </button>
            {onProceedToCommit && (
              <button
                onClick={() => {
                  onClose();
                  onProceedToCommit();
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                Proceed to Commit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
