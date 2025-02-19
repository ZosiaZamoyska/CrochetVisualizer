<script>
  import { onMount } from 'svelte';

  let patternInput = "ch ch ch ch dc sc sc ch dc sc sc";
  let grid = [];

  function parsePattern(input) {
    let stitches = input.split(" ");
    let tempGrid = [];
    let row = [];
    
    let maxWidth = 0;
    let rowCount = 0;
    let base = 1;

    for (let i = 0; i < stitches.length; i++) {
      const stitch = stitches[i];

      if (stitch === "ch") {
        if (base === 1) {
          row.push(stitch);
        }
        if (row.length > 0 && base === 0) {
          // If a turn occurs (new row)
          tempGrid.push(row);
          rowCount++;
          row = [];
        }
      } else {
        if (base === 1) {
          base = 0;
          row.pop(); // Remove last chain (for the new row)
          tempGrid.push(row);
          rowCount++;
          row = [];
        }
        row.push(stitch);
      }
    }
    if (row.length > 0) {
      tempGrid.push(row); // Push the last row if not empty
    }
    
    maxWidth = Math.max(...tempGrid.map(r => r.length));
    
    // Now, adjust positions based on row odd/even:
    tempGrid = tempGrid.map((r, idx) => {
      // For odd rows, add leading nulls to shift stitches to the right
      if (idx % 2 !== 0) {
        const nulls = new Array(maxWidth - r.length).fill(null);
        return [...nulls, ...r];
      }
      return r;
    });

    // Normalize row lengths to the max width
    tempGrid = tempGrid.map(r => {
      while (r.length < maxWidth) {
        r.push(null);
      }
      return r;
    });

    grid = tempGrid.reverse(); // Final reverse to display bottom-up
  }

  let p5;
  
  onMount(async () => {
    parsePattern(patternInput);

    if (typeof window !== 'undefined') {
      const module = await import('p5');
      p5 = module.default;

      new p5(p => {
        p.setup = () => {
          p.createCanvas(600, 400);
        };

        p.draw = () => {
          p.background(255);
          p.textSize(16);
          p.textAlign(p.CENTER, p.CENTER);

          const xStart = 50;
          const yStart = 50; 
          const stitchSize = 30;
          const spacing = 5;

          grid.forEach((row, rowIndex) => {
            row.forEach((stitch, colIndex) => {
              let xPos = xStart + colIndex * (stitchSize + spacing);
              let yPos = yStart + rowIndex * (stitchSize + spacing);

              if (stitch) {
                p.fill(200);
                p.rect(xPos, yPos, stitchSize, stitchSize);
                p.fill(0);
                p.text(stitch, xPos + stitchSize / 2, yPos + stitchSize / 2);
              }
            });
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
  <!-- Left Section: Input Box -->
  <div class="input-container">
    <input type="text" bind:value={patternInput} on:change={() => parsePattern(patternInput)} placeholder="Enter crochet pattern">
  </div>
  
  <!-- Right Section: p5.js Visualization -->
  <div class="grid-container" id="p5-container"></div>
</div>
