import React from 'react';
import { Github, KeyRound, ShieldCheck, LogOut, FileArchive, Info } from 'lucide-react';
import { AuthState } from '../types';

interface HeaderProps {
  authState: AuthState;
  onOpenAuthModal: () => void;
  onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({ authState, onOpenAuthModal, onDisconnect }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-inner text-white">
            <FileArchive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">GitHub ZIP Uploader</h1>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                Client-Side
              </span>
            </div>
            <p className="text-xs text-slate-400">
              In-browser ZIP extraction • Zero server storage • Direct Git Data API
            </p>
          </div>
        </div>

        {/* Right Action / Account status */}
        <div className="flex items-center space-x-2">
          {authState.user ? (
            <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-lg p-1.5 pr-2.5">
              <img
                src={authState.user.avatar_url}
                alt={authState.user.login}
                className="w-7 h-7 rounded-full ring-2 ring-indigo-500/50"
              />
              <div className="text-xs hidden sm:block">
                <p className="font-semibold text-slate-200 leading-tight">
                  {authState.user.name || authState.user.login}
                </p>
                <p className="text-slate-400 text-[10px]">@{authState.user.login}</p>
              </div>

              <button
                onClick={onDisconnect}
                title="Clear token and disconnect"
                className="ml-2 p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm active:scale-95"
            >
              <Github className="w-4 h-4" />
              <span>Connect GitHub</span>
            </button>
          )}

          <button
            onClick={onOpenAuthModal}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Authentication & Permissions Info"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
