import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileCode,
  Image,
  Binary,
  Folder,
  X,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Filter,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { ZipFileItem } from '../types';
import { formatBytes } from '../lib/zip';
import { validateAllPaths } from '../lib/pathUtils';
import { PathValidationSummaryCard } from './PathValidationSummaryCard';

interface FileTreePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: ZipFileItem[];
  destination: string;
  onToggleFile: (fileId: string) => void;
  onToggleAll: (selectAll: boolean) => void;
  warnings?: string[];
}

export const FileTreePreviewModal: React.FC<FileTreePreviewModalProps> = ({
  isOpen,
  onClose,
  files,
  destination,
  onToggleFile,
  onToggleAll,
  warnings = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'binary'>('all');

  const validationSummary = useMemo(() => validateAllPaths(files), [files]);

  if (!isOpen) return null;

  // Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch =
        file.relativePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.targetPath.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'text') return !file.isBinary;
      if (filterType === 'binary') return file.isBinary;
      return true;
    });
  }, [files, searchTerm, filterType]);

  const selectedCount = files.filter((f) => f.selected).length;
  const totalSelectedSize = files
    .filter((f) => f.selected)
    .reduce((acc, f) => acc + f.size, 0);

  const allSelected = files.length > 0 && selectedCount === files.length;

  function getFileIcon(filename: string, isBinary: boolean) {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
      return <Image className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'rs', 'go'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
    if (isBinary) {
      return <Binary className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Extracted Directory Tree Preview</h2>
              <p className="text-xs text-slate-400">
                {selectedCount} of {files.length} files selected ({formatBytes(totalSelectedSize)})
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

        {/* Warnings if path traversal was detected */}
        {warnings.length > 0 && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2.5 text-amber-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {warnings.length} path warning(s) detected during extraction and sanitized safely.
            </span>
          </div>
        )}

        {/* Path Validation Summary Banner */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40">
          <PathValidationSummaryCard summary={validationSummary} />
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter files by path or extension..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({files.length})
            </button>
            <button
              onClick={() => setFilterType('text')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                filterType === 'text'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Text ({files.filter((f) => !f.isBinary).length})
            </button>
            <button
              onClick={() => setFilterType('binary')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                filterType === 'binary'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Binary ({files.filter((f) => f.isBinary).length})
            </button>
          </div>

          {/* Toggle All */}
          <button
            onClick={() => onToggleAll(!allSelected)}
            className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 divide-y divide-slate-800/40">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No files found matching filter criteria.
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => onToggleFile(file.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-xs ${
                  file.selected
                    ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-200'
                    : 'bg-slate-950/40 text-slate-500 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFile(file.id);
                    }}
                    className="text-indigo-400 focus:outline-none shrink-0"
                  >
                    {file.selected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>

                  {getFileIcon(file.relativePath, file.isBinary)}

                  <div className="min-w-0">
                    <p className="font-mono font-medium truncate text-white">
                      {file.targetPath}
                    </p>
                    {file.relativePath !== file.targetPath && (
                      <p className="text-[10px] text-slate-500 truncate">
                        From ZIP: {file.relativePath}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      file.isBinary
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {file.isBinary ? 'Binary' : 'UTF-8'}
                  </span>
                  <span className="font-mono text-slate-400 w-16 text-right">
                    {formatBytes(file.size)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-slate-500" />
            <span>Target path prefix: <code className="text-slate-200">{destination || '/ (Root)'}</code></span>
          </div>

          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-4 rounded-xl text-xs transition-colors"
          >
            Done Previewing
          </button>
        </div>
      </div>
    </div>
  );
};
