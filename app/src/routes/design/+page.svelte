<script>
  import { onMount } from 'svelte';
  import '$lib/App.css';

  let canvas;
  let fabricCanvas;

  onMount(async () => {
    console.log('Component mounted');
    try {
      // Dynamically import Fabric.js
      const { Canvas, Rect } = await import('fabric');
      console.log('Fabric.js imported successfully');
      initFabricJS(Canvas, Rect);
    } catch (error) {
      console.error('Error importing Fabric.js:', error);
    }
  });

  function initFabricJS(Canvas, Rect) {
    console.log('Initializing Fabric.js');
    
    // Initialize canvas with fixed dimensions first
    fabricCanvas = new Canvas('fabric-canvas', {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff'
    });

    // Create a simple square
    const square = new Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: '#00ff00',
      stroke: '#000',
      strokeWidth: 2,
      selectable: true,
      hasControls: true
    });

    // Add the square to canvas
    fabricCanvas.add(square);
    fabricCanvas.setActiveObject(square);
    fabricCanvas.renderAll();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
  }

  function onWindowResize() {
    if (fabricCanvas) {
      fabricCanvas.setWidth(canvas.clientWidth);
      fabricCanvas.setHeight(canvas.clientHeight);
      fabricCanvas.renderAll();
    }
  }
</script>

<div class="container">
  <div class="input-container">
    <h2>Pattern Library</h2>
    <p>Canvas test page</p>
  </div>
  
  <div class="grid-container" bind:this={canvas}>
    <canvas id="fabric-canvas"></canvas>
  </div>
</div>

<style>
  :global(.grid-container) {
    height: 100%;
    min-height: calc(100vh - 60px);
    position: relative;
    margin-right: 20px;
    background-color: #ffffff;
    border-radius: 12px;
    overflow: hidden; /* This ensures the canvas respects the rounded corners */
  }

  :global(.grid-container canvas) {
    width: 100% !important;
    height: 100% !important;
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 12px;
  }
</style> 