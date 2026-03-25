import React from 'react';
import { Folder, ChevronRight, X, FolderOpen, Github, Plus, Globe, RefreshCw, Maximize2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { getFileIcon } from '@/utils/icons';
import { AuraLogo } from '@/components/layout/AuraLogo';
import { FileItem } from '@/types';
import { WorkflowDiagram } from '@/components/features/WorkflowDiagram';
import { StagingArea } from '@/components/layout/StagingArea';

interface StagingFile {
  path: string;
  originalContent: string;
  newContent: string;
  action: 'create_or_modify' | 'delete';
  status: 'pending' | 'accepted' | 'rejected';
}

interface EditorAreaProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  activeFileId: string;
  setActiveFileId: (id: string) => void;
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
  stagingFiles: StagingFile[];
  onAcceptStaging: () => void;
  onDiscardStaging: () => void;
  onUpdateStagingStatus: (path: string, status: 'accepted' | 'rejected') => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  files,
  setFiles,
  activeFileId,
  setActiveFileId,
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
  stagingFiles,
  onAcceptStaging,
  onDiscardStaging,
  onUpdateStagingStatus
}) => {
  return (
    <div className="flex-1 flex min-h-0 relative">
      {/* Welcome Screen when no files are open */}
      {files.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1e1e1e] text-center p-4 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite] drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <AuraLogo size={50} className="drop-shadow-2xl" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">Welcome to Aura IDE</h2>
            <p className="text-[#858585] text-[clamp(0.65rem,1.2vw,0.8rem)] max-w-sm mx-auto line-clamp-2 leading-relaxed italic px-4">
              The next generation AI-powered development environment. Start by creating a new file or opening a folder.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 w-full max-w-4xl px-4">
            <button onClick={openFolder} className="flex flex-col items-center gap-1 p-2.5 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 active:scale-95 w-28">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <FolderOpen size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-medium">Open Folder</span>
            </button>
            <button onClick={onCreateProject} className="flex flex-col items-center gap-1 p-2.5 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 active:scale-95 w-28">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                <FolderOpen size={16} className="text-gray-400 group-hover:scale-110 transition-transform" />
                <Plus size={7} className="absolute ml-2.5 mt-2.5 text-gray-400 font-bold" />
              </div>
              <span className="text-[10px] font-medium focus:text-gray-300 whitespace-nowrap">New Project</span>
            </button>
            <button 
              onClick={() => setSidebarTab('github')} 
              className="flex flex-col items-center gap-1 p-2.5 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 active:scale-95 w-28"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Github size={16} className="text-purple-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-medium">Clone Repo</span>
            </button>
            <button onClick={createNewFile} className="flex flex-col items-center gap-1 p-2.5 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 active:scale-95 w-28">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                <Plus size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-medium">New File</span>
            </button>
            <button onClick={() => {
              const url = prompt('Enter GitHub Repository URL (e.g. https://github.com/user/repo):');
              if (url) {
                const githubRegex = /(?:https?:\/\/github\.com\/|git@github\.com:)?([^\/\s]+)\/([^\/\s#?]+?)(?:\.git)?(?:\/|\s|$|#|\?)/i;
                const match = url.trim().match(githubRegex);
                if (match && match[1] && match[2]) {
                  const owner = match[1];
                  const name = match[2];
                  handleCloneRepo({ name, owner: { login: owner }, full_name: `${owner}/${name}` });
                } else {
                  const parts = url.trim().split('/');
                  if (parts.length === 2) {
                    handleCloneRepo({ name: parts[1], owner: { login: parts[0] }, full_name: url.trim() });
                  } else {
                    alert('Format URL GitHub tidak valid.');
                  }
                }
              }
            }} className="flex flex-col items-center gap-1 p-2.5 bg-[#252526]/50 backdrop-blur-md hover:bg-[#2d2d2d] rounded-xl border border-white/5 transition-all group hover:scale-105 active:scale-95 w-28">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Globe size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[10px] font-medium whitespace-nowrap">Clone URL</span>
            </button>
          </div>
          {/* Shortcuts removed (available in status bar) */}


          {/* Workflow Diagram Section */}
          <WorkflowDiagram />
        </div>
      )}
      
      {/* Staging Area - v2.5.0 Professional Code Review */}
      {stagingFiles.length > 0 && (
        <div className="absolute inset-x-4 inset-y-4 z-[40]">
           <StagingArea 
             files={stagingFiles}
             onAcceptAll={onAcceptStaging}
             onDiscardAll={onDiscardStaging}
             onUpdateFileStatus={onUpdateStagingStatus}
             onClose={onDiscardStaging}
           />
        </div>
      )}
      
      {/* Monaco Editor */}
      {activeFile && (
        <div 
          className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]"
        >
          {/* Breadcrumbs / Editor Header */}
          <div className="h-9 bg-[#1e1e1e] border-b border-white/5 flex items-center px-4 gap-2 text-[11px] text-gray-500 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0">
            <Folder size={12} />
            <span>{projectName.toLowerCase()}</span>
            <ChevronRight size={12} className="opacity-40" />
            {getFileIcon(activeFile.name)}
            <span className="text-gray-300 font-medium">{activeFile.name}</span>
            {nativeProjectPath && <span className="ml-2 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500/80 rounded text-[9px] border border-yellow-500/10">NATIVE SYNC ON</span>}
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
    </div>
  );
};
