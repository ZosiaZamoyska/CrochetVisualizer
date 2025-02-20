<script>
  import { onMount } from 'svelte';

  let patternInput = "ch ch ch ch dc sc sc ch dc sc sc";
  let grid = [];
  let p5Instance = null;

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
          tempGrid.push(row);
          rowCount++;
          row = [];
        }
      } else {
        if (base === 1) {
          base = 0;
          row.pop();
          tempGrid.push(row);
          rowCount++;
          row = [];
        }
        row.push(stitch);
      }
    }
    if (row.length > 0) {
      tempGrid.push(row);
    }

    maxWidth = Math.max(...tempGrid.map(r => r.length));

    tempGrid = tempGrid.map((r, idx) => {
      if (idx % 2 !== 0) {
        const nulls = new Array(maxWidth - r.length).fill(null);
        return [...nulls, ...r];
      }
      return r;
    });

    tempGrid = tempGrid.map(r => {
      while (r.length < maxWidth) {
        r.push(null);
      }
      return r;
    });

    grid = tempGrid.reverse();
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

          p.stroke(0);
          p.strokeWeight(2);
          for (let i = 1; i < positions.length; i++) {
            let prev = positions[i - 1];
            let curr = positions[i];

            if (Math.abs(prev.x - curr.x) <= stitchSize + spacing && Math.abs(prev.y - curr.y) <= stitchSize + spacing) {
              p.line(prev.x, prev.y, curr.x, curr.y);
            }
          }

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
