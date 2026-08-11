import React, { useState } from 'react';
import {
  KeyRound,
  Copy,
  ClipboardPaste,
  Check,
  X,
  Eye,
  EyeOff,
  Github,
  AlertTriangle,
} from 'lucide-react';

interface TokenInputBoxProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  isLoading?: boolean;
  error?: string | null;
  label?: string;
  showSubmitButton?: boolean;
  submitButtonText?: string;
}

export const TokenInputBox: React.FC<TokenInputBoxProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  error = null,
  label = 'GitHub Personal Access Token (PAT)',
  showSubmitButton = true,
  submitButtonText = 'Connect GitHub Account',
}) => {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [isMasked, setIsMasked] = useState(false); // Default to FALSE so it's a regular visible text box

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        setPasted(true);
        setTimeout(() => setPasted(false), 2000);
      }
    } catch (err) {
      console.error('Failed to read from clipboard', err);
      // Fallback: focus input so user can press Ctrl+V / Cmd+V
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300">
            {label}
          </label>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            {value.length > 0 && (
              <span className="font-mono text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {value.length} chars
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Text Box with Actions */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <div className="absolute left-3 text-slate-500 pointer-events-none">
            <KeyRound className="w-4 h-4 text-indigo-400" />
          </div>

          <input
            type={isMasked ? 'password' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. github_pat_... or ghp_..."
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-9 pr-32 py-2.5 text-xs text-white font-mono placeholder-slate-600 transition-colors"
          />

          {/* Action buttons inside/beside input box */}
          <div className="absolute right-2 flex items-center space-x-1">
            {/* Paste Button */}
            <button
              type="button"
              onClick={handlePaste}
              title="Paste from clipboard"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium flex items-center space-x-1 border border-slate-700/80 transition-all active:scale-95"
            >
              {pasted ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Pasted</span>
                </>
              ) : (
                <>
                  <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Paste</span>
                </>
              )}
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!value}
              title="Copy token to clipboard"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium flex items-center space-x-1 border border-slate-700/80 transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Mask/Unmask Toggle */}
            <button
              type="button"
              onClick={() => setIsMasked(!isMasked)}
              title={isMasked ? 'Show token text' : 'Hide token text'}
              className="p-1 text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
            >
              {isMasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Clear Button */}
            {value && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear input"
                className="p-1 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 flex items-center justify-between">
          <span>Standard regular text box — supports native right-click, Copy, &amp; Paste.</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showSubmitButton && (
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <span>Verifying Token...</span>
          ) : (
            <>
              <Github className="w-4 h-4" />
              <span>{submitButtonText}</span>
            </>
          )}
        </button>
      )}
    </form>
  );
};
