import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Copy, Check, Info } from 'lucide-react';
import { PathValidationSummary } from '../types';

interface PathValidationSummaryCardProps {
  summary: PathValidationSummary;
  showDetails?: boolean;
}

export const PathValidationSummaryCard: React.FC<PathValidationSummaryCardProps> = ({
  summary,
  showDetails = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyErrors = () => {
    if (summary.errors.length === 0) return;
    const lines = summary.errors.map((err, i) => {
      let text = `[PATH ERROR ${i + 1}]\nOriginal: ${err.originalPath}\nReason: ${err.reason}`;
      if (err.normalizedPath) {
        text += `\nNormalized: ${err.normalizedPath}`;
      }
      return text;
    });
    navigator.clipboard.writeText(lines.join('\n\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (summary.isValid) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-emerald-400 flex items-center space-x-1.5 uppercase text-[11px] tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PATH VALIDATION</span>
          </span>
          <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-300 font-mono text-[10px] font-bold rounded-full border border-emerald-500/20">
            Preflight Passed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium text-slate-300">
          <div className="flex items-center space-x-1.5 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>✓ {summary.validFilesCount} valid files</span>
          </div>
          <div className="flex items-center space-x-1.5 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>✓ No duplicate paths</span>
          </div>
          <div className="flex items-center space-x-1.5 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>✓ No unsafe paths</span>
          </div>
        </div>

        <p className="text-[11px] text-emerald-400 font-semibold pt-1">Ready to upload.</p>

        {summary.normalizedCount > 0 && (
          <div className="flex items-start space-x-1.5 pt-1.5 border-t border-emerald-500/10 text-[11px] text-slate-400">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              {summary.normalizedCount} path(s) automatically normalized to standard Git relative format (backslashes converted, leading slashes removed).
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4 space-y-3 text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-red-400 font-bold">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-red-400" />
          <span className="uppercase text-[11px] tracking-wider">
            PATH VALIDATION: ⚠ {summary.errors.length} INVALID PATH(S) DETECTED
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyErrors}
          className="px-3 py-1 bg-red-900/50 hover:bg-red-800/60 text-red-200 border border-red-500/40 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'COPIED' : '[ COPY PATH ERRORS ]'}</span>
        </button>
      </div>

      <p className="text-slate-300 text-[11px]">
        Upload blocked to prevent GitHub API errors. Fix or deselect unsafe or duplicate paths before uploading.
      </p>

      {showDetails && summary.errors.length > 0 && (
        <div className="max-h-52 overflow-y-auto space-y-2 pr-1 font-mono text-[11px]">
          {summary.errors.map((err, idx) => (
            <div key={idx} className="bg-slate-950 border border-red-500/30 rounded-lg p-2.5 space-y-1 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-400">Original:</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded font-bold">
                  {err.status || 'Invalid'}
                </span>
              </div>
              <p className="text-slate-200 break-all">{err.originalPath}</p>

              {err.normalizedPath && err.normalizedPath !== err.originalPath && (
                <>
                  <span className="font-bold text-amber-400 block mt-1">Normalized:</span>
                  <p className="text-amber-200 break-all">{err.normalizedPath}</p>
                </>
              )}

              <span className="font-bold text-red-400 block mt-1">Reason:</span>
              <p className="text-red-300 font-sans">{err.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
