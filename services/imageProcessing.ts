
import { TextBlock } from '../types';

export const maskTextRegions = (dataUrl: string, blocks: TextBlock[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);

      const includedBlocks = blocks.filter(b => b.included);

      // Helper to safely get pixel data with boundary clamping
      const getPixel = (x: number, y: number) => {
        const cx = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
        const cy = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
        const p = ctx.getImageData(cx, cy, 1, 1).data;
        return { r: p[0], g: p[1], b: p[2] };
      };

      includedBlocks.forEach(block => {
        // 1. Convert normalized 0-1000 coordinates to pixels
        let ymin = (block.box_2d[0] / 1000) * canvas.height;
        let xmin = (block.box_2d[1] / 1000) * canvas.width;
        let ymax = (block.box_2d[2] / 1000) * canvas.height;
        let xmax = (block.box_2d[3] / 1000) * canvas.width;

        const boxHeight = ymax - ymin;
        const boxWidth = xmax - xmin;

        // 2. Adaptive Expansion Strategy
        // - Min 5px: Covers minimal anti-aliasing/glow.
        // - Max 15px: Prevents holes from getting too large.
        const EXPANSION_PX = Math.min(15, Math.max(5, boxHeight * 0.1));

        ymin = Math.max(0, ymin - EXPANSION_PX);
        xmin = Math.max(0, xmin - EXPANSION_PX);
        ymax = Math.min(canvas.height, ymax + EXPANSION_PX);
        xmax = Math.min(canvas.width, xmax + EXPANSION_PX);

        const w = xmax - xmin;
        const h = ymax - ymin;

        if (w <= 0 || h <= 0) return;

        // 3. Multi-point Sampling & Gradient Detection
        const sampleOffset = 4; // Distance from edge to sample

        // Sample Top Edge (Left, Mid, Right)
        const t1 = getPixel(xmin, ymin - sampleOffset);
        const t2 = getPixel(xmin + w/2, ymin - sampleOffset);
        const t3 = getPixel(xmax, ymin - sampleOffset);
        
        // Sample Bottom Edge
        const b1 = getPixel(xmin, ymax + sampleOffset);
        const b2 = getPixel(xmin + w/2, ymax + sampleOffset);
        const b3 = getPixel(xmax, ymax + sampleOffset);

        // Sample Left Edge
        const l1 = getPixel(xmin - sampleOffset, ymin);
        const l2 = getPixel(xmin - sampleOffset, ymin + h/2);
        const l3 = getPixel(xmin - sampleOffset, ymax);

        // Sample Right Edge
        const r1 = getPixel(xmax + sampleOffset, ymin);
        const r2 = getPixel(xmax + sampleOffset, ymin + h/2);
        const r3 = getPixel(xmax + sampleOffset, ymax);

        // Calculate Averages for each side
        const avgTop = { 
          r: (t1.r+t2.r+t3.r)/3, g: (t1.g+t2.g+t3.g)/3, b: (t1.b+t2.b+t3.b)/3 
        };
        const avgBottom = { 
          r: (b1.r+b2.r+b3.r)/3, g: (b1.g+b2.g+b3.g)/3, b: (b1.b+b2.b+b3.b)/3 
        };
        const avgLeft = { 
          r: (l1.r+l2.r+l3.r)/3, g: (l1.g+l2.g+l3.g)/3, b: (l1.b+l2.b+l3.b)/3 
        };
        const avgRight = { 
          r: (r1.r+r2.r+r3.r)/3, g: (r1.g+r2.g+r3.g)/3, b: (r1.b+r2.b+r3.b)/3 
        };

        // Determine if Vertical or Horizontal Gradient
        // Calculate difference (Manhattan distance) between Top and Bottom average colors
        const vDiff = Math.abs(avgTop.r - avgBottom.r) + Math.abs(avgTop.g - avgBottom.g) + Math.abs(avgTop.b - avgBottom.b);
        // Calculate difference between Left and Right average colors
        const hDiff = Math.abs(avgLeft.r - avgRight.r) + Math.abs(avgLeft.g - avgRight.g) + Math.abs(avgLeft.b - avgRight.b);

        const threshold = 40; // Color difference threshold to trigger gradient mode

        // Calculate global average for Shadow Color (Edge Softening)
        const avgAll = {
          r: (avgTop.r + avgBottom.r + avgLeft.r + avgRight.r)/4,
          g: (avgTop.g + avgBottom.g + avgLeft.g + avgRight.g)/4,
          b: (avgTop.b + avgBottom.b + avgLeft.b + avgRight.b)/4
        };

        // 4. Edge Softening (Feathering)
        // Dynamic blur radius: smaller boxes get less blur to preserve structure
        ctx.shadowBlur = Math.min(20, Math.max(10, Math.min(w, h) * 0.25)); 
        ctx.shadowColor = `rgb(${avgAll.r},${avgAll.g},${avgAll.b})`;
        // To prevent shadow from being too transparent if average color is light, we can enforce full opacity in rgb string
        // but standard rgb() is already full opacity.

        // 5. Fill Strategy
        if (vDiff > hDiff && vDiff > threshold) {
          // Vertical Gradient (Top to Bottom)
          const grd = ctx.createLinearGradient(xmin, ymin, xmin, ymax);
          grd.addColorStop(0, `rgb(${avgTop.r},${avgTop.g},${avgTop.b})`);
          grd.addColorStop(1, `rgb(${avgBottom.r},${avgBottom.g},${avgBottom.b})`);
          ctx.fillStyle = grd;
        } else if (hDiff > vDiff && hDiff > threshold) {
          // Horizontal Gradient (Left to Right)
          const grd = ctx.createLinearGradient(xmin, ymin, xmax, ymin);
          grd.addColorStop(0, `rgb(${avgLeft.r},${avgLeft.g},${avgLeft.b})`);
          grd.addColorStop(1, `rgb(${avgRight.r},${avgRight.g},${avgRight.b})`);
          ctx.fillStyle = grd;
        } else {
          // Solid Color (Average of all 4 sides)
          ctx.fillStyle = `rgb(${avgAll.r},${avgAll.g},${avgAll.b})`;
        }

        // Apply Fill
        ctx.fillRect(xmin, ymin, w, h);
        
        // Reset Shadow for next iteration to avoid polluting state
        ctx.shadowBlur = 0;
      });

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};
