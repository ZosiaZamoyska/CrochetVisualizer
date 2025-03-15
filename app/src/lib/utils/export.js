import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function exportPatternToPDF(instructions) {
  let fileName = 'crochet-pattern';
  const fileNameInstruction = instructions.find(item => item.type === 'fileName');
  if (fileNameInstruction) {
    fileName = fileNameInstruction.fileName;
  }

  console.log('instructions_export', instructions);

  const doc = new jsPDF();
  const startY = 20;
  const maxPageHeight = 270;
  const columnX = [20, 110]; // Left and right column positions
  const columnWidth = 80;

  doc.setFontSize(20);
  doc.text('Crochet Pattern', columnX[0], startY);
  let currentY = [startY + 15, startY + 15]; // Separate y positions per column

  // Determine split point for left and right columns
  const midPoint = Math.ceil(3*instructions.length / 4);
  const leftColumnItems = instructions.slice(0, midPoint);
  const rightColumnItems = instructions.slice(midPoint);

  async function processColumn(items, colIndex) {
    for (const item of items) {
      let xPos = columnX[colIndex];

      if (currentY[colIndex] > maxPageHeight) {
        doc.addPage();
        currentY = [startY, startY]; // Reset column heights
      }

      if (item.type === 'color') {
        doc.setFontSize(14);
        doc.setTextColor('#000000');
        doc.text('Yarn color: ', xPos, currentY[colIndex]);
        const prefixWidth = doc.getTextWidth('Yarn color: ');
        doc.setTextColor(item.color);
        doc.text(item.colorName, xPos + prefixWidth, currentY[colIndex]);
        doc.setTextColor('#000000');
        currentY[colIndex] += 12;
      } 

      else if (item.type === 'pattern') {
        doc.setFontSize(14);
        doc.text(item.name, xPos, currentY[colIndex]);
        currentY[colIndex] += 8;
        doc.setFontSize(12);

        if (item.preview) {
          const img = new Image();
          img.src = item.preview;
          await new Promise((resolve) => {
            img.onload = function () {
              const imgWidth = Math.min(img.naturalWidth, 60);
              const imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;

              if (currentY[colIndex] + imgHeight > maxPageHeight) {
                doc.addPage();
                currentY = [startY, startY];
              }

              doc.addImage(img.src, 'PNG', xPos, currentY[colIndex], imgWidth, imgHeight);
              currentY[colIndex] += imgHeight + 5;
              resolve();
            };
          });
        }

        const patternLines = doc.splitTextToSize(item.formattedPattern, columnWidth);
        doc.text(patternLines, xPos, currentY[colIndex]);
        currentY[colIndex] += patternLines.length * 7 + 5;
      } 

      else if (item.type === 'text') {
        doc.setFontSize(14);
        const splitText = doc.splitTextToSize(item.content, columnWidth);
        doc.text(splitText, xPos, currentY[colIndex]);
        currentY[colIndex] += splitText.length * 7 + 5;
      } 

      else if (item.type === 'image' && item.imageUrl) {
        const img = new Image();
        img.src = item.imageUrl;
        await new Promise((resolve) => {
          img.onload = function () {
            const imgWidth = Math.min(img.naturalWidth, 80);
            const imgHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;

            if (currentY[colIndex] + imgHeight > maxPageHeight) {
              doc.addPage();
              currentY = [startY, startY];
            }

            doc.addImage(img.src, 'PNG', xPos, currentY[colIndex], imgWidth, imgHeight);
            currentY[colIndex] += imgHeight + 5;
            resolve();
          };
        });
      }
    }
  }

  // Process columns in order
  await processColumn(leftColumnItems, 0);
  await processColumn(rightColumnItems, 1);

  doc.save(`${fileName}.pdf`);
}
