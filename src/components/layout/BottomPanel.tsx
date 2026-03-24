import React, { useEffect, useRef } from 'react';
import { Terminal, Plus, X, AlertCircle, AlertTriangle, Info, CheckCircle, RefreshCw, Play } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FileItem } from '@/types';

interface BottomPanelProps {
  zenMode: boolean;
  bottomPanelHeight: number;
  setIsResizingBottom: (v: boolean) => void;
  bottomTab: 'terminal' | 'problems' | 'output' | 'debug';
  setBottomTab: (tab: 'terminal' | 'problems' | 'output' | 'debug') => void;
  terminalSessions: any[];
  setTerminalSessions: React.Dispatch<React.SetStateAction<any[]>>;
  activeTerminalId: string;
  setActiveTerminalId: (id: string) => void;
  addTerminalSession: () => void;
  closeTerminalSession: (id: string) => void;
  terminalInput: string;
  setTerminalInput: (input: string) => void;
  handleTerminalCommand: (e: React.KeyboardEvent) => void;
  problems: any[];
  activeFile: FileItem | null;
  isScanning: boolean;
  scanForProblems: () => void;
  nativeProjectPath: string | null;
  commandHistory: string[];
  historyIndex: number;
  setHistoryIndex: (index: number) => void;
  onKillProcess: () => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  zenMode,
  bottomPanelHeight,
  setIsResizingBottom,
  bottomTab,
  setBottomTab,
  terminalSessions,
  setTerminalSessions,
  activeTerminalId,
  setActiveTerminalId,
  addTerminalSession,
  closeTerminalSession,
  terminalInput,
  setTerminalInput,
  handleTerminalCommand,
  problems,
  activeFile,
  isScanning,
  scanForProblems,
  nativeProjectPath,
  commandHistory,
  historyIndex,
  setHistoryIndex,
  onKillProcess
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentSession = terminalSessions.find(s => s.id === activeTerminalId) || terminalSessions[0];

  useEffect(() => {
    scrollToBottom();
  }, [terminalSessions, activeTerminalId, currentSession?.output]);

  const displayPath = nativeProjectPath || '~/aura-project';

  if (zenMode) return null;

