export interface ShinobiBaseStatus {
  imported: boolean;
  packPath: string;
}

export interface ShinobiBaseProgress {
  percent: number;
  stage: string;
  detail: string;
}

export interface ShinobiBaseBridge {
  getStatus(): Promise<ShinobiBaseStatus>;
  importBase(): Promise<{ ok: boolean; canceled?: boolean; manifest?: unknown }>;
  assetUrl(relativePath: string): Promise<string>;
  onProgress(callback: (progress: ShinobiBaseProgress) => void): () => void;
}

declare global {
  interface Window {
    shinobiBase?: ShinobiBaseBridge;
  }
}

export {};
