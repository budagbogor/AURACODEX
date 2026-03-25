import React, { useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { X, Check, Trash2, Layers, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StagingFile {
  path: string;
  originalContent: string;
  newContent: string;
  action: 'create_or_modify' | 'delete';
  status: 'pending' | 'accepted' | 'rejected';
}

interface StagingAreaProps {
  files: StagingFile[];
  onAcceptAll: () => void;
  onDiscardAll: () => void;
  onUpdateFileStatus: (path: string, status: 'accepted' | 'rejected') => void;
  onClose: () => void;
}

export const StagingArea: React.FC<StagingAreaProps> = ({
  files,
  onAcceptAll,
  onDiscardAll,
  onUpdateFileStatus,
  onClose
}) => {
  const [activeFilePath, setActiveFilePath] = useState<string>(files[0]?.path || '');
  const activeFile = files.find(f => f.path === activeFilePath) || files[0];

  if (files.length === 0) return null;

  const getLanguage = (path: string) => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.html')) return 'html';
    return 'plaintext';
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border border-blue-500/30 rounded-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <Layers size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              AI Staging Area
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 uppercase tracking-widest font-black">
                {files.length} Files Proposed
              </span>
            </h2>
            <p className="text-[10px] text-gray-500">Tinjau perubahan sebelum diterapkan ke project</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onDiscardAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold"
          >
            <Trash2 size={14} />
            DISCARD ALL
          </button>
          <button 
            onClick={onAcceptAll}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-xs font-bold shadow-lg shadow-emerald-900/20"
          >
            <Check size={14} />
            ACCEPT ALL
          </button>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: File List */}
        <div className="w-64 bg-[#252526] border-r border-white/5 flex flex-col">
          <div className="px-3 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
            Proposed Changes
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {files.map(file => (
              <button
                key={file.path}
                onClick={() => setActiveFilePath(file.path)}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all group",
                  activeFilePath === file.path 
                    ? "bg-blue-600/20 border border-blue-500/30 text-blue-100 shadow-lg" 
                    : "hover:bg-white/5 text-gray-400"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode size={14} className={activeFilePath === file.path ? "text-blue-400" : "text-gray-500"} />
                  <span className="text-[11px] font-medium truncate">{file.path.split(/[\\/]/).pop()}</span>
                </div>
                {file.status === 'accepted' ? (
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-blue-500/40 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main: Diff Editor */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] relative">
           {activeFile && (
             <>
               <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-white/5 text-[11px]">
                  <div className="font-mono text-gray-400 flex items-center gap-2">
                    <span className="text-blue-400">DIFF:</span> {activeFile.path}
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1.5 text-red-400/60">
                        <div className="w-2 h-2 bg-red-500/30 border border-red-500/50 rounded" />
                        Original
                     </div>
                     <div className="flex items-center gap-1.5 text-emerald-400">
                        <div className="w-2 h-2 bg-emerald-500/30 border border-emerald-500/50 rounded" />
                        Proposed Change
                     </div>
                  </div>
               </div>
               <div className="flex-1">
                  <DiffEditor
                    original={activeFile.originalContent}
                    modified={activeFile.newContent}
                    language={getLanguage(activeFile.path)}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      renderSideBySide: true,
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
                    }}
                  />
               </div>
             </>
           )}
           {!activeFile && (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4">
                <AlertCircle size={48} className="opacity-20" />
                <p className="text-sm font-medium">Pilih file untuk meninjau perubahan</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
