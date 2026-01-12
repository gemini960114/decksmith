import PptxGenJS from "pptxgenjs";
import { PdfPage } from "../types";
import { PPTX_CONFIG } from "../constants";

export const generatePptx = async (pages: PdfPage[], filename: string = "Presentation") => {
  const pptx = new PptxGenJS();
  
  if (pages.length === 0) return;

  // 1. Calculate Layout based on the first page's aspect ratio
  // This ensures the slide matches the image size/ratio exactly.
  const firstPage = pages[0];
  const aspectRatio = firstPage.width / firstPage.height;
  
  // Set a base width (standard PPT width is 10 inches)
  const SLIDE_WIDTH_IN = PPTX_CONFIG.SLIDE_WIDTH_IN;
  const SLIDE_HEIGHT_IN = SLIDE_WIDTH_IN / aspectRatio;

  // Define and apply custom layout
  pptx.defineLayout({ 
      name: 'CUSTOM_LAYOUT', 
      width: SLIDE_WIDTH_IN, 
      height: SLIDE_HEIGHT_IN 
  });
  pptx.layout = 'CUSTOM_LAYOUT';

  for (const page of pages) {
    const slide = pptx.addSlide();
    
    // Add Background Image (Cleaned version if available)
    const bgImage = page.cleanedDataUrl || page.originalDataUrl;
    slide.background = { data: bgImage };

    page.textBlocks.forEach(block => {
        if (!block.box_2d || block.box_2d.length !== 4) return;

        // Gemini Coordinates: 0-1000
        const [ymin, xmin, ymax, xmax] = block.box_2d;
        
        // Convert 0-1000 coordinates to Slide Inches
        const xInches = (xmin / 1000) * SLIDE_WIDTH_IN;
        const yInches = (ymin / 1000) * SLIDE_HEIGHT_IN;
        const wInches = ((xmax - xmin) / 1000) * SLIDE_WIDTH_IN;
        const hInches = ((ymax - ymin) / 1000) * SLIDE_HEIGHT_IN;

        // Calculate Font Size
        // Gemini returns size relative to 1000 units of height.
        // Formula: (RelativeSize / 1000) * SlideHeightInches * 72 DPI
        // Requirement: Scale to percentage of detected size.
        const relativeSize = block.font_size || 20; // Default fallback if missing
        const rawPoints = (relativeSize / 1000) * SLIDE_HEIGHT_IN * 72;
        const finalFontSize = Math.max(rawPoints * PPTX_CONFIG.FONT_SCALE_FACTOR, PPTX_CONFIG.MIN_FONT_SIZE_PT);

        // Color Processing: Ensure Hex format without #
        let fontColor = PPTX_CONFIG.DEFAULT_COLOR;
        if (block.color) {
            // Remove # if present, and ensure valid hex chars
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
            align: (block.align as any) || 'left',
            valign: 'top',
            margin: 0
        });
    });
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
};
