import { FileItem } from '../../types';

export interface ProjectBlueprint {
  name: string;
  requiredFiles: string[];
  description: string;
}

export const PROJECT_BLUEPRINTS: ProjectBlueprint[] = [
  {
    name: 'Vite/React',
    requiredFiles: ['package.json', 'index.html', 'src/main.tsx', 'vite.config.ts'],
    description: 'Modern React project with Vite'
  },
  {
    name: 'Next.js',
    requiredFiles: ['package.json', 'app/page.tsx', 'next.config.mjs'],
    description: 'Next.js App Router project'
  },
  {
    name: 'Vanilla HTML',
    requiredFiles: ['index.html'],
    description: 'Simple website'
  },
  {
    name: 'Capacitor Mobile',
    requiredFiles: ['package.json', 'capacitor.config.ts', 'index.html'],
    description: 'Hybrid mobile app'
  },
  {
    name: 'Tauri Desktop',
    requiredFiles: ['package.json', 'src-tauri/tauri.conf.json', 'src-tauri/Cargo.toml'],
    description: 'Native desktop app'
  }
];

export function auditProjectStructure(files: any[], projectTree: string = ''): string[] {
  const allFiles = new Set([
     ...files.map(f => f.id || f.path),
     ...projectTree.split('\n').filter(Boolean)
  ]);

  // Determine which blueprint is most likely intended
  const content = Array.from(allFiles).join('\n').toLowerCase();
  
  let bestBlueprint: ProjectBlueprint | null = null;
  
  if (content.includes('next.config') || content.includes('app/page')) {
    bestBlueprint = PROJECT_BLUEPRINTS.find(b => b.name === 'Next.js')!;
  } else if (content.includes('vite.config') || content.includes('main.tsx')) {
    bestBlueprint = PROJECT_BLUEPRINTS.find(b => b.name === 'Vite/React')!;
  } else if (content.includes('tauri.conf.json')) {
    bestBlueprint = PROJECT_BLUEPRINTS.find(b => b.name === 'Tauri Desktop')!;
  } else if (content.includes('capacitor.config')) {
    bestBlueprint = PROJECT_BLUEPRINTS.find(b => b.name === 'Capacitor Mobile')!;
  } else if (content.includes('index.html')) {
    bestBlueprint = PROJECT_BLUEPRINTS.find(b => b.name === 'Vanilla HTML')!;
  }

  if (!bestBlueprint) return [];

  const missing = bestBlueprint.requiredFiles.filter(req => {
    // Check for exact match or suffix match (to handle paths)
    return !Array.from(allFiles).some(f => f.endsWith(req) || f === req);
  });

  return missing;
}
