// types/html2pdf.d.ts
declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: { type: 'jpeg' | 'png' | 'webp'; quality: number }
    html2canvas?: {
      scale?: number
      useCORS?: boolean
      letterRendering?: boolean
      logging?: boolean
    }
    jsPDF?: {
      unit?: string
      format?: string | number[]
      orientation?: 'portrait' | 'landscape'
    }
    pagebreak?: {
      mode?: string | string[]
      before?: string | string[]
      after?: string | string[]
      avoid?: string | string[]
    }
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf
    from(element: HTMLElement | string): Html2Pdf
    save(): Promise<void>
    outputPdf(type: 'blob' | 'datauristring' | 'arraybuffer'): Promise<Blob | string | ArrayBuffer>
    output(type: string, options?: any): Promise<any>
  }

  function html2pdf(): Html2Pdf
  export default html2pdf
}