import React from 'react';
import { Folder, ChevronRight, X, FolderOpen, Github, Plus, Globe, RefreshCw, Maximize2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { getFileIcon } from '@/utils/icons';
import { AuraLogo } from '@/components/layout/AuraLogo';
import { FileItem } from '@/types';

interface EditorAreaProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  showBrowser: boolean;
  setShowBrowser: (show: boolean) => void;
  projectName: string;
  nativeProjectPath: string;
  activeFile: FileItem | null;
  handleEditorChange: (value: string | undefined) => void;
  editorFontSize: any;
  openFolder: () => void;
  setSidebarTab: (tab: any) => void;
  createNewFile: () => void;
  onCreateProject: () => void;
  handleCloneRepo: (repo: any) => void;
  browserWidth: number;
  setIsResizingBrowser: (v: boolean) => void;
  browserUrl: string;
  setBrowserUrl: (url: string) => void;
  browserSrcDoc: string | null;
  setBrowserSrcDoc: (doc: string | null) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  files,
  setFiles,
  activeFileId,
  setActiveFileId,
  showBrowser,
  setShowBrowser,
  projectName,
  nativeProjectPath,
  activeFile,
  handleEditorChange,
  editorFontSize,
  openFolder,
  setSidebarTab,
  createNewFile,
  onCreateProject,
  handleCloneRepo,
  browserWidth,
  setIsResizingBrowser,
  browserUrl,
  setBrowserUrl,
  browserSrcDoc,
  setBrowserSrcDoc
}) => {
  return (
    <div className="flex-1 flex min-h-0 relative">
      {/* Welcome Screen when no files are open */}
      {files.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1e1e1e] text-center p-6 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite] drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <AuraLogo size={70} className="drop-shadow-2xl" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to Aura IDE</h2>
            <p className="text-[#858585] text-sm max-w-sm mx-auto">The next generation AI-powered development environment. Start by creating a new file or opening a folder.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-2xl px-4">
            <button onClick={openFolder} className="flex flex-col items-center gap-2 p-4 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 active:scale-95">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <FolderOpen size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-medium">Open Folder</span>
            </button>
            <button onClick={onCreateProject} className="flex flex-col items-center gap-2 p-4 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 active:scale-95">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors">
                <FolderOpen size={20} className="text-gray-400 group-hover:scale-110 transition-transform" />
                <Plus size={10} className="absolute ml-4 mt-4 text-gray-400 font-bold" />
              </div>
              <span className="text-xs font-medium focus:text-gray-300">Create a new project</span>
            </button>
            <button 
              onClick={() => setSidebarTab('github')} 
              className="flex flex-col items-center gap-2 p-4 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10 active:scale-95"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Github size={20} className="text-purple-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-medium">Clone Repo</span>
            </button>
            <button onClick={createNewFile} className="flex flex-col items-center gap-2 p-4 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-95">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Plus size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-medium">New File</span>
            </button>
            <button onClick={() => {
              const url = prompt('Enter GitHub Repository URL (e.g. https://github.com/user/repo):');
              if (url) {
                // Better regex to handle full URLs and short formats
                const githubRegex = /(?:https?:\/\/github\.com\/|git@github\.com:)?([^\/\s]+)\/([^\/\s#?]+?)(?:\.git)?(?:\/|\s|$|#|\?)/i;
                const match = url.trim().match(githubRegex);
                
                if (match && match[1] && match[2]) {
                  const owner = match[1];
                  const name = match[2];
                  handleCloneRepo({ name, owner: { login: owner }, full_name: `${owner}/${name}` });
                } else {
                  // Fallback for very simple owner/repo input if regex didn't catch it
                  const parts = url.trim().split('/');
                  if (parts.length === 2) {
                    handleCloneRepo({ name: parts[1], owner: { login: parts[0] }, full_name: url.trim() });
                  } else {
                    alert('Format URL GitHub tidak valid. Gunakan "https://github.com/owner/repo" atau "owner/repo"');
                  }
                }
              }
            }} className="flex flex-col items-center gap-2 p-4 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/10 active:scale-95">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Globe size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-medium">Clone from URL</span>
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-[10px] text-[#858585] font-mono uppercase tracking-widest pt-2 pb-6">
            <div className="flex items-center gap-1.5"><kbd className="bg-[#333] px-1.5 py-0.5 rounded border border-white/10 text-white">Ctrl+P</kbd> Search Files</div>
            <div className="flex items-center gap-1.5"><kbd className="bg-[#333] px-1.5 py-0.5 rounded border border-white/10 text-white">Ctrl+Shift+P</kbd> Commands</div>
          </div>
        </div>
      )}
      
      {/* Monaco Editor */}
      {activeFile && (
        <div 
          className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]"
          style={{ marginRight: showBrowser ? browserWidth : 0 }}
        >
          {/* Breadcrumbs / Editor Header */}
          <div className="h-9 bg-[#1e1e1e] border-b border-white/5 flex items-center px-4 gap-2 text-[11px] text-gray-500 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0">
            <Folder size={12} />
            <span>{projectName.toLowerCase()}</span>
            <ChevronRight size={12} className="opacity-40" />
            {getFileIcon(activeFile.name)}
            <span className="text-gray-300 font-medium">{activeFile.name}</span>
            {nativeProjectPath && <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500/80 rounded text-[9px] border border-yellow-500/10">NATIVE SYNC ON</span>}
            
            <div className="ml-auto flex items-center gap-2">
              <button 
                onClick={() => setShowBrowser(!showBrowser)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  showBrowser ? "bg-blue-600/20 text-blue-400" : "hover:bg-white/5 text-gray-500"
                )}
                title="Toggle Internal Browser"
              >
                <Globe size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <Editor
              height="100%"
              theme="vs-dark"
              language={activeFile.language}
              value={activeFile.content}
              onChange={handleEditorChange}
              options={{
                fontSize: editorFontSize,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20 },
                fontFamily: 'JetBrains Mono, monospace',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                lineNumbersMinChars: 3,
                glyphMargin: true,
                folding: true,
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
              }}
            />
          </div>
        </div>
      )}

      {/* Internal Browser Panel */}
      {showBrowser && (
        <>
          {/* Horizontal Resizer for Browser */}
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingBrowser(true);
              document.body.style.cursor = 'col-resize';
            }}
            style={{ right: browserWidth - 2 }}
            className="absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-50"
          />
          
          <div 
            style={{ width: browserWidth }}
            className="absolute right-0 top-0 bottom-0 bg-white border-l border-white/10 flex flex-col z-40 overflow-hidden shadow-2xl"
          >
            {/* Browser Header */}
            <div className="h-10 bg-[#f3f3f3] border-b border-[#ddd] flex items-center px-3 gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-[#555] hover:bg-[#e0e0e0] rounded transition-colors"><ChevronRight size={14} className="rotate-180" /></button>
                <button className="p-1.5 text-[#555] hover:bg-[#e0e0e0] rounded transition-colors"><ChevronRight size={14} /></button>
                <button 
                  onClick={() => {
                    const currentUrl = browserUrl;
                    setBrowserUrl('');
                    setTimeout(() => setBrowserUrl(currentUrl), 10);
                  }}
                  className="p-1.5 text-[#555] hover:bg-[#e0e0e0] rounded transition-colors"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
              <div className="flex-1 h-7 bg-white border border-[#ccc] rounded-md flex items-center px-2 gap-2 shadow-inner">
                <Globe size={12} className="text-[#888]" />
                <input 
                  type="text" 
                  value={browserSrcDoc ? 'Project Preview (Internal)' : browserUrl}
                  onChange={(e) => {
                    if (!browserSrcDoc) setBrowserUrl(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setBrowserSrcDoc(null);
                    }
                  }}
                  className="flex-1 bg-transparent outline-none text-xs text-black"
                  placeholder="Enter URL..."
                />
                {browserSrcDoc && (
                  <button 
                    onClick={() => setBrowserSrcDoc(null)}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    Clear Preview
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-[#555] hover:bg-[#e0e0e0] rounded transition-colors"><Maximize2 size={14} /></button>
                <button 
                  onClick={() => setShowBrowser(false)}
                  className="p-1.5 text-[#555] hover:bg-[#e0e0e0] rounded transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            
            {/* Browser Content */}
            <div className="flex-1 bg-white relative">
              <iframe 
                src={browserSrcDoc ? undefined : browserUrl}
                srcDoc={browserSrcDoc || undefined}
                className="w-full h-full border-none"
                title="Main Internal Browser"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </div>
        </>
      )}

    </div>
  );
};
