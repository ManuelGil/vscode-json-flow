// global.d.ts
export {};

declare global {
  interface Window {
    webviewConfiguration: {
      nodeWidth: number;
      nodeHeight: number;
      nodeBorderColor: string;
      nodeColor: string;
      edgeColor: string;
      layoutDirection: string;
    };
  }
}
