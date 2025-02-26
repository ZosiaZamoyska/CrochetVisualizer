<script>
  import { onMount } from 'svelte';
    import { draw } from 'svelte/transition';

    let patternInput = "";
  
  // Predefined crochet patterns
  const patterns = {
    "Basic Chain": "ch ch ch ch ch ch ch ch",
    "Single Crochet Row": "ch ch ch ch ch ch ch ch sc sc sc sc sc sc sc",
    "Normal Wave": "ch ch ch ch ch ch sc dc sc dc sc ch sc sc sc sc sc ch sc sc sc sc sc ch sc sc sc sc sc",
    "Exaggerated Wave": "ch ch ch ch ch ch sc dc sc dc sc ch sc dc sc dc sc ch sc dc sc dc sc ch sc dc sc dc sc",
    "Up-Down Wave": "ch ch ch ch ch ch sc dc sc dc sc ch dc sc dc sc dc ch sc dc sc dc sc ch dc sc dc sc dc",
    "Random": "ch ch ch ch dc sc sc sc sc ch sc sc ch sc sc sc"
  };

  // Function to update patternInput and parse the pattern
  function selectPattern(event) {
    patternInput = event.target.value;
    parsePattern(patternInput);
  }

  let grid = [];
  let p5Instance = null;
  let currentStep = 1;
  let isPlaying = false;
  let stitchesDone = patternInput.split(" ").length;;
  let interval;

  function playPattern() {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    isPlaying = true;
    currentStep = 2;

    interval = setInterval(() => {
      if (currentStep <= patternInput.length) {
        let partialPattern = patternInput.substring(0, currentStep);
        stitchesDone = partialPattern.split(" ").length;
        parsePattern(patternInput);
        currentStep+=3;
      } else {
        stopPlayback();
      }
    }, 700);
  }
  function stopPlayback() {
    clearInterval(interval);
    isPlaying = false;
  }
  
  function parsePattern(input) {
    let stitches = input.split(" ");
    let tempGrid = [];
    let row = [];
    
    let rowIndex = 0;
    let base = true;
    let chainCount = 0;

    for (let i = 0; i < stitches.length; i++) {
        let stitch = stitches[i];
        
        if (stitch === "ch") {
            if (base) {
                row.push(stitch);
            } else {
                if (row.length > 0) {
                    chainCount++;
                    row.push(stitch);
                }
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
            else if (chainCount == 1)
            {
              tempGrid.push(row);
              rowIndex++;
              row.pop();
              row = [];
            }
            chainCount = 0;
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

    grid = normalizedGrid;//.reverse();
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
          let positions_null = [];
          grid.forEach((row, rowIndex) => {
            let positions_null_row = [];

            row.forEach((stitch, colIndex) => {
              if (stitch) {
                let xPos = xStart + colIndex * (stitchSize + spacing);
                let yPos = yStart + rowIndex * (stitchSize + spacing);
                if (rowIndex !== 0)
                {              
                  xPos = positions_null[rowIndex - 1][colIndex].x;// + stitchSize + spacing;//xStart + colIndex * (stitchSize + spacing);
                  yPos = positions_null[rowIndex - 1][colIndex].y + stitchSize + spacing;//yStart + rowIndex * (stitchSize + spacing);
                  if (stitch == 'dc')
                  {
                    yPos += spacing/2;
                  }
                }
                
                //positions_tmp.push({ x: xPos, y: yPos, stitch });
                positions_null_row.push({ x: xPos, y: yPos, stitch });
              }
              else
              {
                let xPos = xStart + colIndex * (stitchSize + spacing);
                let yPos = yStart + rowIndex * (stitchSize + spacing);
                positions_null_row.push({ x: xPos, y: yPos, stitch})
              }
            });
            positions = positions_null_row.concat(positions);
            positions_null.push(positions_null_row);
          });

          function drawArrow(p1, p2, curved, dir) {
            p.stroke(0);
            p.strokeWeight(2);

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

                p.line(x1, y1, x2, y2);
                p.line(stopX, stopY, arrowX1, arrowY1);
                p.line(stopX, stopY, arrowX2, arrowY2);
            } else {
                let controlX1 = x1 + dir * (stitchSize + spacing) / 2;
                let controlY1 = y1;
                let controlX2 = x2 + dir * (stitchSize + spacing) / 2;
                let controlY2 = y2;

                p.bezier(x1, y1, controlX1, controlY1, controlX2, controlY2, x2, y2);

                let t = 0.74;
                let bx = p.bezierPoint(x1, controlX1, controlX2, x2, t);
                let by = p.bezierPoint(y1, controlY1, controlY2, y2, t);
                let bxTangent = p.bezierTangent(x1, controlX1, controlX2, x2, t);
                let byTangent = p.bezierTangent(y1, controlY1, controlY2, y2, t);
                let tangentAngle = Math.atan2(byTangent, bxTangent);

                let arrowX1 = bx - arrowSize * Math.cos(tangentAngle - Math.PI / 6);
                let arrowY1 = by - arrowSize * Math.sin(tangentAngle - Math.PI / 6);
                let arrowX2 = bx - arrowSize * Math.cos(tangentAngle + Math.PI / 6);
                let arrowY2 = by - arrowSize * Math.sin(tangentAngle + Math.PI / 6);

                p.line(bx, by, arrowX1, arrowY1);
                p.line(bx, by, arrowX2, arrowY2);
            }
          }

          // turns
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
                  p.fill(0, 200, 0);
          
                  p.noStroke();
                  if (stitch === 'ch')
                  {
                    p.fill(0, 220, 0);
                  }
                  if (stitch === 'dc')
                  { 
                    p.fill(0, 170, 0);

                  }
                  if (count >= stitchesDone && isPlaying)
                    p.fill(180);
                  p.ellipse(x, y, ovalSize, ovalSize);

                  p.noStroke();
                  p.fill(255);
                  p.text(stitch, x, y);
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
                  p.fill(0, 200, 0);
                  
                  p.noStroke();
                  if (stitch === 'ch')
                  {
                    p.fill(0, 220, 0);
                  }
                  if (stitch == 'dc')
                  { 
                    p.fill(0, 170, 0);

                  }
                  if (count >= stitchesDone && isPlaying)
                    p.fill(180);
                  p.ellipse(x, y, ovalSize, ovalSize);

                  p.noStroke();
                  p.fill(255);
                  p.text(stitch, x, y);
                }
              }
            }
          }
          
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
    <select on:change={selectPattern}>
      <option value="" disabled selected>Select a design</option>
      {#each Object.keys(patterns) as design}
        <option value={patterns[design]}>{design}</option>
      {/each}
    </select>
    <button on:click={playPattern}>{isPlaying ? "Stop" : "Play"}</button>
    <br>
    <br>
    <input type="text" bind:value={patternInput} on:input={() => parsePattern(patternInput.trim())} placeholder="Enter crochet pattern">
  </div>
  
  
  <div class="grid-container" id="p5-container"></div>
</div>