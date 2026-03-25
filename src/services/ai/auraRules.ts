/**
 * AURA RULES SYSTEM (v1.4.0)
 * Automatically generates language-specific rules for AURA AI to follow within a project.
 */

export const RULES_BLUEPRINTS: Record<string, string> = {
  'typescript': `---
description: TypeScript & React Best Practices for AURA
globs: ["**/*.ts", "**/*.tsx"]
---
- Use Functional Components with Hooks.
- Prefer Tailwind CSS for styling.
- Use explicit types, avoid 'any'.
- Follow Atomic Design pattern (components/features, components/ui, components/layout).
- Ensure all components are responsive by default.`,

  'python': `---
description: Python Automation & Scripting Rules
globs: ["**/*.py"]
---
- Follow PEP 8 style guide.
- Use type hints for function arguments and return values.
- Implement robust error handling (try-except blocks).
- Use virtual environments (venv) and requirements.txt.`,

  'tauri': `---
description: Tauri Desktop App Best Practices
globs: ["src-tauri/**/*", "src/**/*"]
---
- Security First: Only enable necessary permissions in tauri.conf.json.
- Use Tauri's native APIs for OS integration.
- Keep the frontend lightweight and optimized.
- Ensure cross-platform compatibility (Windows, macOS, Linux).`,

  'design': `---
description: AURA Elite Design Rules
globs: ["**/*.css", "src/styles/**/*"]
---
- Implement Bento Grid layouts for dashboards.
- Use Glassmorphism (backdrop-blur) for overlays.
- Define and use Design Tokens (CSS Variables).
- Prioritize visual hierarchy and micro-interactions.
- Always include premium gradients and smooth transitions.`
};

export function generateAuraRules(files: any[], projectTree: string = ''): { path: string, content: string }[] {
  const content = (projectTree + files.map(f => f.id || f.path).join(' ')).toLowerCase();
  const rulesToCreate: { path: string, content: string }[] = [];

  if (content.includes('.ts') || content.includes('.tsx') || content.includes('package.json')) {
    rulesToCreate.push({ path: '.aura/rules/typescript.md', content: RULES_BLUEPRINTS['typescript'] });
  }
  if (content.includes('.py') || content.includes('requirements.txt')) {
    rulesToCreate.push({ path: '.aura/rules/python.md', content: RULES_BLUEPRINTS['python'] });
  }
  if (content.includes('tauri.conf.json')) {
    rulesToCreate.push({ path: '.aura/rules/tauri.md', content: RULES_BLUEPRINTS['tauri'] });
  }
  
  // Design rules are always helpful for frontend projects
  if (content.includes('index.html') || content.includes('.css')) {
    rulesToCreate.push({ path: '.aura/rules/design.md', content: RULES_BLUEPRINTS['design'] });
  }

  return rulesToCreate;
}
