declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: any);
    on(event: string, callback: (data: any) => void): void;
    end(): void;
    page: { width: number; height: number };
    y: number;
    fontSize(size: number): PDFDocument;
    font(name: string): PDFDocument;
    text(text: string, x?: number | any, y?: number, options?: any): PDFDocument;
    moveDown(lines?: number): PDFDocument;
    rect(x: number, y: number, width: number, height: number): PDFDocument;
    stroke(): PDFDocument;
    addPage(options?: any): PDFDocument;
    [key: string]: any;
  }

  export = PDFDocument;
}
