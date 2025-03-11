<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { parsePattern, grid } from './parser.js';
  import { createBasicP5Instance } from './basicP5Sketch.js';
  import { createPhysicsP5Instance } from './physicsp5Sketch.js';
  import { createExpertP5Instance } from './expertP5Sketch.js';
  import { enableSelection } from './interactiveEditing.js';
  import { gridToPattern } from './parser.js';
  import './App.css';
  import { jsPDF } from 'jspdf';
  import ContextMenu from './ContextMenu.svelte';

  let patternInput = "";
  let formattedPattern = "";
  let websocketPort = 8765;
  let arduinoData = "";
  let stitchesType = ["ch", "sc", "dc"];
  let arduinoStatus = ["waiting", "connected","receiving"];
  let status = "waiting";
  let verticalSpacing = 15;
  let horizontalSpacing = 15;
  let showSettings = false;
  let chColor = "#00DC00";
  let scColor = "#00C800";
  let dcColor = "#00AA00";
  let customStitches = [];
  let showNewStitchDialog = false;
  let newStitchName = "";
  let newStitchColor = "#808080";
  let savedPatterns = [];
  let activeTab = 'make';
  let showSavePatternDialog = false;
  let newPatternName = "";
  let newPatternNotes = "";
  let viewMode = 'basic';
  let shapes = [];
  
  let isSelecting = false;
  let selectionStart = { x: 0, y: 0 };
  let selectionEnd = { x: 0, y: 0 };
  let selectedNodes = [];
  
  let contextMenuVisible = false;
  let contextMenuProps = {
      x: 0,
      y: 0,
      onDelete: () => {},
      onDuplicate: () => {},
      onChangeStitchType: () => {}
  };

  // Function to extract unique stitch types from pattern
  function extractStitchTypes(pattern) {
    const stitches = pattern.trim().split(" ").filter(s => s);
    const uniqueStitches = new Set([...stitchesType, ...stitches]);
    return Array.from(uniqueStitches);
  }

  // Update stitch types when pattern changes
  $: {
    patternInput;
    parsePattern(patternInput.trim());
    formattedPattern = formatPattern(); // Run this AFTER parsePattern updates grid
  }
  
  
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
  $: patternInput, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, redrawCanvas(), formattedPattern = formatPattern();
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

  function addNewStitch() {
    if (newStitchName.trim()) {
      customStitches = [...customStitches, { name: newStitchName.trim(), color: newStitchColor }];
      stitchesType = [...stitchesType, newStitchName.trim()];
      newStitchName = "";
      newStitchColor = "#808080";
      showNewStitchDialog = false;
    }
  }

  function removeCustomStitch(stitchName) {
    customStitches = customStitches.filter(s => s.name !== stitchName);
    stitchesType = stitchesType.filter(s => s !== stitchName);
  }

  function savePattern() {
    showSavePatternDialog = true;
  }

  function confirmSavePattern() {
    if (!newPatternName.trim()) {
      alert('Please enter a pattern name');
      return;
    }

    // Get the canvas preview
    const canvas = document.querySelector('#p5Canvas canvas');
    let previewImage = null;
    if (canvas) {
      previewImage = canvas.toDataURL('image/png');
    }

    const patternData = {
      id: Date.now(),
      name: newPatternName.trim(),
      notes: newPatternNotes.trim(),
      pattern: patternInput,
      timestamp: new Date().toISOString(),
      preview: previewImage,
      colors: {
        ch: chColor,
        sc: scColor,
        dc: dcColor,
        custom: customStitches
      },
      stitchesType: stitchesType,
      spacing: {
        vertical: verticalSpacing,
        horizontal: horizontalSpacing
      }
    };

    // Save to localStorage
    savedPatterns = [...savedPatterns, patternData];
    localStorage.setItem('savedPatterns', JSON.stringify(savedPatterns));

    // Also save as file
    const blob = new Blob([JSON.stringify(patternData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crochet-pattern-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Reset dialog
    newPatternName = "";
    newPatternNotes = "";
    showSavePatternDialog = false;
  }

  function loadPattern(pattern) {
    patternInput = pattern.pattern;
    chColor = pattern.colors.ch;
    scColor = pattern.colors.sc;
    dcColor = pattern.colors.dc;
    customStitches = pattern.colors.custom;
    stitchesType = pattern.stitchesType;
    verticalSpacing = pattern.spacing.vertical;
    horizontalSpacing = pattern.spacing.horizontal;
    activeTab = 'make';
    parsePattern(patternInput.trim());
    redrawCanvas();
  }

  function deletePattern(id) {
    savedPatterns = savedPatterns.filter(p => p.id !== id);
    localStorage.setItem('savedPatterns', JSON.stringify(savedPatterns));
  }

  // Reactive statement to update the canvas when viewMode changes
  $: viewMode, createCanvasInstance(); // This will call createCanvasInstance whenever viewMode changes

  function showContextMenu(x, y) {
    contextMenuProps = {
        x,
        y
    };
    contextMenuVisible = true;
  }

  function hideContextMenu() {
    contextMenuVisible = false;
  }

  onMount(async () => {
    // Load saved patterns
    const saved = localStorage.getItem('savedPatterns');
    if (saved) {
      savedPatterns = JSON.parse(saved);
    }

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

      if (viewMode === 'expert') {
            p5Instance = new p5((p) => createExpertP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
        } else if (viewMode === 'physics') {
            p5Instance = new p5((p) => createPhysicsP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
        } else {
            // Basic view
            p5Instance = new p5((p) => createBasicP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
        }
    }

    // Add click handler to hide context menu when clicking outside
    document.addEventListener('click', (event) => {
        if (contextMenuVisible) {
            const contextMenuElement = document.querySelector('.context-menu');
            if (contextMenuElement && !contextMenuElement.contains(event.target)) {
                hideContextMenu();
            }
        }
    });
  });

  async function createCanvasInstance() {
    if (typeof window !== 'undefined') {
        const module = await import('p5');
        const p5 = module.default;

        if (p5Instance) {
            p5Instance.remove(); // Remove existing instance
        }

        // Create a new p5 instance with the appropriate drawing function based on view mode
        if (viewMode === 'expert') {
            p5Instance = new p5((p) => createExpertP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
        } else if (viewMode === 'physics') {
            p5Instance = new p5((p) => createPhysicsP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
        } else {
            // Basic view
            p5Instance = new p5((p) => createBasicP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
        }
    }
  }
  
</script>

<div class="container">
  <div class="input-container">
    <div class="status-container">
      <h2>💡 Sensing Status:</h2>
      <div class="dot {status}"></div>
      <h2> {status}</h2>
    </div>
    <select on:change={selectPattern}>
      <option value="" disabled selected>Select a design</option>
      {#each Object.keys(patterns) as design}
        <option value={patterns[design]}>{design}</option>
      {/each}
    </select>
    <div class="button-group">
      <button class="primary" on:click={playPattern}>{isPlaying ? "Stop" : "Play"}</button>
      <button class="primary" on:click={undoLastStitch}>Undo</button>
    </div>
    <input type="text" bind:value={patternInput} on:input={() => parsePattern(patternInput.trim())} placeholder="Enter crochet pattern">
    
    <div class="spacing-controls">
      <div class="settings-header" on:click={() => showSettings = !showSettings}>
        <span class="toggle-icon">{showSettings ? '🔽' : '▶️'}</span>
        <h2>Visualization Settings</h2>
      </div>
      {#if showSettings}
        <div class="slider-group">
          <label for="view-mode">Select View Mode:</label>
          <select id="view-mode" bind:value={viewMode}>
            <option value="basic">Basic View (Editing mode)</option>
            <option value="physics">Physics View</option>
            <option value="expert">Expert View</option>
          </select>
        </div>
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
        <div class="color-pickers-container">
          <div class="color-group">
            <label for="ch-color">ch</label>
            <input 
              type="color" 
              id="ch-color" 
              bind:value={chColor}
              class="color-picker"
            >
          </div>
          <div class="color-group">
            <label for="sc-color">sc</label>
            <input 
              type="color" 
              id="sc-color" 
              bind:value={scColor}
              class="color-picker"
            >
          </div>
          <div class="color-group">
            <label for="dc-color">dc</label>
            <input 
              type="color" 
              id="dc-color" 
              bind:value={dcColor}
              class="color-picker"
            >
          </div>
          {#each customStitches as stitch}
            <div class="color-group">
              <label>{stitch.name}</label>
              <div class="color-picker-container">
                <input 
                  type="color" 
                  bind:value={stitch.color}
                  class="color-picker"
                >
                <button class="remove-stitch" on:click={() => removeCustomStitch(stitch.name)}>×</button>
              </div>
            </div>
          {/each}
          <div class="color-group">
            <label>Add</label>
            <button class="add-stitch" on:click={() => showNewStitchDialog = true}>+</button>
          </div>
        </div>

        {#if showNewStitchDialog}
          <div class="new-stitch-dialog">
            <h3>Add New Stitch</h3>
            <div class="new-stitch-input-group">
              <input 
                type="text" 
                bind:value={newStitchName} 
                placeholder="Enter stitch name"
                class="new-stitch-input"
              >
            </div>
            <div class="color-picker-container">
              <input 
                type="color" 
                bind:value={newStitchColor}
                class="color-picker"
              >
            </div>
            <div class="dialog-buttons">
              <button on:click={addNewStitch}>Add</button>
              <button on:click={() => showNewStitchDialog = false}>Cancel</button>
            </div>
          </div>
        {/if}
      {/if}
    </div>
    
    <div class="pattern-output">
      <h2>💾 Written Pattern</h2>
      <div class="pattern-text">
        {formattedPattern}
      </div>
      <div class="button-group vertical">
        <button class="primary" on:click={savePattern}>Save pattern</button>
        <div class="button-group horizontal">
          <button class="secondary" on:click={exportToPDF}>Export PDF</button>
          <button class="secondary" on:click={saveChart}>Export chart</button>
        </div>
      </div>
    </div>
  </div>
  
  <div id="p5Canvas" class="canvas-container"></div>
</div>

{#if showSavePatternDialog}
  <div class="new-stitch-dialog">
    <h3>Save Pattern</h3>
    <div class="new-stitch-input-group">
      <input 
        type="text" 
        bind:value={newPatternName} 
        placeholder="Enter pattern name"
        class="new-stitch-input"
      >
    </div>
    <div class="new-stitch-input-group">
      <textarea 
        bind:value={newPatternNotes} 
        placeholder="Add notes (optional)"
        class="new-stitch-input"
        rows="3"
      ></textarea>
    </div>
    <div class="dialog-buttons">
      <button on:click={confirmSavePattern}>Save</button>
      <button on:click={() => showSavePatternDialog = false}>Cancel</button>
    </div>
  </div>
{/if}

{#if contextMenuVisible}
    <ContextMenu 
        x={contextMenuProps.x}
        y={contextMenuProps.y}
        on:delete={() => {
            if (p5Instance) {
                const selectedNodes = p5Instance.getSelectedNodes();
                if (selectedNodes && selectedNodes.length > 0) {
                    p5Instance.deleteSelectedNodes(selectedNodes);
                    //patternInput = gridToPattern();
                    redrawCanvas();
                }
            }
            hideContextMenu();
        }}
        on:duplicate={() => {
            if (p5Instance) {
                const selectedNodes = p5Instance.getSelectedNodes();
                if (selectedNodes && selectedNodes.length > 0) {
                    p5Instance.duplicateSelectedNodes(selectedNodes);
                    redrawCanvas();
                }
            }
            hideContextMenu();
        }}
        on:changeStitchType={() => {
            if (p5Instance) {
                const selectedNodes = p5Instance.getSelectedNodes();
                if (selectedNodes && selectedNodes.length > 0) {
                    p5Instance.changeStitchType(selectedNodes);
                    redrawCanvas();
                }
            }
            hideContextMenu();
        }}
    />
{/if}

<style>
  .canvas-container {
    width: 800px;
    height: 600px;
    margin: 20px auto;
  }
</style>
