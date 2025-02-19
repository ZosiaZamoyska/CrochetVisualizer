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
      if (rowCount % 2 !== 0)
      {
        row = row.reverse();
      }
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

  onMount(() => {
    parsePattern(patternInput);
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
  .grid {
    display: grid;
    gap: 2px;
  }
  .row {
    display: flex;
  }
  .stitch {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    background: lightgray;
    border: 1px solid black;
    text-transform: uppercase;
  }
  input {
    width: 100%;
    height: 100%;
    font-size: 16px;
    padding: 10px;
    box-sizing: border-box;
    border: 1px solid #ccc;
  }
</style>

<div class="container">
  <!-- Left Section: Input Box -->
  <div class="input-container">
    <input type="text" bind:value={patternInput} on:change={() => parsePattern(patternInput)} placeholder="Enter crochet pattern">
  </div>
  
  <!-- Right Section: Grid Visualization -->
  <div class="grid-container">
    <div class="grid">
      {#each grid as row}
        <div class="row">
          {#each row as stitch}
            <div class="stitch">{stitch || ''}</div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>
