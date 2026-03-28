import React from 'react';
import { X, Bot, Sparkles, Box, Search, Shield, Activity, GitBranch, Cloudy, RefreshCw, Terminal, Keyboard, Monitor, Smartphone, Cpu } from 'lucide-react';
import { AURA_COLLECTIVE } from '../../utils/constants';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1e1e1e] w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#252526]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <Bot size={28} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">AURA AI IDE v11.0.36</h2>
              <p className="text-[#858585] text-sm mt-1">The Next Generation AI-Powered "Zero-Click" IDE</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#858585] hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Core Features */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#858585] mb-4 flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-400" /> Core Features
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="mt-1"><Bot size={16} className="text-emerald-400" /></div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Multi-AI Architecture</h4>
                      <p className="text-xs text-[#858585] leading-relaxed">Fokus pada Gemini 2.0 Flash sebagai model utama, dengan dukungan fallback otomatis ke OpenRouter, Bytez, dan SumoPod.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="mt-1"><Box size={16} className="text-purple-400" /></div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Super Claude Skills</h4>
                      <p className="text-xs text-[#858585] leading-relaxed">Gunakan perintah `/explain`, `/refactor`, `/test`, dll di chat AI untuk instruksi yang terkalibrasi khusus.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="mt-1"><Search size={16} className="text-orange-400" /></div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Context7 Mode</h4>
                      <p className="text-xs text-[#858585] leading-relaxed">Berikan AI pemahaman mendalam tentang seluruh arsitektur proyek Anda secara otomatis.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 hover:bg-blue-500/10 transition-colors pro-max-glow">
                    <div className="mt-1"><Sparkles size={16} className="text-blue-400" /></div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">UI/UX Pro Max Intelligence</h4>
                      <p className="text-xs text-[#858585] leading-relaxed">AI kini memiliki basis data desain elite (&gt;160 pola) untuk menyarankan style, spacing 8dp, dan transisi premium.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#858585] mb-4 flex items-center gap-2">
                  <Keyboard size={14} className="text-pink-400" /> Keyboard Shortcuts
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between p-2 rounded bg-white/[0.02]"><span className="text-[#858585]">Command Palette</span><kbd className="text-blue-400 font-mono">Ctrl+Shift+P</kbd></div>
                  <div className="flex justify-between p-2 rounded bg-white/[0.02]"><span className="text-[#858585]">File Search</span><kbd className="text-blue-400 font-mono">Ctrl+P</kbd></div>
                  <div className="flex justify-between p-2 rounded bg-white/[0.02]"><span className="text-[#858585]">Toggle Sidebar</span><kbd className="text-blue-400 font-mono">Ctrl+B</kbd></div>
                  <div className="flex justify-between p-2 rounded bg-white/[0.02]"><span className="text-[#858585]">Toggle Terminal</span><kbd className="text-blue-400 font-mono">Ctrl+`</kbd></div>
                </div>
              </div>
            </div>

            {/* Platform Integrations */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#858585] mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-yellow-400" /> Integrations
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="mt-1"><GitBranch size={16} className="text-gray-300" /></div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">GitHub Native</h4>
                      <p className="text-xs text-[#858585] leading-relaxed">Clone repository, list project, dan auto-push ke GitHub langsung dari IDE tanpa CLI setup memusingkan.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="mt-1"><Cloudy size={16} className="text-blue-400" /></div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Local-First Desktop Power</h4>
                      <p className="text-xs text-[#858585] leading-relaxed">Sinkronisasi native ke disk lokal via Tauri FS secara otonom. Tanpa ketergantungan cloud, lebih cepat dan aman.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                    <div className="mt-1"><Terminal size={16} className="text-blue-400" /></div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">MCP (Model Context Protocol)</h4>
                      <p className="text-xs text-[#858585] leading-relaxed">Hubungkan AI dengan server MCP eksternal (SSE/Stdio) untuk mengeksekusi tools pintar secara langsung.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Shield size={16} className="text-blue-400" /> Privacy First
                </h3>
                <p className="text-xs text-[#858585] leading-relaxed">
                  API Key Anda disimpan secara lokal (<code className="text-blue-300">localStorage</code>) di browser/komputer ini dan tidak pernah dikirimkan ke server AURA. Kami tidak menyimpan riwayat percakapan atau kode sumber Anda.
                </p>
              </div>

            </div>

            {/* Build System Guide */}
            <div className="md:col-span-2 p-5 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#858585] flex items-center gap-2">
                <Cpu size={14} className="text-purple-400" /> Build System Guide (Cloud vs local)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white text-xs font-bold">
                    <Monitor size={14} className="text-blue-400" /> Windows (.exe)
                  </div>
                  <ul className="text-[11px] text-[#858585] space-y-1 list-disc pl-4">
                    <li><b className="text-gray-300">Cloud Build</b>: Praktis, via GitHub Actions. Tidak butuh instal Rust di PC.</li>
                    <li><b className="text-gray-300">Local Build</b>: Menggunakan Tauri. Memerlukan instalasi <code className="text-blue-300">Rust</code> & <code className="text-blue-300">Node.js</code>.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white text-xs font-bold">
                    <Smartphone size={14} className="text-emerald-400" /> Android (.apk)
                  </div>
                  <ul className="text-[11px] text-[#858585] space-y-1 list-disc pl-4">
                    <li><b className="text-gray-300">Cloud Build</b>: Otomatis via GitHub. Hasil APK bisa diunduh di tab Actions.</li>
                    <li><b className="text-gray-300">Local Build</b>: Menggunakan Capacitor. Memerlukan <code className="text-emerald-300">Android Studio</code>.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* AURA COLLECTIVE PERSONAS */}
            <div className="md:col-span-2 p-5 rounded-2xl border border-blue-500/10 bg-blue-500/5 space-y-4">
              <h3 className="text-sm font-bold tracking-widest text-blue-400 flex items-center gap-2 italic">
                <Bot size={14} /> AURA COLLECTIVE SWARM
              </h3>
              <p className="text-xs text-[#858585]">
                Koleksi AI Agents (Swarm) khusus yang mengatur arsitektur, UI, keamanan, dan orkestrasi internal IDE:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {AURA_COLLECTIVE.map(agent => (
                  <div key={agent.id} className="p-3 border border-white/5 bg-[#1e1e1e] rounded-xl hover:border-blue-500/40 transition-all group">
                     <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                           <Cpu size={14} />
                        </div>
                        <span className="text-xs font-bold text-gray-200">{agent.name}</span>
                     </div>
                     <p className="text-[10px] text-gray-500 leading-relaxed italic">{agent.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#252526] flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            Mulai Coding
          </button>
        </div>
      </div>
    </div>
  );
}