  const renderContent = () => {
    switch (bottomTab) {
      case 'terminal':
        return (
          <div className="flex-1 flex flex-col font-mono text-[13px] h-full overflow-hidden bg-[#0a0a0a]">
            {/* Terminal Tabs Workspace */}
            <div className="flex items-center gap-1 border-b border-white/5 bg-black/40 px-2 py-1">
              {terminalSessions.map(s => (
                <div 
                   key={s.id}
                   onClick={() => setActiveTerminalId(s.id)}
                   className={cn(
                     "group flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-all text-[11px] font-medium border border-transparent",
                     activeTerminalId === s.id 
                       ? "bg-blue-600/20 text-blue-400 border-blue-500/30" 
                       : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                   )}
                >
                  <Terminal size={12} className={activeTerminalId === s.id ? "text-blue-400" : "text-gray-600"} />
                  <span>{s.name}</span>
                  {terminalSessions.length > 1 && (
                    <X 
                       size={10} 
                       className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity ml-1" 
                       onClick={(e) => {
                         e.stopPropagation();
                         closeTerminalSession(s.id);
                       }}
                    />
                  )}
                </div>
              ))}
              <button 
                 onClick={addTerminalSession}
                 className="p-1.5 hover:bg-white/5 rounded-md text-gray-500 hover:text-white transition-all ml-1"
                 title="New Terminal"
              >
                <Plus size={14} />
              </button>
              
              <div className="h-4 w-[1px] bg-white/10 mx-1"></div>
              
              <button 
                 onClick={onKillProcess}
                 className="p-1.5 hover:bg-red-500/20 rounded-md text-red-500/60 hover:text-red-400 transition-all ml-1 flex items-center gap-1.5"
                 title="Kill Active Process (Ctrl+C)"
              >
                <X size={14} />
                <span className="text-[9px] font-bold">KILL</span>
              </button>
            </div>

            {/* Terminal Output */}
            <div 
              ref={terminalEndRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 relative bg-aura-glow"
            >
              <div className="text-blue-400 font-black text-[10px] tracking-[0.2em] uppercase mb-3 text-glow-blue opacity-80 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Aura Terminal Engine v5.0
              </div>
              {currentSession?.output?.map((line: string, i: number) => (
                <div key={i} className="flex gap-2">
                  {line.includes(' $ ') ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-emerald-500">➜</span>
                      <span className="text-blue-400 font-bold text-[12px]">{line.split(' $ ')[0]}</span>
                      <span className="text-gray-600">$</span>
                      <span className="text-white ml-1">{line.split(' $ ').slice(1).join(' $ ')}</span>
                    </div>
                  ) : (
                    <div className={cn(
                       "whitespace-pre-wrap break-all leading-5",
                       line.startsWith('Command not found') ? "text-red-400" : 
                       line.startsWith('[ERROR]') ? "text-red-500" :
                       line.startsWith('[INFO]') ? "text-blue-400" :
                       line.startsWith('✓') || line.startsWith('Process exited with code 0') ? "text-emerald-400" :
                       line.startsWith('Process exited') ? "text-yellow-500" :
                       "text-[#cccccc]"
                    )}>{line}</div>
                  )}
                </div>
              ))}
              <div ref={scrollAnchorRef} />
            </div>

            {/* Terminal Input Area */}
            <div className="flex items-center text-white border-t border-white/5 px-2 py-1.5 bg-black/20 font-mono">
              <div className="flex items-center shrink-0">
                <span className="text-emerald-500 mr-1">➜</span>
                <span className="text-blue-400 font-bold text-[12px] truncate max-w-[300px]" title={displayPath}>{displayPath}</span>
                <span className="text-gray-600 ml-1">$</span>
              </div>
              <input 
                 type="text" 
                 value={terminalInput}
                 onChange={(e) => {
                   setTerminalInput(e.target.value);
                 }}
                 onKeyDown={(e) => {
                   if (e.key === 'ArrowUp') {
                     e.preventDefault();
                     if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
                       const newIndex = historyIndex + 1;
                       setHistoryIndex(newIndex);
                       setTerminalInput(commandHistory[newIndex]);
                     }
                   } else if (e.key === 'ArrowDown') {
                     e.preventDefault();
                     if (historyIndex > 0) {
                       const newIndex = historyIndex - 1;
                       setHistoryIndex(newIndex);
                       setTerminalInput(commandHistory[newIndex]);
                     } else if (historyIndex === 0) {
                       setHistoryIndex(-1);
                       setTerminalInput('');
                     }
                   } else if (e.key === 'c' && e.ctrlKey) {
                     // Ctrl+C to kill running process
                     e.preventDefault();
                     setTerminalInput('');
                   } else {
                     handleTerminalCommand(e);
                   }
                 }}
                 className="flex-1 bg-transparent border-none outline-none text-white font-mono placeholder:text-gray-700/50 ml-2 caret-white"
                 placeholder="ketik perintah..."
                 autoFocus
              />
            </div>
          </div>
        );
      case 'problems':
        return (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 h-full">
            {problems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#858585] gap-2 min-h-[100px]">
                <CheckCircle size={32} className="text-emerald-500 opacity-20" />
                <span className="text-xs italic">No problems have been detected in the workspace.</span>
              </div>
            ) : (
              problems.map((prob, i) => (
                <div key={i} className="flex items-start gap-3 p-1.5 hover:bg-white/5 rounded cursor-pointer group transition-colors">
                  <div className="mt-0.5">
                    {prob.severity === 'error' && <AlertCircle size={14} className="text-red-500" />}
                    {prob.severity === 'warning' && <AlertTriangle size={14} className="text-yellow-500" />}
                    {prob.severity === 'info' && <Info size={14} className="text-blue-500" />}
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#cccccc] group-hover:text-white transition-colors">{prob.message}</span>
                      <span className="text-[10px] text-[#858585] group-hover:text-gray-300 transition-colors">Line {prob.line}</span>
                    </div>
                    <span className="text-[10px] text-[#858585]">{activeFile?.name || 'Unknown'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 'output':
        return (
          <div className="flex-1 font-mono text-[12px] p-4 text-gray-400 overflow-y-auto h-full">
            [info] [2026-03-19 11:38:33] Starting Aura Language Server...
            <br />
            [info] [2026-03-19 11:38:34] Indexing workspace: aura-project
            <br />
            [info] [2026-03-19 11:38:35] Language server ready.
            <br />
            [info] [2026-03-19 11:38:40] File changed: src/App.tsx
            <br />
            [info] [2026-03-19 11:38:41] Re-indexing...
          </div>
        );
      case 'debug':
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-[#858585] gap-3 h-full min-h-[150px]">
            <Terminal size={40} className="opacity-10" />
            <div className="text-center">
              <p className="text-[14px]">Debug Console is empty</p>
              <p className="text-[12px] opacity-60">Start debugging to see output here.</p>
            </div>
            <button className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[12px] transition-colors">
              Launch Debugger
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (zenMode) return null;

  return (
    <div 
      style={{ height: bottomPanelHeight }}
      className="bg-[#1e1e1e] border-t border-white/10 flex flex-col relative shrink-0"
    >
      {/* Resizer Handle (Horizontal) - Premium Drag Area */}
      <div 
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizingBottom(true);
          document.body.style.cursor = 'row-resize';
        }}
        className={cn(
          "absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-[100] group/resizer",
          "hover:bg-blue-500/40 transition-all duration-300"
        )}
      >
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-white/10 rounded-full opacity-0 group-hover/resizer:opacity-100 transition-opacity" />
      </div>
      
      <div className="flex items-center gap-4 px-4 py-1 text-[11px] uppercase font-bold text-[#858585] border-b border-white/5 shrink-0">
        <span 
          onClick={() => setBottomTab('terminal')}
          className={cn("cursor-pointer py-1 transition-colors", bottomTab === 'terminal' ? "text-white border-b border-white" : "hover:text-white")}
        >
          Terminal
        </span>
        <span 
          onClick={() => setBottomTab('problems')}
          className={cn("cursor-pointer py-1 transition-colors flex items-center gap-1", bottomTab === 'problems' ? "text-white border-b border-white" : "hover:text-white")}
        >
          Problems {problems.length > 0 && <span className="bg-red-500 text-white rounded-full px-1 text-[9px]">{problems.length}</span>}
        </span>
        <span 
          onClick={() => setBottomTab('output')}
          className={cn("cursor-pointer py-1 transition-colors", bottomTab === 'output' ? "text-white border-b border-white" : "hover:text-white")}
        >
          Output
        </span>
        <span 
          onClick={() => setBottomTab('debug')}
          className={cn("cursor-pointer py-1 transition-colors", bottomTab === 'debug' ? "text-white border-b border-white" : "hover:text-white")}
        >
          Debug Console
        </span>
        
        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={scanForProblems}
            disabled={isScanning}
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
            title="Scan current file for problems"
          >
            <RefreshCw size={12} className={cn(isScanning && "animate-spin")} />
            <span className="text-[10px]">Scan Code</span>
          </button>
          <Play size={12} className="text-green-500 cursor-pointer" />
          <X size={12} className="cursor-pointer" />
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden min-h-0 bg-black/20">
        {renderContent()}
      </div>
    </div>
  );
};
