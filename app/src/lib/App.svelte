<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { parsePattern, grid } from './parser.js';
  import { createP5Instance } from './p5Sketch.js';
  import './App.css';
  import { jsPDF } from 'jspdf';

  let patternInput = "";
  let websocketPort = 8765;
  let arduinoData = "";
  let stitchesType = ["ch", "sc", "dc"];
  let arduinoStatus = ["waiting", "connected","receiving"];
  let status = "waiting";
  let verticalSpacing = 15;
  let horizontalSpacing = 15;
  
  // Create a reactive variable for the formatted pattern
  $: formattedPattern = formatPattern();
  
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

  let p5Instance = null;
  let currentStep = 1;
  let isPlaying = false;
  let stitchesDone = patternInput.split(" ").length;
  let interval;
  
  // Ensure canvas redraws every time patternInput or spacing changes
  $: patternInput, verticalSpacing, horizontalSpacing, redrawCanvas();
  $: patternInput, formattedPattern = formatPattern();

  // Update pattern text when patternInput changes
  $: {
    patternInput;
    parsePattern(patternInput.trim());
  }

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
        currentStep += 3;
        redrawCanvas();
      } else {
        stopPlayback();
      }
    }, 700);
  }
  
  function stopPlayback() {
    clearInterval(interval);
    isPlaying = false;
  }

  // Function to trigger the canvas redraw
  function redrawCanvas() {
    createCanvasInstance();
  }

  function undoLastStitch() {
    const stitches = patternInput.trim().split(" ");
    if (stitches.length > 0) {
      stitches.pop();
      patternInput = stitches.join(" ");
      parsePattern(patternInput.trim());
    }
  }

  function exportToPDF() {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set font and size
    doc.setFont("helvetica");
    doc.setFontSize(20);
    
    // Add title
    doc.text("Crochet Pattern", 20, 20);
    
    // Set font size for pattern text
    doc.setFontSize(12);
    
    // Split pattern into rows and add them to PDF
    const rows = formattedPattern.split('\n');
    let y = 40; // Starting y position after title
    
    rows.forEach(row => {
      // Check if we need a new page
      if (y > 280) { // If we're near the bottom of the page
        doc.addPage();
        y = 20; // Reset y position for new page
      }
      
      // Add the row to the PDF
      doc.text(row, 20, y);
      y += 10; // Move down for next row
    });
    
    // Save the PDF
    doc.save('crochet-pattern.pdf');
  }

  function saveChart() {
    if (p5Instance) {
      // Get the canvas element
      const canvas = document.querySelector('#p5Canvas canvas');
      if (canvas) {
        // Create a temporary link element
        const link = document.createElement('a');
        link.download = 'crochet-pattern.png';
        
        // Convert canvas to data URL
        const dataURL = canvas.toDataURL('image/png');
        
        // Set the link's href to the data URL
        link.href = dataURL;
        
        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  function formatPattern() {
    if (!grid || grid.length === 0) return "";
    
    return grid.map((row, rowIndex) => {
      // Filter out null values
      const validStitches = row.filter(stitch => stitch !== null);
      
      // For odd rows (1-based), reverse the order
      if (rowIndex % 2 === 1) {
        validStitches.reverse();
      }
      
      // Find repeating patterns
      let condensedRow = [];
      let i = 0;
      
      while (i < validStitches.length) {
        // Try to find the longest repeating pattern starting at position i
        let maxPatternLength = 1;
        let maxRepetitions = 1;
        
        // Try patterns of increasing length
        for (let patternLength = 1; patternLength <= Math.floor((validStitches.length - i) / 2); patternLength++) {
          const pattern = validStitches.slice(i, i + patternLength);
          let repetitions = 1;
          
          // Check if this pattern repeats
          for (let j = i + patternLength; j <= validStitches.length - patternLength; j += patternLength) {
            const nextPattern = validStitches.slice(j, j + patternLength);
            if (pattern.every((stitch, idx) => stitch === nextPattern[idx])) {
              repetitions++;
            } else {
              break;
            }
          }
          
          if (repetitions > maxRepetitions) {
            maxRepetitions = repetitions;
            maxPatternLength = patternLength;
          }
        }
        
        // If we found a repeating pattern
        if (maxRepetitions > 1) {
          const pattern = validStitches.slice(i, i + maxPatternLength);
          condensedRow.push(`${maxRepetitions}x(${pattern.join(" ")})`);
          i += maxPatternLength * maxRepetitions;
        } else {
          // No repeating pattern found, just add the current stitch
          condensedRow.push(validStitches[i]);
          i++;
        }
      }
      
      return condensedRow.join(", ");
    }).join("\n");
  }

  onMount(async () => {
    const socket = new WebSocket(`ws://localhost:${websocketPort}`);
  
    socket.onmessage = (event) => {
      let receivedData = event.data;

      if (stitchesType.includes(receivedData))
      {
        patternInput += receivedData + " ";
        parsePattern(patternInput.trim());
      }
      if (arduinoStatus.includes(receivedData))
      {
        status = receivedData;
      }
    };

    socket.onopen = () => {
      console.log('WebSocket connected');
      status = "connected";
    };

    socket.onerror = (error) => {
      console.log('WebSocket error: ', error);
      status = "waiting";
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
      status = "waiting";
    };

    // Set initial status to waiting
    status = "waiting";
    parsePattern(patternInput);

    if (typeof window !== 'undefined') {
      const module = await import('p5');
      const p5 = module.default;

      if (p5Instance) {
        p5Instance.remove();
      }

      //createCanvasInstance();
      p5Instance = new p5((p) => createP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing), document.getElementById('p5Canvas'));
    }
  });

  async function createCanvasInstance() {
    if (typeof window !== 'undefined') {
      const module = await import('p5');
      const p5 = module.default;

      if (p5Instance) {
        p5Instance.remove(); // Remove existing instance
      }

      // Create a new p5 instance with spacing parameters
      p5Instance = new p5((p) => createP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing), document.getElementById('p5Canvas'));
    }
  }
</script>


<div class="container">
  <div class="input-container">
    <div class="status-container">
      <h1>Status:</h1>
      <div class="dot {status}"></div>
      <h1> {status}</h1>
    </div>
    <select on:change={selectPattern}>
      <option value="" disabled selected>Select a design</option>
      {#each Object.keys(patterns) as design}
        <option value={patterns[design]}>{design}</option>
      {/each}
    </select>
    <div class="button-group">
      <button on:click={playPattern}>{isPlaying ? "Stop" : "Play"}</button>
      <button on:click={undoLastStitch}>Undo</button>
    </div>
    <input type="text" bind:value={patternInput} on:input={() => parsePattern(patternInput.trim())} placeholder="Enter crochet pattern">
    
    <div class="spacing-controls">
      <h2>Visualization Settings</h2>
      <div class="slider-group">
        <label for="vertical-spacing">Vertical Spacing: {verticalSpacing}px</label>
        <input 
          type="range" 
          id="vertical-spacing" 
          min="5" 
          max="30" 
          bind:value={verticalSpacing}
          class="slider"
        >
      </div>
      <div class="slider-group">
        <label for="horizontal-spacing">Horizontal Spacing: {horizontalSpacing}px</label>
        <input 
          type="range" 
          id="horizontal-spacing" 
          min="5" 
          max="30" 
          bind:value={horizontalSpacing}
          class="slider"
        >
      </div>
    </div>
    
    <div class="pattern-output">
      <h2>Written Pattern</h2>
      <div class="pattern-text">
        {formattedPattern}
      </div>
      <div class="button-group">
        <button on:click={exportToPDF}>Export as PDF</button>
        <button on:click={saveChart}>Save chart</button>
      </div>
    </div>
  </div>
  

  <div class="grid-container" id="p5Canvas"></div>
</div>