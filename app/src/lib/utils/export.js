import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function exportPatternToPDF(instructions) {
  const doc = new jsPDF();
  let startY = 20;
  let currentY = [startY, startY]; // Separate Y positions for left and right columns

  doc.setFontSize(20);
  doc.text('Crochet Pattern', 20, startY);
  currentY = [startY + 15, startY + 15]; // Update start after title

  const patternsPerPage = 2;
  const patterns = instructions.filter(item => item.type === 'pattern');
  const totalPages = Math.ceil(patterns.length / patternsPerPage);

  const imagePromises = [];

  // First, handle pattern nodes
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    for (let colIndex = 0; colIndex < patternsPerPage; colIndex++) {
      const patternIndex = pageIndex * patternsPerPage + colIndex;
      if (patternIndex >= patterns.length) break;

      const pattern = patterns[patternIndex];
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

            resolve();
          };

          img.onerror = function () {
            console.error('Failed to load image');
            currentY[colIndex] += 5;
            resolve();
          };
        });

        imagePromises.push(imagePromise);
      }

      // Add pattern instructions
      if (pattern.formattedPattern) {
        const maxWidth = 80;
        const patternLines = pattern.formattedPattern.split('\n');
        patternLines.forEach(line => {
          const splitLines = doc.splitTextToSize(line, maxWidth);
          doc.text(splitLines, columnX, currentY[colIndex]);
          currentY[colIndex] += splitLines.length * 7;
        });
      }

      // Add spacing between patterns
      currentY[colIndex] += 5;
    }

    // Add new page if necessary
    if (pageIndex < totalPages - 1) {
      doc.addPage();
      currentY = [startY, startY]; // Reset for new page
    }
  }

  // Add text instructions section on new page
  const textInstructions = instructions.filter(item => item.type === 'text');
  if (textInstructions.length > 0) {
    doc.addPage();
    let instructionsY = 20;

    doc.setFontSize(16);
    doc.text('Additional Instructions', 20, instructionsY);
    instructionsY += 10;
    doc.setFontSize(12);

    // Process all text instructions in sequence
    textInstructions.forEach((instruction, index) => {
      // Check if we need a new page
      if (instructionsY > 270) {
        doc.addPage();
        instructionsY = 20;
      }

      // Split instruction text into lines
      const splitInstruction = doc.splitTextToSize(`${index + 1}. ${instruction.content}`, 170);
      doc.text(splitInstruction, 20, instructionsY);
      instructionsY += splitInstruction.length * 7;
    });
  }

  // Wait for all images to load
  await Promise.all(imagePromises);

  // Save PDF
  doc.save('crochet-pattern.pdf');
}
