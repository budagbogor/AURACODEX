import { readTextFile, writeTextFile, mkdir } from '@tauri-apps/api/fs';

export interface ProjectMemory {
  projectDescription: string;
  architecturalDecisions: string[];
  userPreferences: string[];
  lastActions: { timestamp: number; action: string }[];
  learnedFacts: string[];
}

const DEFAULT_MEMORY: ProjectMemory = {
  projectDescription: "",
  architecturalDecisions: [],
  userPreferences: [],
  lastActions: [],
  learnedFacts: []
};

/**
 * MemoryManager handles the persistent "long-term memory" for AURA AI.
 * It stores knowledge in a hidden .aura/v1.memory.json file within the project.
 */
export const memoryManager = {
  getMemoryPath: (projectRoot: string) => {
    return `${projectRoot}/.aura/v1.memory.json`.replace(/\/+/g, '/').replace(/\\+/g, '\\');
  },

  load: async (projectRoot: string): Promise<ProjectMemory> => {
    if (!projectRoot) return DEFAULT_MEMORY;
    const path = memoryManager.getMemoryPath(projectRoot);
    try {
      const content = await readTextFile(path);
      return JSON.parse(content) as ProjectMemory;
    } catch (err) {
      // If file doesn't exist, return default
      return DEFAULT_MEMORY;
    }
  },

  save: async (projectRoot: string, memory: ProjectMemory): Promise<void> => {
    if (!projectRoot) return;
    const path = memoryManager.getMemoryPath(projectRoot);
    const dir = `${projectRoot}/.aura`.replace(/\/+/g, '/').replace(/\\+/g, '\\');
    
    try {
      // Ensure .aura directory exists
      await mkdir(dir, { recursive: true });
      await writeTextFile(path, JSON.stringify(memory, null, 2));
    } catch (err) {
      console.error('[MEMORY] Failed to save memory:', err);
    }
  },

  /**
   * Automatically extracts facts from an AI response to update the memory.
   * Simple regex or pattern-based extraction can be used here.
   */
  extractAndMerge: async (projectRoot: string, aiResponse: string): Promise<void> => {
    if (!projectRoot) return;
    const memory = await memoryManager.load(projectRoot);
    
    // Look for patterns like "MEMORY: [FACT]" or specific sections
    const factRegex = /MEMORY:\s*(.+)/g;
    let match;
    let newFactsFound = false;

    while ((match = factRegex.exec(aiResponse)) !== null) {
      const fact = match[1].trim();
      if (!memory.learnedFacts.includes(fact)) {
        memory.learnedFacts.push(fact);
        newFactsFound = true;
      }
    }

    // Capture architectural decisions if explicitly stated
    const archRegex = /DECISION:\s*(.+)/g;
    while ((match = archRegex.exec(aiResponse)) !== null) {
      const decision = match[1].trim();
      if (!memory.architecturalDecisions.includes(decision)) {
        memory.architecturalDecisions.push(decision);
        newFactsFound = true;
      }
    }

    if (newFactsFound) {
      // Keep only last 50 facts to prevent prompt bloat
      if (memory.learnedFacts.length > 50) memory.learnedFacts = memory.learnedFacts.slice(-50);
      await memoryManager.save(projectRoot, memory);
    }
  },

  /**
   * Updates project description if missing or changed significantly
   */
  updateDescription: async (projectRoot: string, description: string) => {
     if (!projectRoot || !description) return;
     const memory = await memoryManager.load(projectRoot);
     memory.projectDescription = description;
     await memoryManager.save(projectRoot, memory);
  }
};
