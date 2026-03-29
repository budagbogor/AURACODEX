import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Mic, 
  Paperclip, 
  Settings, 
  Trash2, 
  MessageSquare, 
  RotateCcw, 
  Cpu, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import Markdown from 'react-markdown';
import { useAutonomousAI } from '../../hooks/useAutonomousAI';

interface AiComposerV3Props {
  provider: string;
  apiKey: string;
  model: string;
  files: any[];
  activeFileId: string;
  appendTerminalOutput: (msg: string) => void;
  onSuccess: (stats: { fileCount: number; commands: string[]; }) => void;
  projectTree: string;
  messages: any[];
  setMessages: (updater: (prev: any[]) => any[]) => void;
  autoFixTrigger: number;
  autoFixMessage: string;
  onExecuteCommand: (cmd: string) => void;
  onApplyCode: (path: string, content: string, action?: "create_or_modify" | "delete") => Promise<void>;
  nativeProjectPath: string;
  mcpTools: any[];
  ollamaUrl: string;
  activeAgentId: string;
}

export const AiComposerV3: React.FC<AiComposerV3Props> = ({
  provider, apiKey, model, files, activeFileId, appendTerminalOutput,
  onSuccess, projectTree, messages, setMessages,
  autoFixTrigger, autoFixMessage, onExecuteCommand, onApplyCode,
  nativeProjectPath, mcpTools, ollamaUrl, activeAgentId
}) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const category = 'Full Stack'; // Default for V3

  const { runAutonomousLoop, isLooping } = useAutonomousAI(
    provider, apiKey, model, files, category, activeFileId, 
    projectTree, mcpTools, ollamaUrl, setMessages, 
    appendTerminalOutput, onApplyCode, onSuccess
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (autoFixTrigger > 0 && autoFixMessage) {
      runAutonomousLoop(autoFixMessage);
    }
  }, [autoFixTrigger]);

  const handleSend = async () => {
    if (!input.trim() || isLooping) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    
    await runAutonomousLoop(userMsg);
  };

  return (
    <div className="flex flex-col h-full bg-[#18181b] border-l border-white/5 relative">
      {/* Header Indicator */}
      <div className="h-12 bg-[#18181b]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">AURA Autonom (v3.0)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-medium">
             Zero-Click Ready
          </div>
          <button className="text-white/40 hover:text-white transition-colors" title="Settings">
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                "flex gap-3",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border whitespace-nowrap",
                msg.role === 'user' 
                  ? "bg-blue-600/20 border-blue-500/20 text-blue-400" 
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              )}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={clsx(
                "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-blue-600/10 border border-blue-600/20 text-blue-50 text-right" 
                  : "bg-[#27272a] border border-white/5 text-gray-200 prose prose-invert prose-sm"
              )}>
                {msg.content.startsWith('🛠️') ? (
                  <div className="flex items-center gap-2 italic text-emerald-400">
                     <Cpu size={14} className="animate-spin" />
                     {msg.content}
                  </div>
                ) : (
                  <Markdown>
                    {msg.content
                      .replace(/```(file|delete):([^\n]+)\n([\s\S]*?)(?:```|$)/g, '\n> 📦 **$2** *(Kode telah diproses ke Editor Tengah)*\n')
                      .replace(/```call:mcp\/([^\/]+)\/([^\n]+)\n([\s\S]*?)(?:```|$)/g, '\n> 🛠️ **Otonom Tool: $2** \n')}
                  </Markdown>
                )}
              </div>
            </motion.div>
          ))}
          {isLooping && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-500/50">
                   <RotateCcw className="animate-spin" size={12} />
                </div>
                <div className="text-[10px] text-emerald-500/50 italic py-2">AURA sedang berpikir dan memanggil alat...</div>
             </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#18181b]/80 backdrop-blur-xl border-t border-white/5 space-y-3 shrink-0">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik instruksi atau panggil tool..."
            className="w-full bg-[#27272a] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all resize-none pr-12 min-h-[50px] scrollbar-none"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLooping}
            className="absolute right-3 bottom-3 w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-600/20 transition-all group-hover:scale-110 active:scale-95"
          >
            <Send size={14} />
          </button>
        </div>
        
        <div className="flex items-center justify-between text-[10px] text-white/40 px-1">
          <div className="flex gap-3 items-center">
            <span className="flex items-center gap-1"><Paperclip size={10} /> {files.length} Files Context</span>
            <span className="flex items-center gap-1 font-bold text-emerald-500/60"><CheckCircle size={10} /> AI Agent: {activeAgentId.toUpperCase()}</span>
          </div>
          <div className="flex gap-2">
             <span className="flex items-center gap-1"><Sparkles size={10} /> Autonomy Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
};
