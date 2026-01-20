declare module 'jspdf' {
  // Keep typings minimal to avoid heavy/recursive upstream .d.ts that can crash the TS compiler.
  // We only rely on the runtime default export.
  const jsPDF: any;
  export default jsPDF;
}

declare module 'html2canvas' {
  // Minimal typing for our usage (DOM element -> canvas)
  const html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
  export default html2canvas;
}
