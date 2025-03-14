<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { parsePattern, grid } from './parser.js';
  import { createBasicP5Instance } from './basicP5Sketch.js';
  import { createPhysicsP5Instance } from './physicsp5Sketch.js';
  import { createExpertP5Instance } from './expertP5Sketch.js';
  import { createRoundP5Instance } from './roundP5Sketch.js';
  import { enableSelection } from './interactiveEditing.js';
  import { gridToPattern } from './parser.js';
  import { patternToLoad } from '$lib/store';

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
  let roundSpacing = 50;
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
  let crochetType = 'flat';
  let shapes = [];
  let isSelecting = false;
  let selectionStart = { x: 0, y: 0 };
  let selectionEnd = { x: 0, y: 0 };
  let selectedNodes = [];
  let gridEditing = false;
  
  let contextMenuVisible = false;
  let contextMenuProps = {
      x: 0,
      y: 0,
      onDelete: () => {},
      onDuplicate: () => {},
      onChangeStitchType: () => {}
  };

  let showAddStitchDropdown = false;
  let addButtonRect = null;

  // Function to extract unique stitch types from pattern
  function extractStitchTypes(pattern) {
    const stitches = pattern.trim().split(" ").filter(s => s);
    const uniqueStitches = new Set([...stitchesType, ...stitches]);
    return Array.from(uniqueStitches);
  }

  // Remove old reactive statements and replace with new ones
  $: {
    if (!gridEditing && patternInput) {
      // Only parse pattern from input when not in grid editing mode
      console.log('Pattern input changed, updating grid');
      const trimmedInput = patternInput.trim();
      parsePattern(trimmedInput);
      formattedPattern = formatPattern();
      console.log('formattedPattern', formattedPattern);
    }
  }
  
  $: {
    if (grid && gridEditing) {
      console.log('Grid changed while editing, updating pattern');
      // Update formatted pattern from current grid state
      formattedPattern = formatPattern();
      // Update pattern input to match grid (but don't trigger parsing)
      patternInput = gridToPattern();
    }
  }

  // Function to handle pattern input changes
  function handlePatternInput(event) {
    if (!gridEditing) {
      parsePattern(event.target.value.trim());
    }
  }

  // Function to toggle grid editing mode
  function toggleGridEditing() {
    gridEditing = !gridEditing;
    if (gridEditing) {
      console.log('Entering grid editing mode');
    } else {
      console.log('Exiting grid editing mode, syncing with pattern');
      patternInput = gridToPattern();
      parsePattern(patternInput.trim());
    }
  }

  // Predefined crochet patterns
  const patterns = {
    "Basic Chain": "ch ch ch ch ch ch ch ch",
    "Single Crochet Row": "ch ch ch ch ch ch ch ch sc sc sc sc sc sc sc",
    "Normal Wave": "ch ch ch ch ch ch sc dc sc dc sc ch sc sc sc sc sc ch sc sc sc sc sc ch sc sc sc sc sc",
    "Exaggerated Wave": "ch ch ch ch ch ch sc dc sc dc sc ch sc dc sc dc sc ch sc dc sc dc sc ch sc dc sc dc sc",
    "Up-Down Wave": "ch ch ch ch ch ch sc dc sc dc sc ch dc sc dc sc dc ch sc dc sc dc sc ch dc sc dc sc dc",
    "Random": "ch ch ch ch dc sc sc sc sc ch sc sc ch sc sc sc",
    "Round - Basic Circle": "ch ch ch ch ch ch sc sc sc sc sc sc",
    "Round - Increasing Circle": "ch ch ch ch ch ch sc sc sc sc sc sc sc sc sc sc sc sc",
    "Round - Two Round Circle": "ch ch ch ch ch ch sc sc sc sc sc sc dc dc dc dc dc dc dc dc dc dc dc dc"
  };

  // Function to update patternInput and parse the pattern
  function selectPattern(event) {
    patternInput = event.target.value;
    
    // Automatically switch to round view for round patterns
    const selectedPattern = event.target.options[event.target.selectedIndex].text;
    if (selectedPattern.startsWith("Round -")) {
      crochetType = 'round';
    }
    
    parsePattern(patternInput);
  }

  let p5Instance = null;
  let currentStep = 1;
  let isPlaying = false;
  let stitchesDone = patternInput.split(" ").length;
  let interval;
  
  // Ensure canvas redraws every time patternInput or spacing changes
  $: patternInput, verticalSpacing, horizontalSpacing, roundSpacing, chColor, scColor, dcColor, customStitches, crochetType, redrawCanvas(), formattedPattern = formatPattern();
  $: patternInput, formattedPattern = formatPattern();

  // Update pattern text when patternInput changes


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
      const canvas = document.querySelector('#p5Canvas canvas');
      const ctx = canvas.getContext('2d');

      // Get canvas data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      let minX = canvas.width, minY = canvas.height;
      let maxX = 0, maxY = 0;
      let hasDrawing = false;

      // Find bounding box of non-transparent pixels
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const alpha = pixels[i + 3]; // alpha channel
          if (alpha !== 0) { // Non-transparent pixel
            hasDrawing = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (!hasDrawing) {
        alert("Nothing to save — canvas is empty!");
        return;
      }

      // Calculate width and height of cropped area
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;

      // Create temp canvas to store cropped image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');

      // Draw cropped image onto temp canvas
      tempCtx.putImageData(ctx.getImageData(minX, minY, width, height), 0, 0);

      // Save the cropped canvas
      const link = document.createElement('a');
      link.download = 'crochet-pattern-cropped.png';
      link.href = tempCanvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function formatPattern() {
    if (!grid || grid.length === 0) return "";

    // Holds the formatted rows to process and merge
    const formattedRows = grid.map((row, rowIndex) => {
        // Handle foundation chain separately
        if (rowIndex === 0) {
            const chainCount = row.filter(stitch => stitch === "ch").length;
            return `Row 0: ch ${chainCount}, turn.`;
        }

        // Remove nulls for pattern detection
        let validStitches = row.filter(stitch => stitch !== null);

        // Reverse for odd rows to simulate turning
        const isOddRow = rowIndex % 2 === 1;
        if (isOddRow) {
            validStitches.reverse();
        }

        // Find repeating patterns
        let condensedRow = [];
        let i = 0;

        while (i < validStitches.length) {
            let maxPatternLength = 1;
            let maxRepetitions = 1;

            // Check for longest repeating pattern
            for (let patternLength = 1; patternLength <= Math.floor((validStitches.length - i) / 2); patternLength++) {
                const pattern = validStitches.slice(i, i + patternLength);
                let repetitions = 1;

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

            // Add pattern or single stitch
            if (maxRepetitions > 1) {
                const pattern = validStitches.slice(i, i + maxPatternLength);
                condensedRow.push(`(${pattern.join(", ")}) x${maxRepetitions}`);
                i += maxPatternLength * maxRepetitions;
            } else {
                condensedRow.push(validStitches[i]);
                i++;
            }
        }

        // Add skip if there were nulls
        const skipCount = row.filter(stitch => stitch === null).length;
        if (skipCount > 1) {
            condensedRow.push(`skip ${skipCount}`);
        }

        // Add turn at the end
        condensedRow.push('turn.');

        // Return formatted row with pattern
        return condensedRow.join(", ");
    });

    // === Now we merge consecutive rows with the same pattern ===
    // === Now we merge consecutive rows with the same pattern ===
    let mergedRows = [];

    // Handle foundation separately
    mergedRows.push(formattedRows[0]); // Row 0 (Foundation)

    // Process remaining rows starting from index 1
    for (let i = 1; i < formattedRows.length; i++) {
        const currentRow = formattedRows[i];
        let rangeStart = i;
        let rangeEnd = i;

        // Look ahead for consecutive rows with identical patterns
        while (rangeEnd < formattedRows.length - 1 && formattedRows[rangeEnd] === formattedRows[rangeEnd + 1]) {
            rangeEnd++;
        }

        // If the range is more than one row, merge into a range
        if (rangeStart === rangeEnd) {
            mergedRows.push(`Row ${rangeStart}: ${currentRow}`);
        } else {
            mergedRows.push(`Row ${rangeStart}-${rangeEnd}: ${currentRow}`);
        }

        // Skip merged rows
        i = rangeEnd;
    }


    // Return the final formatted pattern
    return mergedRows.join("\n");
}




// Helper to expand short stitch names
function expandStitchName(shortName) {
    const stitchNames = {
        "ch": "chain (ch)",
        "sc": "single crochet (sc)",
        "dc": "double crochet (dc)",
        // Add more stitch types as needed
    };
    return stitchNames[shortName] || shortName; // fallback to shortName if unknown
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

  function createVirtualChart() {
    // Create a virtual canvas
    const virtualCanvas = document.createElement('canvas');
    const ctx = virtualCanvas.getContext('2d');
    
    // Set canvas size based on grid dimensions
    const cellSize = 20; // Base size for each stitch
    const padding = 10;
    
    // Calculate required canvas size based on grid
    const width = (grid[0]?.length || 1) * cellSize + (2 * padding);
    const height = (grid.length || 1) * cellSize + (2 * padding);
    
    virtualCanvas.width = width;
    virtualCanvas.height = height;
    
    // Set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    grid.forEach((row, rowIndex) => {
      row.forEach((stitch, colIndex) => {
        if (stitch) {
          // Get color based on stitch type
          let color;
          switch (stitch) {
            case 'ch':
              color = chColor;
              break;
            case 'sc':
              color = scColor;
              break;
            case 'dc':
              color = dcColor;
              break;
            default:
              const customStitch = customStitches.find(s => s.name === stitch);
              color = customStitch ? customStitch.color : '#000000';
          }
          
          // Draw stitch
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(
            padding + colIndex * cellSize + cellSize/2,
            padding + rowIndex * cellSize + cellSize/2,
            cellSize/3,
            0,
            Math.PI * 2
          );
          ctx.fill();
          
          // Draw connections
          if (rowIndex > 0 && grid[rowIndex-1][colIndex]) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(
              padding + colIndex * cellSize + cellSize/2,
              padding + rowIndex * cellSize + cellSize/2
            );
            ctx.lineTo(
              padding + colIndex * cellSize + cellSize/2,
              padding + (rowIndex-1) * cellSize + cellSize/2
            );
            ctx.stroke();
          }
        }
      });
    });
    
    return virtualCanvas;
  }

  async function confirmSavePattern() {
    if (!newPatternName.trim()) {
      alert('Please enter a pattern name');
      return;
    }

    // Get the preview canvas
    const canvas = document.querySelector('#p5Canvas canvas');
    let previewImage = null;
    let chart = null;

    // Store original view mode
    const originalViewMode = viewMode;

    // Handle preview image
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      let minX = canvas.width, minY = canvas.height;
      let maxX = 0, maxY = 0;
      let hasDrawing = false;

      // Detect the drawn (non-transparent) area
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const alpha = pixels[i + 3]; // alpha channel
          if (alpha !== 0) { // Non-transparent pixel
            hasDrawing = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // If something is drawn, create cropped image
      if (hasDrawing) {
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        // Temporary canvas to hold cropped image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        // Copy cropped area into temp canvas
        tempCtx.putImageData(ctx.getImageData(minX, minY, width, height), 0, 0);

        // Convert to image URL
        previewImage = tempCanvas.toDataURL('image/png');
      } else {
        // If nothing drawn, fallback to full canvas
        previewImage = canvas.toDataURL('image/png');
      }
    }

    // Temporarily switch to expert view and capture chart
    viewMode = 'expert';
    await createCanvasInstance(); // Wait for canvas to update
    
    // Small delay to ensure canvas is fully rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture and crop the expert view
    const expertCanvas = document.querySelector('#p5Canvas canvas');
    if (expertCanvas) {
      const expertCtx = expertCanvas.getContext('2d');
      const expertImageData = expertCtx.getImageData(0, 0, expertCanvas.width, expertCanvas.height);
      const expertPixels = expertImageData.data;

      let minX = expertCanvas.width, minY = expertCanvas.height;
      let maxX = 0, maxY = 0;
      let hasDrawing = false;

      // Detect the drawn (non-transparent) area
      for (let y = 0; y < expertCanvas.height; y++) {
        for (let x = 0; x < expertCanvas.width; x++) {
          const i = (y * expertCanvas.width + x) * 4;
          const alpha = expertPixels[i + 3]; // alpha channel
          if (alpha !== 0) { // Non-transparent pixel
            hasDrawing = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // If something is drawn, create cropped image
      if (hasDrawing) {
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        // Temporary canvas to hold cropped image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');

        // Copy cropped area into temp canvas
        tempCtx.putImageData(expertCtx.getImageData(minX, minY, width, height), 0, 0);

        // Convert to image URL
        chart = tempCanvas.toDataURL('image/png');
      } else {
        // If nothing drawn, fallback to full canvas
        chart = expertCanvas.toDataURL('image/png');
      }
    }

    // Switch back to original view mode
    viewMode = originalViewMode;
    await createCanvasInstance();

    // Prepare pattern data with preview image and chart
    const patternData = {
      id: Date.now(),
      name: newPatternName.trim(),
      notes: newPatternNotes.trim(),
      pattern: patternInput,
      timestamp: new Date().toISOString(),
      preview: previewImage,
      chart: chart,
      formattedPattern: formattedPattern,
      grid: grid,
      colors: {
        ch: chColor,
        sc: scColor,
        dc: dcColor,
        custom: customStitches
      },
      stitchesType: stitchesType,
      spacing: {
        vertical: verticalSpacing,
        horizontal: horizontalSpacing,
        round: roundSpacing
      },
      crochetType: crochetType
    };

    // Save to localStorage
    savedPatterns = [...savedPatterns, patternData];
    localStorage.setItem('savedPatterns', JSON.stringify(savedPatterns));

    // Also save as JSON file
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
    console.log('Loading pattern:', pattern); // Debugging line
    if (pattern) {
        // Set the patternInput to the pattern string
        patternInput = pattern.pattern;
        // Set other properties as needed
        chColor = pattern.colors?.ch;
        scColor = pattern.colors?.sc;
        dcColor = pattern.colors?.dc;
        customStitches = pattern.colors.custom;
        stitchesType = pattern.stitchesType;
        verticalSpacing = pattern.spacing.vertical;
        horizontalSpacing = pattern.spacing.horizontal;
        
        // Load round spacing and crochet type if available
        if (pattern.spacing.round) {
            roundSpacing = pattern.spacing.round;
        }
        if (pattern.crochetType) {
            crochetType = pattern.crochetType;
        } else if (pattern.name.toLowerCase().includes('round')) {
            // For backward compatibility with older patterns
            crochetType = 'round';
        }

        // Call parsePattern to update the grid
        parsePattern(patternInput.trim());
        //redrawCanvas();
        //patternToLoad.set(null);
    } else {
        console.error('No pattern provided to load.'); // Error handling
    }
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

  // Add the reload function near the other utility functions
  function reloadPage() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  function addStitch(stitchType) {
    patternInput = (patternInput.trim() + " " + stitchType).trim();
    parsePattern(patternInput);
    showAddStitchDropdown = false;
  }

  function toggleAddDropdown(event) {
    showAddStitchDropdown = !showAddStitchDropdown;
    if (showAddStitchDropdown) {
      // Store the button's position for dropdown placement
      const button = event.target;
      const rect = button.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      addButtonRect = {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        bottom: rect.bottom + scrollTop,
        height: rect.height,
        width: rect.width
      };
    }
  }

  onMount(async () => {

    const saved = localStorage.getItem('savedPatterns');
    if (saved) {
      savedPatterns = JSON.parse(saved);
    }
    const loadedPattern = localStorage.getItem('patternToLoad');
    
    const unsubscribe = patternToLoad.subscribe(value => {
      if (value) {
        loadPattern(value);
      }
    });

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

    status = "waiting";
    //parsePattern(patternInput);

    if (typeof window !== 'undefined') {
      const module = await import('p5');
      const p5 = module.default;

      if (p5Instance) {
        console.log("removing p5instance");
        p5Instance.remove();
      }
      console.log(grid);
      if (viewMode === 'expert') {
            if (crochetType === 'round') {
                p5Instance = new p5((p) => createRoundP5Instance(p, grid, stitchesDone, isPlaying, roundSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu, true), document.getElementById('p5Canvas'));
            } else {
                p5Instance = new p5((p) => createExpertP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
            }
        } else if (viewMode === 'physics') {
            p5Instance = new p5((p) => createPhysicsP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
        } else if (viewMode === 'round') {
            p5Instance = new p5((p) => createRoundP5Instance(p, grid, stitchesDone, isPlaying, roundSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu, false), document.getElementById('p5Canvas'));
        } else {
            // Basic view
            if (crochetType === 'round') {
                p5Instance = new p5((p) => createRoundP5Instance(p, grid, stitchesDone, isPlaying, roundSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu, false), document.getElementById('p5Canvas'));
            } else {
                p5Instance = new p5((p) => createBasicP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
            }
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
        if (showAddStitchDropdown && !event.target.closest('.add-stitch-container')) {
            showAddStitchDropdown = false;
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

        // Create a new p5 instance with the appropriate drawing function based on view mode and crochet type
        if (viewMode === 'expert') {
            if (crochetType === 'round') {
                p5Instance = new p5((p) => createRoundP5Instance(p, grid, stitchesDone, isPlaying, roundSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu, true), document.getElementById('p5Canvas'));
            } else {
                p5Instance = new p5((p) => createExpertP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
            }
        } else if (viewMode === 'physics') {
            p5Instance = new p5((p) => createPhysicsP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
        } else if (viewMode === 'round') {
            // Round view is now deprecated - we use crochetType instead
            crochetType = 'round';
            viewMode = 'basic';
            p5Instance = new p5((p) => createRoundP5Instance(p, grid, stitchesDone, isPlaying, roundSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu, false), document.getElementById('p5Canvas'));
        } else {
            // Basic view
            if (crochetType === 'round') {
                p5Instance = new p5((p) => createRoundP5Instance(p, grid, stitchesDone, isPlaying, roundSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu, false), document.getElementById('p5Canvas'));
            } else {
                p5Instance = new p5((p) => createBasicP5Instance(p, grid, stitchesDone, isPlaying, verticalSpacing, horizontalSpacing, chColor, scColor, dcColor, customStitches, showContextMenu), document.getElementById('p5Canvas'));
            }
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
      <div class="add-stitch-container">
          <button class="primary" on:click={toggleAddDropdown}>Add ▼</button>
          {#if showAddStitchDropdown}
            <div class="stitch-dropdown">
              {#each stitchesType as stitch}
                <button class="dropdown-item" on:click={() => addStitch(stitch)}>{stitch}</button>
              {/each}
            </div>
          {/if}
        </div>
        <button class="primary" on:click={undoLastStitch}>Undo</button>
        <button class="primary" on:click={playPattern}>{isPlaying ? "Stop" : "Play"}</button>
        <button class="secondary" on:click={reloadPage}>↻ Reset</button>
    </div>
    <input 
      type="text" 
      bind:value={patternInput} 
      on:input={handlePatternInput}
      placeholder="Enter crochet pattern"
      disabled={gridEditing}
      class:editing={gridEditing}
    >
    
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
          <label for="crochet-type">Crochet Type:</label>
          <div class="toggle-container">
            <label class="toggle-label">
              <input 
                type="radio" 
                name="crochet-type" 
                value="flat" 
                bind:group={crochetType}
              >
              <span>Flat</span>
            </label>
            <label class="toggle-label">
              <input 
                type="radio" 
                name="crochet-type" 
                value="round" 
                bind:group={crochetType}
              >
              <span>Round</span>
            </label>
          </div>
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
        {#if crochetType === 'round'}
        <div class="slider-group">
          <label for="round-spacing">Round Spacing: {roundSpacing}px</label>
          <input 
            type="range" 
            id="round-spacing" 
            min="20" 
            max="100" 
            bind:value={roundSpacing}
            class="slider"
          >
        </div>
        {/if}
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
      <div class="save-button-group vertical">
        <button class="primary" on:click={savePattern}>Save pattern</button>
        <div class="save-button-group horizontal">
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
                    gridEditing = true; // Enter grid editing mode
                    p5Instance.deleteSelectedNodes(selectedNodes);
                    formattedPattern = formatPattern(patternInput);
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
        on:changeStitchType={(event) => {
            const stitchType = event.detail;
            if (p5Instance) {
                const selectedNodes = p5Instance.getSelectedNodes();
                if (selectedNodes && selectedNodes.length > 0) {
                    gridEditing = true; // Enter grid editing mode
                    p5Instance.changeStitchType(selectedNodes, stitchType);
                    redrawCanvas();
                }
            }
            hideContextMenu();
        }}
        stitchesType={stitchesType}
    />
{/if}

<style>
  .canvas-container {
    width: 800px;
    height: 600px;
    margin: 20px auto;
  }
  .editing {
    background-color: #f0f0f0;
    cursor: not-allowed;
  }
  .button-group {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin: 10px 0;
  }
  .save-button-group {
    display: flex;
    gap: 10px;
    margin: 10px 0;
  }
  button.secondary {
    background-color: #6c757d;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  button.secondary:hover {
    background-color: #5a6268;
  }
  .add-stitch-container {
    position: relative;
    display: inline-block;
  }

  .stitch-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
    min-width: 100%;
    margin-top: 2px;
  }

  .dropdown-item {
    display: block;
    width: 100%;
    padding: 8px 16px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .dropdown-item:hover {
    background-color: #f0f0f0;
  }
  
  /* Crochet type toggle styling */
  .toggle-container {
    display: flex;
    gap: 10px;
    margin-top: 5px;
  }
  
  .toggle-label {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 4px;
    background-color: #f0f0f0;
    transition: all 0.2s;
  }
  
  .toggle-label input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }
  
  .toggle-label input:checked + span {
    font-weight: bold;
  }
  
  .toggle-label:has(input:checked) {
    background-color: #4CAF50;
    color: white;
  }
  
  .toggle-label:hover {
    background-color: #e0e0e0;
  }
  
  .toggle-label:has(input:checked):hover {
    background-color: #3e8e41;
  }
</style>
