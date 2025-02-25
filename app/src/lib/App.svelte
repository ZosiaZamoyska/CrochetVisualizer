<script>
  import { onMount } from 'svelte';

  let patternInput = "ch ch ch ch dc sc sc sc sc ch sc sc ch sc sc sc";
  let grid = [];
  let p5Instance = null;
  
  function parsePattern(input) {
    let stitches = input.split(" ");
    let tempGrid = [];
    let row = [];
    
    let rowIndex = 0;
    let base = true;
    
    for (let i = 0; i < stitches.length; i++) {
        let stitch = stitches[i];
        
        if (stitch === "ch") {
            if (base) {
                row.push(stitch);
            } else {
                if (row.length > 0) {
                    tempGrid.push(row);
                    rowIndex++;
                }
                row = [];
            }
        } else {
            if (base) {
                base = false;
                if (row.length > 0) {
                    row.pop();
                }
                tempGrid.push(row);
                rowIndex++;
                row = [];
            }
            row.push(stitch);
        }
    }

    if (row.length > 0) {
        tempGrid.push(row);
    }

    let minCol = 0;
    let maxCol = 0;
    let currentCol = 0;

    for (let i = 0; i < tempGrid.length; i++) {
        let r = tempGrid[i];
        
        if (i % 2 === 0) {
            for (let j = 0; j < r.length; j++) {
                currentCol++;
                maxCol = Math.max(maxCol, currentCol);
            }
        } else {
            for (let j = r.length - 1; j >= 0; j--) {
                currentCol--;
                minCol = Math.min(minCol, currentCol);
            }
        }
    }

    let gridWidth = maxCol - minCol;

    let normalizedGrid = [];
    currentCol = 0;
    let startIdx;
    let lastIdx;
    startIdx = Math.abs(minCol);
    console.log(tempGrid);

    for (let i = 0; i < tempGrid.length; i++) {
        let r = tempGrid[i];
        let paddedRow = new Array(gridWidth + 1).fill(null);

        if (i === 0) {
          for (let j = 0; j < r.length; j++) {
                paddedRow[startIdx + j] = r[j];
                lastIdx = startIdx + j;
            }
        } else {
            if (i %2 === 0)
            {
              startIdx = lastIdx;
              for (let j = 0; j < r.length; j++)
              {
                paddedRow[startIdx + j] = r[j];
                lastIdx = startIdx + j;
              }
            }
            else 
            {
              startIdx = lastIdx;
              for (let j = 0; j < r.length; j++) {
                  paddedRow[startIdx - j] = r[j];
                  lastIdx = startIdx - j;
              }
            }
        }

        normalizedGrid.push(paddedRow);
    }

    grid = normalizedGrid.reverse();
    console.log(grid);
}


  let p5;

  onMount(async () => {
    parsePattern(patternInput);

    if (typeof window !== 'undefined') {
      const module = await import('p5');
      p5 = module.default;

      if (p5Instance) {
        p5Instance.remove();
      }

      p5Instance = new p5(p => {
        p.setup = () => {
          p.createCanvas(600, 400);
        };

        p.draw = () => {
          p.background(255);
          p.textSize(14);
          p.textAlign(p.CENTER, p.CENTER);

          const xStart = 50;
          const yStart = 50;
          const stitchSize = 30;
          const spacing = 15;
          const ovalSize = 30;

          let positions = [];

          grid.forEach((row, rowIndex) => {
            row.forEach((stitch, colIndex) => {
              if (stitch) {
                let xPos = xStart + colIndex * (stitchSize + spacing);
                let yPos = yStart + rowIndex * (stitchSize + spacing);
                positions.push({ x: xPos, y: yPos, stitch });
              }
            });
          });

          // Draw horizontal and vertical lines between neighbors
          p.stroke(0);
          p.strokeWeight(2);

          // Horizontal arrows (same row)
          for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
            for (let colIndex = 0; colIndex < grid[rowIndex].length - 1; colIndex++) {
              if (grid[rowIndex][colIndex] && grid[rowIndex][colIndex + 1]) {
                let x1 = xStart + colIndex * (stitchSize + spacing);
                let y1 = yStart + rowIndex * (stitchSize + spacing);
                let x2 = xStart + (colIndex + 1) * (stitchSize + spacing);
                let y2 = yStart + rowIndex * (stitchSize + spacing);

                p.line(x1, y1, x2, y2);

                let arrowSize = 5;
                let angle = Math.atan2(y2 - y1, x2 - x1);

                // arrows
                if ((grid.length - rowIndex) % 2 === 1)
                {
                  let arrowX1 = x2 - arrowSize * Math.cos(angle - Math.PI / 6) - spacing;
                  let arrowY1 = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
                  let arrowX2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6) - spacing;
                  let arrowY2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);

                  p.line(x2 - spacing, y2, arrowX1, arrowY1);
                  p.line(x2 - spacing, y2, arrowX2, arrowY2);
                }
                else
                {
                  let arrowX1 = x1 + arrowSize * Math.cos(angle - Math.PI / 6) + spacing;
                  let arrowY1 = y1 + arrowSize * Math.sin(angle - Math.PI / 6);
                  let arrowX2 = x1 + arrowSize * Math.cos(angle + Math.PI / 6) + spacing;
                  let arrowY2 = y1 + arrowSize * Math.sin(angle + Math.PI / 6);

                  p.line(arrowX1, arrowY1, x1 + spacing, y1);
                  p.line(arrowX2, arrowY2, x1 + spacing, y1);
                }
              }
            }
          }


          // Vertical lines (same column)
          for (let rowIndex = 0; rowIndex < grid.length - 1; rowIndex++) {
            for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
              if (grid[rowIndex][colIndex] && grid[rowIndex + 1][colIndex]) {
                let x1 = xStart + colIndex * (stitchSize + spacing);
                let y1 = yStart + rowIndex * (stitchSize + spacing);
                let x2 = xStart + colIndex * (stitchSize + spacing);
                let y2 = yStart + (rowIndex + 1) * (stitchSize + spacing);
                p.line(x1, y1, x2, y2);
              }
            }
          }
          // Draw arched lines for turns (end of one row to start of the next)
          for (let rowIndex = 0; rowIndex < grid.length - 1; rowIndex++) {
            // Only apply to even-indexed rows
            if ((grid.length -rowIndex) % 2 === 0) {
              let lastColIndex = grid[rowIndex].length - 1;
              while (lastColIndex >= 0 && grid[rowIndex][lastColIndex] === null) {
                lastColIndex--;
              }

              if (lastColIndex >= 0) {
                // Get the position of the last stitch in the current row
                let x1 = xStart + lastColIndex * (stitchSize + spacing);
                let y1 = yStart + rowIndex * (stitchSize + spacing);

                // Get the position of the stitch directly above in the same column (previous row)
                let x2 = xStart + lastColIndex * (stitchSize + spacing);
                let y2 = yStart + (rowIndex + 1) * (stitchSize + spacing);

                // Control points for Bezier curve (this makes the curve more pronounced)
                let controlX1 = x1 + (stitchSize + spacing) / 2;
                let controlY1 = y1;
                let controlX2 = x2 + (stitchSize + spacing) / 2;
                let controlY2 = y2;

                // Draw the Bezier curve to connect the stitches
                p.bezier(x1, y1, controlX1, controlY1, controlX2, controlY2, x2, y2);
              }
            }
            else
            {
              let lastColIndex = 0;
              while (lastColIndex >= 0 && grid[rowIndex][lastColIndex] === null) {
                lastColIndex++;
              }

              if (lastColIndex >= 0) {
                // Get the position of the last stitch in the current row
                let x1 = xStart + lastColIndex * (stitchSize + spacing);
                let y1 = yStart + rowIndex * (stitchSize + spacing);

                // Get the position of the stitch directly above in the same column (previous row)
                let x2 = xStart + lastColIndex * (stitchSize + spacing);
                let y2 = yStart + (rowIndex + 1) * (stitchSize + spacing);

                // Control points for Bezier curve (this makes the curve more pronounced)
                let controlX1 = x1 - (stitchSize + spacing) / 2;
                let controlY1 = y1;
                let controlX2 = x2 - (stitchSize + spacing) / 2;
                let controlY2 = y2;

                // Draw the Bezier curve to connect the stitches
                p.bezier(x1, y1, controlX1, controlY1, controlX2, controlY2, x2, y2);
              }
            }
          }


          // Draw stitches
          positions.forEach(({ x, y, stitch }) => {
            p.fill(0, 200, 0);
            p.noStroke();
            p.ellipse(x, y, ovalSize, ovalSize);

            p.fill(255);
            p.text(stitch, x, y);
          });
        };

      }, document.getElementById('p5-container'));
    }
  });
</script>


<style>
  .container {
    display: flex;
    justify-content: space-between;
    height: 100vh;
  }
  .input-container {
    flex: 1;
    padding: 20px;
  }
  .grid-container {
    flex: 2;
    padding: 20px;
    overflow: auto;
  }
  input {
    width: 100%;
    font-size: 16px;
    padding: 10px;
    box-sizing: border-box;
    border: 1px solid #ccc;
  }
  #p5-container {
    width: 100%;
    height: 100%;
  }
</style>

<div class="container">
  <div class="input-container">
    <input type="text" bind:value={patternInput} on:change={() => parsePattern(patternInput)} placeholder="Enter crochet pattern">
  </div>
  
  <div class="grid-container" id="p5-container"></div>
</div>
