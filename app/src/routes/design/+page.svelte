<script>
  import { onMount } from 'svelte';
  import '$lib/App.css';
  import ShapeLibrary from '$lib/components/ShapeLibrary.svelte';
  import Canvas from '$lib/components/Canvas.svelte';
  import { PATTERNS, SHAPE_TYPES, getRandomPosition, alignShapes } from '$lib/shapes';

  let shapes = [];
  let connections = [];
  let selectedEdge = null;
  let selectedShape = null;
  let isEdgeSelectionMode = false;
  let connectionStep = 0; // 0: not connecting, 1: selecting first edge, 2: selecting second edge

  function handleShapeSelect(pattern) {
    const position = getRandomPosition(document.querySelector('.canvas-container'));
    const { geometry, edges } = pattern.createGeometry();
    
    const shape = {
      id: Date.now(),
      type: pattern.type,
      position: position,
      geometry: geometry,
      edges: edges,
      fill: pattern.type === SHAPE_TYPES.SQUARE ? '#00ff00' : 
            pattern.type === SHAPE_TYPES.HEXAGON ? '#ff0000' : '#0000ff'
    };

    shapes = [...shapes, shape];
  }

  function handleShapeDrag(shape) {
    shapes = shapes.map(s => s.id === shape.id ? shape : s);
  }

  function handleEdgeSelect(shape, edge) {
    if (!isEdgeSelectionMode || connectionStep === 0) return;

    console.log('Edge selection:', { step: connectionStep, shapeId: shape.id, edgeId: edge.id });

    if (connectionStep === 1) {
      // First edge selection
      selectedEdge = { shape, edge };
      selectedShape = shape;
      connectionStep = 2;
      console.log('First edge selected, waiting for second edge');
    } else if (connectionStep === 2) {
      if (selectedShape.id === shape.id) {
        // Same shape selected - ignore
        console.log('Same shape selected, ignoring');
        return;
      }
      
      // Second edge selection - different shape
      console.log('Second edge selected, connecting shapes');
      const alignedShape = alignShapes(selectedShape, selectedEdge.edge, shape, edge);
      shapes = shapes.map(s => s.id === alignedShape.id ? alignedShape : s);

      connections = [...connections, {
        id: Date.now(),
        edge1: selectedEdge,
        edge2: { shape, edge }
      }];
      
      // Reset connection state
      selectedEdge = null;
      selectedShape = null;
      connectionStep = 0;
      isEdgeSelectionMode = false;
    }
  }

  function startEdgeConnection() {
    isEdgeSelectionMode = true;
    connectionStep = 1;
    selectedEdge = null;
    selectedShape = null;
    console.log('Starting edge connection');
  }

  function cancelEdgeConnection() {
    isEdgeSelectionMode = false;
    connectionStep = 0;
    selectedEdge = null;
    selectedShape = null;
    console.log('Cancelled edge connection');
  }

  $: connectionStatus = connectionStep === 0 ? '' :
                       connectionStep === 1 ? 'Select first edge' :
                       'Select second edge';
</script>

<div class="container">
  <div class="left-panel">
    <ShapeLibrary onShapeSelect={handleShapeSelect} />
  </div>
  
  <div class="main-content">
    <Canvas
      {shapes}
      {connections}
      {isEdgeSelectionMode}
      {selectedEdge}
      onShapeDrag={handleShapeDrag}
      onEdgeSelect={handleEdgeSelect}
    />
    
    <div class="controls">
      {#if connectionStep === 0}
        <button 
          class="connect-button"
          on:click={startEdgeConnection}
        >
          Connect Edges
        </button>
      {:else}
        <div class="connection-status">
          <span class="status-text">{connectionStatus}</span>
          <button 
            class="cancel-button"
            on:click={cancelEdgeConnection}
          >
            Cancel
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    gap: 20px;
    padding: 20px;
    height: 100vh;
  }

  .left-panel {
    width: 250px;
  }

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .controls {
    display: flex;
    justify-content: center;
    padding: 10px;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .status-text {
    font-size: 1.1em;
    color: var(--text-primary);
  }

  button {
    padding: 8px 16px;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  button:hover {
    background-color: var(--bg-hover);
  }

  .connect-button {
    background-color: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }

  .cancel-button {
    background-color: var(--error-color, #ff4444);
    color: white;
    border-color: var(--error-color, #ff4444);
  }
</style>
