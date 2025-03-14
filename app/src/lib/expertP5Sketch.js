import { draw } from 'svelte/transition';

export function createExpertP5Instance(p5, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches) {
    let positions = [];
    let positions_null = [];

    p5.setup = () => {
      p5.createCanvas(800, 600);
      p5.background(255);
      //p5.noLoop();
    };
    
    p5.draw = () => {
      p5.clear();
    
      const xStart = 50;
      const yStart = 50;
      const stitchSize = 30;
      const ovalSize = 30;
    
      const totalHeight = (grid.length-1) * (stitchSize + verticalSpacing); // Total grid height
    
      positions = [];
      positions_null = [];
    
      grid.forEach((row, rowIndex) => {
        let positions_null_row = [];
        row.forEach((stitch, colIndex) => {
          let xPos = xStart + colIndex * (stitchSize + horizontalSpacing);
          // Flip Y position: calculate from bottom
          let yPos = yStart + totalHeight - rowIndex * (stitchSize + verticalSpacing);
          if (rowIndex !== 0) {
            xPos = positions_null[rowIndex - 1][colIndex].x;
            yPos = positions_null[rowIndex - 1][colIndex].y - (stitchSize + verticalSpacing); // move upwards
          }
          positions_null_row.push({ x: xPos, y: yPos, stitch });
        });
        positions = positions_null_row.concat(positions); // Stack from bottom up
        positions_null.push(positions_null_row);
      });
    
      // ---- Everything below remains mostly unchanged, but now will use flipped positions ----
    
      function drawArrow(p1, p2, curved, dir) {
        p5.stroke(0);
        p5.strokeWeight(2);
    
        let { x: x1, y: y1 } = p1;
        let { x: x2, y: y2 } = p2;
        let arrowSize = 5;
    
        if (!curved) {
          let angle = Math.atan2(y2 - y1, x2 - x1);
          let stopX = x2 - (stitchSize/2) * Math.cos(angle);
          let stopY = y2 - (stitchSize/2) * Math.sin(angle);
          let arrowX1 = stopX - arrowSize * Math.cos(angle - Math.PI / 6);
          let arrowY1 = stopY - arrowSize * Math.sin(angle - Math.PI / 6);
          let arrowX2 = stopX - arrowSize * Math.cos(angle + Math.PI / 6);
          let arrowY2 = stopY - arrowSize * Math.sin(angle + Math.PI / 6);
    
          p5.line(x1, y1, stopX, stopY);
        } else {
          let controlX1 = x1 + dir * (stitchSize + horizontalSpacing) / 2;
          let controlY1 = y1;
          let controlX2 = x2 + dir * (stitchSize + horizontalSpacing) / 2;
          let controlY2 = y2;
    
          let bx = (controlX1 + controlX2) / 2;
          let by = (controlY1 + controlY2) / 2;
          p5.noFill();
          p5.ellipse(bx, by, 0.2 * ovalSize, 1.2 * ovalSize);
        }
      }
    
      function drawNode(p5, stitch, x, y, size) {
        if (stitch) {
          p5.noFill();
          p5.stroke(0);
          if (stitch !== 'ch')
          {
            drawArrow({ x: x, y: y }, { x: x, y: y + size*1.5  }, false, 1);
          }
          if (stitch === 'ch') {
            p5.ellipse(x, y, size * 1.2, size * 0.2);
          } else if (stitch === 'sc') {
            p5.line(x - 5, y + size / 2, x + 5, y + size / 2);
          } else if (stitch === 'hdc') {
            p5.line(x - 5, y, x + 5, y);
          } else if (stitch === 'dc') {
            p5.line(x - 5, y, x + 5, y);
            p5.line(x - 3, y + size / 3, x + 3, y + 2 * size / 3);
          } else {
            const customStitch = customStitches.find(s => s.name === stitch);
            if (customStitch) {
              p5.fill(customStitch.color);
            } else {
              p5.fill(180);
            }
          }
          if (count >= stitchesDone && isPlaying)
            p5.fill(180);
          p5.fill(0);
          p5.textSize(10);
          p5.textAlign(p5.CENTER, p5.CENTER);
          // Display only the stitch type (without color code)
          const displayStitch = stitch.includes('_') ? stitch.split('_')[0] : stitch;
          p5.text(displayStitch, 0, 0);
        }
      }
    
      // --- Arrow drawing logic ---
      for (let rowIndex = 0; rowIndex < grid.length - 1; rowIndex++) {
        let dir = 1;
        let lastColIndex = 0;
        if (rowIndex % 2 === 0) {
          lastColIndex = grid[rowIndex].length - 1;
          while (lastColIndex >= 0 && grid[rowIndex][lastColIndex] === null) lastColIndex--;
        } else {
          lastColIndex = 0;
          dir = -1;
          while (lastColIndex >= 0 && grid[rowIndex][lastColIndex] === null) lastColIndex++;
        }
        if (lastColIndex >= 0) {
          let x1 = positions_null[rowIndex][lastColIndex].x;
          let y1 = positions_null[rowIndex][lastColIndex].y;
          let x2 = positions_null[rowIndex + 1][lastColIndex].x;
          let y2 = positions_null[rowIndex + 1][lastColIndex].y;
          drawArrow({ x: x1, y: y1 }, { x: x2, y: y2 }, 1, dir);
        }
      }
    
      // --- Vertical column connections ---
      /*for (let rowIndex = 1; rowIndex < grid.length; rowIndex++) {
        for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
          if (grid[rowIndex][colIndex] && grid[rowIndex - 1][colIndex] && grid[rowIndex][colIndex] != 'ch') {
            let x1 = positions_null[rowIndex][colIndex].x;
            let y1 = positions_null[rowIndex][colIndex].y;
            let x2 = positions_null[rowIndex - 1][colIndex].x;
            let y2 = positions_null[rowIndex - 1][colIndex].y;
    
            drawArrow({ x: x1, y: y1 }, { x: x2, y: y2 }, false, 1);
          }
        }
      }*/
    
      // --- Draw stitches in row direction ---
      let count = 0;
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        if (rowIndex % 2 === 0) {
          for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
            count += 1;
            drawNode(p5, positions_null[rowIndex][colIndex].stitch, positions_null[rowIndex][colIndex].x, positions_null[rowIndex][colIndex].y, ovalSize);
          }
        } else {
          for (let colIndex = grid[rowIndex].length - 1; colIndex >= 0; colIndex--) {
            count += 1;
            drawNode(p5, positions_null[rowIndex][colIndex].stitch, positions_null[rowIndex][colIndex].x, positions_null[rowIndex][colIndex].y, ovalSize);
          }
        }
      }
    };
    
}