<script>
  import { onMount } from 'svelte';
  import { getEdgePath, getShapePath, alignShapes } from '../shapes';

  export let shapes = [];
  export let connections = [];
  export let isEdgeSelectionMode = false;
  export let selectedEdge = null;
  export let onShapeDrag;
  export let onEdgeSelect;

  let canvas;
  let draggedShape = null;
  let dragOffset = { x: 0, y: 0 };

  function getConnectionPath(connection) {
    const edge1 = connection.edge1;
    const edge2 = connection.edge2;
    
    const start1 = edge1.edge.start.clone().add(edge1.shape.position);
    const end1 = edge1.edge.end.clone().add(edge1.shape.position);
    const start2 = edge2.edge.start.clone().add(edge2.shape.position);
    const end2 = edge2.edge.end.clone().add(edge2.shape.position);

    return `M ${start1.x} ${start1.y} L ${end1.x} ${end1.y}`;
  }

  function handleShapeMouseDown(shape, event) {
    if (isEdgeSelectionMode) return;
    
    draggedShape = shape;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    dragOffset = {
      x: x - shape.position.x,
      y: y - shape.position.y
    };
  }

  function handleMouseMove(event) {
    if (!draggedShape) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    draggedShape.position.set(x - dragOffset.x, y - dragOffset.y);
    onShapeDrag(draggedShape);
  }

  function handleMouseUp() {
    draggedShape = null;
  }

  function handleEdgeClick(shape, edge) {
    if (!isEdgeSelectionMode) return;
    onEdgeSelect(shape, edge);
  }

  onMount(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  });
</script>

<div class="canvas-container" bind:this={canvas}>
  <svg 
    width="100%" 
    height="100%" 
    viewBox="0 0 1200 800"
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
  >
    <!-- Draw connections first -->
    {#each connections as connection}
      <path
        d={getConnectionPath(connection)}
        stroke="#000"
        stroke-width="2"
        fill="none"
      />
    {/each}

    <!-- Draw shapes -->
    {#each shapes as shape}
      <g>
        <!-- Main shape -->
        <path
          d={getShapePath(shape)}
          fill={shape.fill}
          stroke="#000"
          stroke-width="2"
          on:mousedown={(e) => handleShapeMouseDown(shape, e)}
          style="cursor: {isEdgeSelectionMode ? 'default' : 'move'};"
        />
        
        <!-- Individual edges -->
        {#each shape.edges as edge}
          <path
            d={getEdgePath(edge, shape)}
            stroke={selectedEdge?.edge.id === edge.id ? '#00ff00' : 'transparent'}
            stroke-width="4"
            fill="none"
            on:click={() => handleEdgeClick(shape, edge)}
            style="cursor: {isEdgeSelectionMode ? 'pointer' : 'default'};"
          />
        {/each}
      </g>
    {/each}
  </svg>
</div>

<style>
  .canvas-container {
    flex: 1;
    background-color: var(--bg-secondary);
    border-radius: 8px;
    padding: 20px;
    min-height: 800px;
    width: 1200px;
    overflow: hidden;
  }

  svg {
    background-color: white;
    width: 1200px;
    height: 800px;
    display: block;
  }
</style> 