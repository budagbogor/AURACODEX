import React, { useState } from 'react';
import { Folder, X } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (path: string, projectName: string) => void;
  tauriDialog: any;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tauriDialog
}) => {
  const [path, setPath] = useState('');
  const [projectName, setProjectName] = useState('');

  if (!isOpen) return null;

  const handleBrowse = async () => {
    // Deteksi Tauri
    if (tauriDialog) {
      try {
        const selected = await tauriDialog.open({
          directory: true,
          multiple: false,
          title: 'Select Destination Folder'
        });
        if (selected && typeof selected === 'string') {
          const normalizedPath = selected.replace(/\\/g, '/');
          setPath(normalizedPath);
        }
      } catch (err) {
        console.error('Failed to browse folder:', err);
      }
      return;
    }

    // Deteksi Electron
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.showOpenDialog) {
      try {
        const result = await electronAPI.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Select Destination Folder'
        });
        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const normalizedPath = result.filePaths[0].replace(/\\/g, '/');
          setPath(normalizedPath);
        }
      } catch (err) {
        console.error('Failed to browse folder via electron:', err);
      }
      return;
    }

    // Web Fallback
    alert("Fitur Browse Folder secara Native hanya tesedia di aplikasi Desktop (.exe). Silakan ketik lokasi path (misal: C:/project) secara manual di kotak input.");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-white text-sm font-bold tracking-wide">Create a new project</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-[#2d2d2d] border border-white/5 rounded-md px-2 h-9 overflow-hidden focus-within:border-blue-500/50 transition-colors">
              <input 
                type="text" 
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Select project location..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-gray-200"
              />
              <button 
                onClick={handleBrowse}
                className="text-gray-400 hover:text-blue-400 p-1"
                title="Browse"
              >
                <Folder size={14} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center bg-[#2d2d2d] border border-white/5 rounded-md px-2 h-9 focus-within:border-blue-500/50 transition-colors">
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project_name"
                className="w-full bg-transparent border-none outline-none text-xs text-gray-200"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-4 bg-[#252526] border-t border-white/5">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(path, projectName)}
            disabled={!path || !projectName}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
