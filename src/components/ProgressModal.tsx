import React, { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  UploadCloud,
  GitBranch,
  GitCommit,
  Layers,
} from 'lucide-react';
import { UploadProgress } from '../types';

interface ProgressModalProps {
  isOpen: boolean;
  progress: UploadProgress;
  onClose: () => void;
}

export const ProgressModal: React.FC<ProgressModalProps> = ({ isOpen, progress, onClose }) => {
  const [copiedLogs, setCopiedLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress.logs]);

  if (!isOpen) return null;

  const percent =
    progress.totalBlobs > 0
      ? Math.min(100, Math.round((progress.completedBlobs / progress.totalBlobs) * 100))
      : 0;

  const steps = [
    { key: 'fetching_ref', label: '1. Fetch Branch Reference' },
    { key: 'uploading_blobs', label: `2. Create Git Blobs (${progress.completedBlobs}/${progress.totalBlobs})` },
    { key: 'creating_tree', label: '3. Construct Git Tree' },
    { key: 'creating_commit', label: '4. Create Commit' },
    { key: 'updating_ref', label: '5. Update Branch Head' },
  ];

  function getStepState(stepKey: string) {
    if (progress.stage === 'error') return 'error';
    if (progress.stage === 'success') return 'completed';

    const stageOrder = ['fetching_ref', 'uploading_blobs', 'creating_tree', 'creating_commit', 'updating_ref'];
    const currentIndex = stageOrder.indexOf(progress.stage);
    const stepIndex = stageOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  }

  const handleCopyLogs = () => {
    const text = progress.logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              {progress.stage === 'error' ? (
                <XCircle className="w-6 h-6 text-red-400" />
              ) : progress.stage === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {progress.stage === 'success'
                  ? 'Commit Successfully Pushed!'
                  : progress.stage === 'error'
                  ? 'Upload Failed'
                  : 'Committing ZIP to GitHub...'}
              </h2>
              <p className="text-xs text-slate-400">{progress.message}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Git Data API Pipeline</span>
              <span className="text-indigo-400 font-mono">{percent}%</span>
            </div>
            <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-3 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress.stage === 'error'
                    ? 'bg-red-500'
                    : progress.stage === 'success'
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            {progress.currentFile && (
              <p className="text-[11px] font-mono text-slate-400 truncate">
                Processing: {progress.currentFile}
              </p>
            )}
          </div>

          {/* Stepper Pipeline List */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            {steps.map((step) => {
              const state = getStepState(step.key);
              return (
                <div key={step.key} className="flex items-center space-x-2.5 text-xs">
                  {state === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {state === 'active' && (
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                  )}
                  {state === 'pending' && (
                    <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  {state === 'error' && (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span
                    className={`font-medium ${
                      state === 'completed'
                        ? 'text-emerald-300'
                        : state === 'active'
                        ? 'text-indigo-300 font-bold'
                        : state === 'error'
                        ? 'text-red-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Message display */}
          {progress.error && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 text-red-300 text-xs space-y-1">
              <div className="flex items-center space-x-2 font-bold text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Upload Error</span>
              </div>
              <p className="font-mono">{progress.error}</p>
            </div>
          )}

          {/* Real-time Log Terminal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1 font-semibold">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>Execution Log</span>
              </span>
              <button
                onClick={handleCopyLogs}
                className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLogs ? 'Copied' : 'Copy log'}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-36 overflow-y-auto font-mono text-[11px] space-y-1">
              {progress.logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start space-x-2 ${
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* Footer */}
        {progress.stage === 'error' && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-colors"
            >
              Dismiss & Fix Errors
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
