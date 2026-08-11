import React, { useState } from 'react';
import {
  Github,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  X,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { AuthState } from '../types';
import { TokenInputBox } from './TokenInputBox';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authState: AuthState;
  onConnectToken: (token: string) => Promise<void>;
  onDisconnect: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  authState,
  onConnectToken,
  onDisconnect,
}) => {
  const [inputToken, setInputToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setLocalError('Please enter a valid GitHub token.');
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await onConnectToken(inputToken.trim());
      setInputToken('');
      onClose();
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">GitHub Authentication</h2>
              <p className="text-xs text-slate-400">Browser-compatible Personal Access Token</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Security Guarantee Box */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 flex items-start space-x-3 text-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-medium text-emerald-300">Strict Client-Side Security</p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-200/90">
                <li>Token is kept <strong>ONLY in memory</strong> for this session tab.</li>
                <li>Never saved to <code className="text-emerald-300">localStorage</code>, cookies, or backend servers.</li>
                <li>All requests communicate directly with <code className="text-emerald-300">api.github.com</code>.</li>
              </ul>
            </div>
          </div>

          {authState.user ? (
            /* Connected state view */
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 text-center space-y-3">
              <img
                src={authState.user.avatar_url}
                alt={authState.user.login}
                className="w-16 h-16 rounded-full mx-auto ring-4 ring-indigo-500/30"
              />
              <div>
                <h3 className="font-semibold text-white text-base">
                  {authState.user.name || authState.user.login}
                </h3>
                <p className="text-xs text-slate-400">@{authState.user.login}</p>
              </div>

              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected & Ready</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onDisconnect();
                    onClose();
                  }}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium py-2 px-4 rounded-xl text-xs transition-colors"
                >
                  Clear Token & Disconnect
                </button>
              </div>
            </div>
          ) : (
            /* Token Input Form */
            <TokenInputBox
              value={inputToken}
              onChange={setInputToken}
              onSubmit={(e) => handleConnect(e)}
              isLoading={isSubmitting}
              error={localError || authState.error}
              label="GitHub Personal Access Token (PAT)"
              submitButtonText="Connect GitHub Account"
            />
          )}

          {/* How to generate token instructions */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>How to create a GitHub token:</span>
            </h4>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside pl-1">
              <li>
                Open GitHub Developer Settings:{' '}
                <a
                  href="https://github.com/settings/tokens?type=beta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline inline-flex items-center space-x-0.5 font-medium"
                >
                  <span>Fine-Grained Tokens</span>
                  <ExternalLink className="w-3 h-3" />
                </a>{' '}
                or{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline inline-flex items-center space-x-0.5 font-medium"
                >
                  <span>Tokens (Classic)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Set expiration and select target repositories.</li>
              <li>
                Grant minimum required permission:{' '}
                <span className="text-slate-200 font-medium">Contents: Read and write</span> (or <span className="text-slate-200 font-medium">repo</span> scope for classic).
              </li>
              <li>Copy and paste the generated token into the field above.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
