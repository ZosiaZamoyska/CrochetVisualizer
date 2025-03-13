<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { patternToLoad } from '$lib/store';
  import PatternNode from './PatternNode.svelte';

  let savedPatterns = [];
  const nodes = writable([]);
  const edges = writable([]);
  let nextNodeId = 1;

  // Function to add a new pattern node to the canvas
  function addPatternNode(pattern, position) {
    console.log('pattern', pattern);
    console.log('grid', pattern.grid);
    const newNode = {
      id: `node-${nextNodeId}`,
      type: 'pattern',
      position,
      data: { 
        id: `node-${nextNodeId}`,
        label: pattern.name,
        image: pattern.preview,
        pattern // Store the full pattern object for loading
      }
    };
    
    nextNodeId++;
    $nodes = [...$nodes, newNode];
  }

  // Handle drag and drop from pattern menu
  function handleDragStart(event, pattern) {
    event.dataTransfer.setData('pattern', JSON.stringify(pattern));
  }

  function handleDrop(event) {
    event.preventDefault();
    const pattern = JSON.parse(event.dataTransfer.getData('pattern'));
    const bounds = event.target.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
    addPatternNode(pattern, position);
  }

  // Load pattern into the main editor
  function loadPatternToEditor(nodeId) {
    const node = $nodes.find(n => n.id === nodeId);
    if (node) {
      patternToLoad.set(node.data.pattern);
    }
  }

  onMount(() => {
    // Load saved patterns from localStorage
    const saved = localStorage.getItem('savedPatterns');
    if (saved) {
      savedPatterns = JSON.parse(saved);
    }

    // Add loadPattern to window for node button click handling
    window.loadPattern = loadPatternToEditor;
  });

  // Flow configuration
  const flowConfig = {
    fitView: true,
    nodeTypes: {
      pattern: PatternNode
    }
  };
</script>

<div class="design-container">
  <div class="pattern-menu">
    <h2>Pattern Library</h2>
    <div class="pattern-list">
      {#each savedPatterns as pattern}
        <div 
          class="pattern-item"
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, pattern)}
        >
          {#if pattern.preview}
            <img src={pattern.preview} alt={pattern.name} />
          {:else}
            <div class="no-preview">No preview</div>
          {/if}
          <span>{pattern.name}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="canvas-container" on:drop={handleDrop} on:dragover={(e) => e.preventDefault()}>
    <SvelteFlow {nodes} {edges} {...flowConfig}>
      <Background />
      <Controls />
      <MiniMap />
    </SvelteFlow>
  </div>
</div>

<style>
  .design-container {
    display: flex;
    width: 100%;
    height: 100vh;
  }

  .pattern-menu {
    width: 250px;
    background: #f5f5f5;
    border-right: 1px solid #ddd;
    padding: 1rem;
    overflow-y: auto;
  }

  .pattern-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .pattern-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: move;
    transition: background-color 0.2s;
  }

  .pattern-item:hover {
    background: #f0f0f0;
  }

  .pattern-item img {
    width: 100px;
    height: 100px;
    object-fit: contain;
  }

  .canvas-container {
    flex: 1;
    height: 100%;
    background: #fafafa;
  }

  :global(.svelte-flow) {
    height: 100%;
  }

  :global(.svelte-flow__node) {
    background: transparent;
    border: none;
    padding: 0;
  }

  .no-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: #f0f0f0;
    color: #666;
    font-size: 0.8rem;
  }
</style>
