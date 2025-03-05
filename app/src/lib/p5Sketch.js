import { draw } from 'svelte/transition';

export function createP5Instance(p5, grid, stitchesDone, isPlaying) {
    let positions = [];
    let positions_null = [];

    p5.setup = () => {
      p5.createCanvas(600, 400);
    };
    
    p5.draw = () => {
      p5.background(255);
      p5.textSize(14);
      p5.textAlign(p5.CENTER, p5.CENTER);
  
      const xStart = 50;
      const yStart = 50;
      const stitchSize = 30;
      const spacing = 15;
      const ovalSize = 30;
  
      grid.forEach((row, rowIndex) => {
        let positions_null_row = [];
        row.forEach((stitch, colIndex) => {
          if (stitch) {
            let xPos = xStart + colIndex * (stitchSize + spacing);
            let yPos = yStart + rowIndex * (stitchSize + spacing);
            if (rowIndex !== 0) {
              xPos = positions_null[rowIndex - 1][colIndex].x;
              yPos = positions_null[rowIndex - 1][colIndex].y + stitchSize + spacing;
              if (stitch === 'dc') {
                yPos += spacing / 2;
              }
            }
            positions_null_row.push({ x: xPos, y: yPos, stitch });
          } else {
            let xPos = xStart + colIndex * (stitchSize + spacing);
            let yPos = yStart + rowIndex * (stitchSize + spacing);
            positions_null_row.push({ x: xPos, y: yPos, stitch });
          }
        });
        positions = positions_null_row.concat(positions);
        positions_null.push(positions_null_row);
      });
  
      function drawArrow(p1, p2, curved, dir) {
        p5.stroke(0);
        p5.strokeWeight(2);
  
        let { x: x1, y: y1 } = p1;
        let { x: x2, y: y2 } = p2;
        let arrowSize = 5;
  
        if (!curved) {
          let angle = Math.atan2(y2 - y1, x2 - x1);
          let stopX = x2 - spacing * Math.cos(angle);
          let stopY = y2 - spacing * Math.sin(angle);
  
          let arrowX1 = stopX - arrowSize * Math.cos(angle - Math.PI / 6);
          let arrowY1 = stopY - arrowSize * Math.sin(angle - Math.PI / 6);
          let arrowX2 = stopX - arrowSize * Math.cos(angle + Math.PI / 6);
          let arrowY2 = stopY - arrowSize * Math.sin(angle + Math.PI / 6);
  
          p5.line(x1, y1, x2, y2);
          p5.line(stopX, stopY, arrowX1, arrowY1);
          p5.line(stopX, stopY, arrowX2, arrowY2);
        } else {
          let controlX1 = x1 + dir * (stitchSize + spacing) / 2;
          let controlY1 = y1;
          let controlX2 = x2 + dir * (stitchSize + spacing) / 2;
          let controlY2 = y2;
  
          p5.bezier(x1, y1, controlX1, controlY1, controlX2, controlY2, x2, y2);
  
          let t = 0.74;
          let bx = p5.bezierPoint(x1, controlX1, controlX2, x2, t);
          let by = p5.bezierPoint(y1, controlY1, controlY2, y2, t);
          let bxTangent = p5.bezierTangent(x1, controlX1, controlX2, x2, t);
          let byTangent = p5.bezierTangent(y1, controlY1, controlY2, y2, t);
          let tangentAngle = Math.atan2(byTangent, bxTangent);
  
          let arrowX1 = bx - arrowSize * Math.cos(tangentAngle - Math.PI / 6);
          let arrowY1 = by - arrowSize * Math.sin(tangentAngle - Math.PI / 6);
          let arrowX2 = bx - arrowSize * Math.cos(tangentAngle + Math.PI / 6);
          let arrowY2 = by - arrowSize * Math.sin(tangentAngle + Math.PI / 6);
  
          p5.line(bx, by, arrowX1, arrowY1);
          p5.line(bx, by, arrowX2, arrowY2);
        }
      }
  
      for (let rowIndex = 0; rowIndex < grid.length -1; rowIndex++) {
        let dir = 1;
        let lastColIndex = 0;
        if (rowIndex % 2 === 0) {
          lastColIndex = grid[rowIndex].length - 1;
          while (lastColIndex >= 0 && grid[rowIndex][lastColIndex] === null) {
            lastColIndex--;
          }
        }
        else
        {
          lastColIndex = 0;
          dir = -1;
          while (lastColIndex >= 0 && grid[rowIndex][lastColIndex] === null) {
            lastColIndex++;
          }

        }
        if (lastColIndex >= 0) {
          let x1 = positions_null[rowIndex][lastColIndex].x;
          let y1 = positions_null[rowIndex][lastColIndex].y;
          let x2 = positions_null[rowIndex+1][lastColIndex].x;
          let y2 = positions_null[rowIndex+1][lastColIndex].y;
          drawArrow({x: x1, y: y1}, {x: x2, y: y2}, 1, dir);
        }
      }

      // Horizontal arrows (same row)
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
        for (let colIndex = 1; colIndex < grid[rowIndex].length; colIndex++) {
          if (grid[rowIndex][colIndex] && grid[rowIndex][colIndex - 1]) {
            let x1 = positions_null[rowIndex][colIndex].x;
            let y1 = positions_null[rowIndex][colIndex].y;
            let x2 = positions_null[rowIndex][colIndex - 1].x;
            let y2 = positions_null[rowIndex][colIndex - 1].y;

            if (rowIndex % 2 === 1)
            {
              drawArrow({x: x1, y: y1}, {x: x2, y: y2}, false, 1);
            }
            else
            {
              drawArrow({x: x2, y: y2}, {x: x1, y: y1}, false, 1);
            }
          }
        }
      }

      // Vertical lines (same column)
      for (let rowIndex = 1; rowIndex < grid.length; rowIndex++) {
        for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
          if (grid[rowIndex][colIndex] && grid[rowIndex - 1][colIndex] && grid[rowIndex][colIndex] != 'ch') {
            let x1 = positions_null[rowIndex][colIndex].x;
            let y1 = positions_null[rowIndex][colIndex].y;
            let x2 = positions_null[rowIndex - 1][colIndex].x;
            let y2 = positions_null[rowIndex - 1][colIndex].y;

            drawArrow({x: x1, y: y1}, {x: x2, y: y2}, false, 1);
          }
        }
      }

      // Draw stitches
      let count = 0;
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex++)
      {
        if (rowIndex%2 == 0)
        {
          for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++)
          {
            if (positions_null[rowIndex][colIndex].stitch)
            {
              let x = positions_null[rowIndex][colIndex].x;
              let y = positions_null[rowIndex][colIndex].y;
              let stitch = positions_null[rowIndex][colIndex].stitch;
              count += 1;
              p5.fill(0, 200, 0);
      
              p5.noStroke();
              if (stitch === 'ch')
              {
                p5.fill(0, 220, 0);
              }
              if (stitch === 'dc')
              { 
                p5.fill(0, 170, 0);

              }
              if (count >= stitchesDone && isPlaying)
                p5.fill(180);
              p5.ellipse(x, y, ovalSize, ovalSize);

              p5.noStroke();
              p5.fill(255);
              p5.text(stitch, x, y);
            }

          }
        }
        else
        {
          for (let colIndex = grid[rowIndex].length-1; colIndex >=0; colIndex--)
          {
            if (positions_null[rowIndex][colIndex].stitch)
            {
              let x = positions_null[rowIndex][colIndex].x;
              let y = positions_null[rowIndex][colIndex].y;
              let stitch = positions_null[rowIndex][colIndex].stitch;

              count += 1;
              p5.fill(0, 200, 0);
              
              p5.noStroke();
              if (stitch === 'ch')
              {
                p5.fill(0, 220, 0);
              }
              if (stitch == 'dc')
              { 
                p5.fill(0, 170, 0);

              }
              if (count >= stitchesDone && isPlaying)
                p5.fill(180);
              p5.ellipse(x, y, ovalSize, ovalSize);

              p5.noStroke();
              p5.fill(255);
              p5.text(stitch, x, y);
            }
          }
        }
      }
    };
  }