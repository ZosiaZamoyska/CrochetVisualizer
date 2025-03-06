<script>
  import { onMount } from 'svelte';
  import '$lib/App.css';
  import { Canvas, Rect, Circle, Triangle, Polygon } from 'fabric';

  let canvas;
  let fabricCanvas;

  const patterns = [
    { id: 'rect', name: 'Rectangle', type: 'rect', width: 100, height: 100 },
    { id: 'circle', name: 'Circle', type: 'circle', radius: 50 },
    { id: 'triangle', name: 'Triangle', type: 'triangle', width: 100, height: 100 },
    { id: 'polygon', name: 'Hexagon', type: 'polygon', points: 6, radius: 50 }
  ];

  onMount(() => {
    console.log('Component mounted');
    initFabricJS();
  });

  function initFabricJS() {
    console.log('Initializing Fabric.js');
    
    // Initialize canvas with fixed dimensions first
    fabricCanvas = new Canvas('fabric-canvas', {
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff'
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
  }

  function createShape(pattern) {
    if (!fabricCanvas) return;

    let shape;
    switch (pattern.type) {
      case 'rect':
        shape = new Rect({
          width: pattern.width,
          height: pattern.height,
          fill: '#00ff00',
          stroke: '#000',
          strokeWidth: 2,
          selectable: true,
          hasControls: true
        });
        break;
      case 'circle':
        shape = new Circle({
          radius: pattern.radius,
          fill: '#ff0000',
          stroke: '#000',
          strokeWidth: 2,
          selectable: true,
          hasControls: true
        });
        break;
      case 'triangle':
        shape = new Triangle({
          width: pattern.width,
          height: pattern.height,
          fill: '#0000ff',
          stroke: '#000',
          strokeWidth: 2,
          selectable: true,
          hasControls: true
        });
        break;
      case 'polygon':
        const points = [];
        for (let i = 0; i < pattern.points; i++) {
          const angle = (i * 2 * Math.PI) / pattern.points;
          points.push({
            x: pattern.radius * Math.cos(angle),
            y: pattern.radius * Math.sin(angle)
          });
        }
        shape = new Polygon(points, {
          fill: '#ff00ff',
          stroke: '#000',
          strokeWidth: 2,
          selectable: true,
          hasControls: true
        });
        break;
    }

    if (shape) {
      // Center the shape on canvas
      shape.set({
        left: fabricCanvas.width / 2,
        top: fabricCanvas.height / 2,
        originX: 'center',
        originY: 'center'
      });
      fabricCanvas.add(shape);
      fabricCanvas.setActiveObject(shape);
      fabricCanvas.renderAll();
    }
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
    <div class="pattern-list">
      {#each patterns as pattern}
        <button 
          class="pattern-item"
          on:click={() => createShape(pattern)}
        >
          <div class="pattern-preview" style="background-color: {pattern.type === 'rect' ? '#00ff00' : 
            pattern.type === 'circle' ? '#ff0000' : 
            pattern.type === 'triangle' ? '#0000ff' : '#ff00ff'}">
          </div>
          <span>{pattern.name}</span>
        </button>
      {/each}
    </div>
  </div>
  
  <div class="grid-container" bind:this={canvas}>
    <canvas id="fabric-canvas"></canvas>
  </div>
</div>
