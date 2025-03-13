import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function exportPatternToPDF(instructions) {
  // Get filename from instructions if it exists
  let fileName = 'crochet-pattern';
  const fileNameInstruction = instructions.find(item => item.type === 'fileName');
  if (fileNameInstruction) {
    fileName = fileNameInstruction.fileName;
  }

  const doc = new jsPDF();
  let startY = 20;
  let currentY = [startY, startY];
  let currentColumn = 0;

  // Collect all image loading promises and their metadata first
  const contentQueue = [];
  const imagePromises = [];

  doc.setFontSize(20);
  contentQueue.push({
    type: 'title',
    fn: () => {
      doc.text('Crochet Pattern', 20, startY);
      currentY = [startY + 15, startY + 15];
    }
  });

  for (let i = 0; i < instructions.length; i++) {
    const item = instructions[i];
    const initialColumn = currentColumn; // Store current column state

    if (item.type === 'pattern') {
      // Queue pattern name
      contentQueue.push({
        type: 'name',
        column: initialColumn,
        fn: () => {
          const columnX = initialColumn === 0 ? 20 : 110;
          doc.setFontSize(14);
          doc.text(item.name, columnX, currentY[initialColumn]);
          currentY[initialColumn] += 8;
          doc.setFontSize(12);
        }
      });

      // Handle pattern preview image
      if (item.preview) {
        const imagePromise = new Promise((resolve) => {
          const img = new Image();
          img.src = item.preview;

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

            resolve({
              src: img.src,
              width: imgWidth,
              height: imgHeight,
              column: initialColumn,
              x: initialColumn === 0 ? 20 : 110
            });
          };

          img.onerror = function () {
            console.error('Failed to load image');
            resolve(null);
          };
        });

        imagePromises.push(imagePromise);
        contentQueue.push({
          type: 'image',
          column: initialColumn,
          fn: async (imageData) => {
            if (imageData) {
              if (currentY[imageData.column] + imageData.height > 270) {
                if (currentColumn === 0) {
                  currentColumn = 1;
                  currentY[1] = startY;
                } else {
                  currentColumn = 0;
                  doc.addPage();
                  currentY = [startY, startY];
                }
              }
              doc.addImage(imageData.src, 'PNG', imageData.x, currentY[imageData.column], imageData.width, imageData.height);
              currentY[imageData.column] += imageData.height + 5;
            }
          }
        });
      }

      // Queue pattern instructions
      contentQueue.push({
        type: 'pattern',
        column: initialColumn,
        fn: () => {
          const columnX = initialColumn === 0 ? 20 : 110;
          const maxWidth = 80;
          const patternLines = item.formattedPattern.split('\n');
          patternLines.forEach(line => {
            const splitLines = doc.splitTextToSize(line, maxWidth);
            doc.text(splitLines, columnX, currentY[initialColumn]);
            currentY[initialColumn] += splitLines.length * 7;
          });
        }
      });

      // Add spacing and move to next column/page
      contentQueue.push({
        type: 'spacing',
        fn: () => {
          currentY[currentColumn] += 5;
          if (currentColumn === 0) {
            currentColumn = 1;
          } else {
            currentColumn = 0;
            doc.addPage();
            currentY = [startY, startY];
          }
        }
      });

    } else if (item.type === 'text') {
      contentQueue.push({
        type: 'text',
        column: initialColumn,
        fn: () => {
          const columnX = initialColumn === 0 ? 20 : 110;
          const maxWidth = 80;
          const splitText = doc.splitTextToSize(item.content, maxWidth);
          const textHeight = splitText.length * 7 + 5;

          if (currentY[initialColumn] + textHeight > 270) {
            if (currentColumn === 0) {
              currentColumn = 1;
              currentY[1] = startY;
            } else {
              currentColumn = 0;
              doc.addPage();
              currentY = [startY, startY];
            }
          }

          doc.text(splitText, columnX, currentY[initialColumn]);
          currentY[initialColumn] += textHeight;
        }
      });
    } else if (item.type === 'color') {
      contentQueue.push({
        type: 'color',
        column: initialColumn,
        fn: () => {
          const columnX = initialColumn === 0 ? 20 : 110;
          const maxWidth = 80;
          
          // Add color name in the selected color
          doc.setTextColor(item.color);
          const splitText = doc.splitTextToSize(`Yarn color: ${item.colorName}`, maxWidth);
          doc.text(splitText, columnX, currentY[initialColumn]);
          
          // Reset text color to black
          doc.setTextColor('#000000');
          
          currentY[initialColumn] += splitText.length * 7 + 5;
        }
      });
    }
  }

  // Wait for all images to load
  const imageResults = await Promise.all(imagePromises);

  // Generate PDF content
  let imageIndex = 0;
  for (const item of contentQueue) {
    if (item.fn.length > 0) { // If function expects parameter (image data)
      await item.fn(imageResults[imageIndex++]);
    } else {
      item.fn();
    }
  }

  // Save PDF
  doc.save(`${fileName}.pdf`);
}
