/// <reference types="vite/client" />

declare module '*.csv?raw' {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    puter?: {
      auth?: {
        isSignedIn?: () => boolean | Promise<boolean>;
        signIn?: () => Promise<any>;
      };
      ai?: {
        chat: (
          promptOrMessages: string | Array<{ role: string; content: any }>,
          testModeOrOptions?: boolean | Record<string, any>,
          maybeOptions?: Record<string, any>
        ) => Promise<any>;
        listModels: (provider?: string | null) => Promise<any[]>;
      };
    };
  }
}

export {};
