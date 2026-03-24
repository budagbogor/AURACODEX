import React from 'react';
import { 
  ArrowRight, 
  Plus, 
  FolderOpen, 
  Github, 
  Zap, 
  Code, 
  Play, 
  Terminal, 
  Package, 
  Box, 
  Cloud,
  ChevronRight,
  Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';

export const WorkflowDiagram: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-5xl mx-auto mt-4 mb-4 px-4"
    >
      <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 relative">
        
        {/* Step 1: SOURCES */}
        <motion.div variants={itemVariants} className="flex-1 flex flex-col gap-3">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-1 px-2">1. Sources (Masukan)</div>
          <div className="bg-[#252526]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-3 flex flex-col gap-3 h-full shadow-xl">
            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Plus size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">New Project</span>
                <span className="text-[8px] text-gray-500">Scaffolding otomatis</span>
              </div>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <FolderOpen size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">Local Folder</span>
                <span className="text-[8px] text-gray-500">Buka proyek yang ada</span>
              </div>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Github size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">Clone Repository</span>
                <span className="text-[8px] text-gray-500">Git & Cloud sync</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Connector */}
        <div className="hidden md:flex items-center justify-center pt-8">
          <ChevronRight className="text-white/10" size={20} />
        </div>

        {/* Step 2: WORKFLOW */}
        <motion.div variants={itemVariants} className="flex-1 flex flex-col gap-2">
          <div className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-1 px-2">2. Workflow (Proses)</div>
          <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 backdrop-blur-xl border border-amber-500/10 rounded-2xl p-3 flex flex-col gap-3 h-full shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Zap size={60} className="text-amber-500" />
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">AI Composer</span>
                <span className="text-[8px] text-gray-400">Generasi kode cerdas</span>
              </div>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-gray-500/10 flex items-center justify-center text-gray-400">
                <Code size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">Manual Coding</span>
                <span className="text-[8px] text-gray-500">Monaco Editor v2</span>
              </div>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Play size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">Live Preview</span>
                <span className="text-[8px] text-gray-400">Hot reload instan</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Connector */}
        <div className="hidden md:flex items-center justify-center pt-8">
          <ChevronRight className="text-white/10" size={20} />
        </div>

        {/* Step 3: DELIVERABLES */}
        <motion.div variants={itemVariants} className="flex-1 flex flex-col gap-2">
          <div className="text-[9px] font-bold text-purple-500 uppercase tracking-[0.2em] mb-1 px-2">3. Deliverables (Hasil)</div>
          <div className="bg-[#252526]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-3 flex flex-col gap-3 h-full shadow-xl">
            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Package size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">Tauri MSI / EXE</span>
                <span className="text-[8px] text-gray-500">Performa Native ringan</span>
              </div>
            </div>
            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Smartphone size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">Android APK</span>
                <span className="text-[8px] text-gray-500">Build via Capacitor</span>
              </div>
            </div>

            <div className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Cloud size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-gray-200">GitHub & Cloud</span>
                <span className="text-[8px] text-gray-500">Deploy & Kolaborasi</span>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
      
    </motion.div>
  );
};
