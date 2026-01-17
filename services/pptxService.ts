import PptxGenJS from "pptxgenjs";
import { PdfPage } from "../types";
import { PPTX_CONFIG } from "../constants";

export const generatePptx = async (pages: PdfPage[], filename: string = "Presentation", layoutValue: string = PPTX_CONFIG.DEFAULT_LAYOUT) => {
  const pptx = new PptxGenJS();
  
  if (pages.length === 0) return;

  const layout = PPTX_CONFIG.LAYOUTS.find(l => l.value === layoutValue) || PPTX_CONFIG.LAYOUTS[0];
  
  const SLIDE_WIDTH_IN = layout.width;
  const SLIDE_HEIGHT_IN = layout.height;

  pptx.defineLayout({ 
      name: 'SELECTED_LAYOUT', 
      width: SLIDE_WIDTH_IN, 
      height: SLIDE_HEIGHT_IN 
  });
  pptx.layout = 'SELECTED_LAYOUT';

  for (const page of pages) {
    const slide = pptx.addSlide();
    
    const bgImage = page.cleanedDataUrl || page.originalDataUrl;
    slide.background = { data: bgImage };

    page.textBlocks.forEach(block => {
        // Skip blocks that are not selected or classified as embedded artwork text
        if (block.included === false || block.type === 'embedded_art_text') return;
        if (!block.box_2d || block.box_2d.length !== 4) return;

        const [ymin, xmin, ymax, xmax] = block.box_2d;
        
        const xInches = (xmin / 1000) * SLIDE_WIDTH_IN;
        const yInches = (ymin / 1000) * SLIDE_HEIGHT_IN;
        const wInches = ((xmax - xmin) / 1000) * SLIDE_WIDTH_IN;
        const hInches = ((ymax - ymin) / 1000) * SLIDE_HEIGHT_IN;

        // FONT SIZE OPTIMIZATION:
        // Use the AI's "font_size" (0-1000) which represents Cap Height relative to slide height.
        // Formula: Points = (AI_Rel_Size / 1000) * Slide_Height_Inches * 72
        let finalFontSize = PPTX_CONFIG.MIN_FONT_SIZE_PT;
        if (block.font_size) {
            const aiFontSizePt = (block.font_size / 1000) * SLIDE_HEIGHT_IN * 72;
            finalFontSize = Math.max(aiFontSizePt, PPTX_CONFIG.MIN_FONT_SIZE_PT);
        } else {
            // Fallback to geometric estimation if font_size is missing
            const boxHeightRel = (ymax - ymin) / 1000;
            finalFontSize = boxHeightRel * SLIDE_HEIGHT_IN * 72 * 0.75;
        }

        let fontColor = PPTX_CONFIG.DEFAULT_COLOR;
        if (block.color) {
            const cleanHex = block.color.replace(/[^0-9A-Fa-f]/g, '');
            if (cleanHex.length === 6 || cleanHex.length === 3) {
                fontColor = cleanHex;
            }
        }

        slide.addText(block.text, {
            x: xInches,
            y: yInches,
            w: wInches,
            h: hInches,
            fontFace: PPTX_CONFIG.DEFAULT_FONT_FACE,
            fontSize: finalFontSize,
            color: fontColor,
            bold: block.is_bold || false,
            italic: block.italic || false,
            align: (block.align as any) || 'left',
            valign: 'top',
            margin: 0
        });
    });
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
};