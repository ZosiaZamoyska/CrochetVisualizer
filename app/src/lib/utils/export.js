import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function exportPatternToPDF(patternData) {
  const doc = new jsPDF();
  let startY = 20;
  let currentY = [startY, startY]; // Separate Y positions for left and right columns

  doc.setFontSize(20);
  doc.text('Crochet Pattern', 20, startY);
  currentY = [startY + 15, startY + 15]; // Update start after title

  const patternsPerPage = 2;
  const totalPages = Math.ceil(patternData.patterns.length / patternsPerPage);

  const imagePromises = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {

    for (let colIndex = 0; colIndex < patternsPerPage; colIndex++) {
      const patternIndex = pageIndex * patternsPerPage + colIndex;
      if (patternIndex >= patternData.patterns.length) break;

      const pattern = patternData.patterns[patternIndex];
      const columnX = colIndex === 0 ? 20 : 110;

      // Add pattern name
      doc.setFontSize(14);
      doc.text(`${patternIndex + 1}. ${pattern.name}`, columnX, currentY[colIndex]);
      currentY[colIndex] += 8;
      doc.setFontSize(12);

      // Handle image loading as Promise
      if (pattern.preview) {
        const imagePromise = new Promise((resolve) => {
          const img = new Image();
          img.src = pattern.preview;

          img.onload = function () {
            const imgNaturalWidth = img.naturalWidth;
            const imgNaturalHeight = img.naturalHeight;

            const maxWidth = 60;
            let imgWidth = imgNaturalWidth;
            let imgHeight = imgNaturalHeight;

            if (imgWidth > maxWidth) {
              const scale = maxWidth / imgWidth;
              imgWidth *= scale;
              imgHeight *= scale;
            }

            // Add image to PDF
            doc.addImage(img.src, 'PNG', columnX, currentY[colIndex], imgWidth, imgHeight);
            currentY[colIndex] += imgHeight + 5; // Move down after image

            resolve(); // Signal done
          };

          img.onerror = function () {
            console.error('Failed to load image');
            currentY[colIndex] += 5;
            resolve(); // Continue anyway
          };
        });

        imagePromises.push(imagePromise);
      }

      // Add pattern text
      if (pattern.grid) {
        const maxWidth = 80;
        const patternLines = pattern.grid.formattedPattern.split('\n');
        patternLines.forEach(line => {
          const splitLines = doc.splitTextToSize(line, maxWidth);
          doc.text(splitLines, columnX, currentY[colIndex]);
          currentY[colIndex] += splitLines.length * 7;
        });
      }

      // Add spacing between patterns
      currentY[colIndex] += 5;
    }

    // Add new page if necessary (simplest way: when either column is close to bottom)
    if (pageIndex < totalPages - 1) {
      doc.addPage();
      currentY = [startY, startY]; // Reset for new page
    }
  }

  // Add instructions section on new page if needed
  const maxY = Math.max(currentY[0], currentY[1]); // Find which column is lower
  if (patternData.instructions && patternData.instructions.length > 0) {
    let instructionsY = maxY + 10;
    if (instructionsY > 250) {
      doc.addPage();
      instructionsY = 20;
    }

    doc.setFontSize(16);
    doc.text('Instructions', 20, instructionsY);
    instructionsY += 10;
    doc.setFontSize(12);

    patternData.instructions.forEach((instruction, index) => {
      const splitInstruction = doc.splitTextToSize(`${index + 1}. ${instruction}`, 170);
      doc.text(splitInstruction, 20, instructionsY);
      instructionsY += splitInstruction.length * 7;

      if (instructionsY > 270) {
        doc.addPage();
        instructionsY = 20;
      }
    });
  }

  // Wait for all images to load
  await Promise.all(imagePromises);

  // Save PDF
  doc.save('crochet-pattern.pdf');
}
