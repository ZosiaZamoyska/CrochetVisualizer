<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    addEdge
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { patternToLoad } from '$lib/store';
  import PatternNode from './PatternNode.svelte';
  import TextNode from './TextNode.svelte';
  import ExportNode from './ExportNode.svelte';
  import FileNameNode from './FileNameNode.svelte';
  import ColorNode from './ColorNode.svelte';
  let savedPatterns = [];
  const nodes = writable([]);
  const edges = writable([]);
  let nextNodeId = 1;

  const instructions = [
    {
      id: 'text-box',
      name: 'Text Box',
      type: 'text'
    },
    {
      id: 'color-picker',
      name: 'Color Picker',
      type: 'color'
    },
    {
      id: 'file-name',
      name: 'File Name',
      type: 'fileName'
    },
    {
      id: 'export-button',
      name: 'Export Button',
      type: 'export'  
    }
  ];




  // Function to add a new pattern node to the canvas
  function addPatternNode(pattern, position) {
    const newNode = {
      id: `node-${nextNodeId}`,
      type: 'pattern',
      position,
      data: { 
        id: `node-${nextNodeId}`,
        label: pattern.name,
        image: pattern.preview,
        chart: pattern.chart,
        preview: pattern.preview,
        formattedPattern: pattern.formattedPattern,
        pattern,
        instructions: [{
          type: 'pattern',
          name: pattern.name,
          preview: pattern.preview,
          grid: pattern.grid,
          formattedPattern: pattern.formattedPattern
        }]
      }
    };
    
    nextNodeId++;
    $nodes = [...$nodes, newNode];
  }

  // Function to add a new text box node to the canvas
  function addTextNode(position) {
    const newNode = {
      id: `node-${nextNodeId}`,
      type: 'text',
      position,
      data: { 
        id: `node-${nextNodeId}`,
        label: 'Text Box',
        text: 'Double click to edit',
        instructions: [{
          type: 'text',
          content: 'Double click to edit'
        }]
      }
    };
    
    nextNodeId++;
    $nodes = [...$nodes, newNode];
  }

  function addExportNode(position) {
    const newNode = {
      id: `node-${nextNodeId}`,
      type: 'export',
      position,
      data: { 
        id: `node-${nextNodeId}`,
        label: 'Export Pattern',
        instructions: [] // Initialize empty instructions array
      }
    };
    
    nextNodeId++;
    $nodes = [...$nodes, newNode];
  }

  function addFileNameNode(position) {
    const newNode = {
      id: `node-${nextNodeId}`,
      type: 'fileName',
      position,
      data: { 
        id: `node-${nextNodeId}`,
        label: 'File Name',
        fileName: 'crochet-pattern',
        instructions: [{
          type: 'fileName',
          fileName: 'crochet-pattern'
        }]
      }
    };
    
    nextNodeId++;
    $nodes = [...$nodes, newNode];
  }

  function addColorNode(position) {
    const newNode = {
      id: `node-${nextNodeId}`,
      type: 'color',
      position,
      data: { 
        id: `node-${nextNodeId}`,
        label: 'Color Picker',
        color: '#000000',
        colorName: 'Black',
        instructions: [{
          type: 'color',
          color: '#000000',
          colorName: 'Black'
        }]
      }
    };
    
    nextNodeId++;
    $nodes = [...$nodes, newNode];
  }

  // Handle drag and drop from pattern menu
  function handleDragStart(event, item) {
    event.dataTransfer.setData('item', JSON.stringify(item));
  }

  function handleDrop(event) {
    event.preventDefault();
    const item = JSON.parse(event.dataTransfer.getData('item'));
    const bounds = event.target.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };

    if (item.type === 'text') {
      addTextNode(position);
    } else if (item.type === 'export') {
      addExportNode(position);
    } else if (item.type === 'fileName') {
      addFileNameNode(position);
    } else if (item.type === 'color') {
      addColorNode(position);
    } else {
      addPatternNode(item, position);
    }
  }

  // Handle edge connections
  function handleConnect(params) {
    console.log('handleConnect called with params:', params);
    
    if (params.source && params.target) {
      console.log('Adding edge:', params.source, '->', params.target);
      
      // Update edges using addEdge helper
      $edges = addEdge(params, $edges);

    }
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

    // Initialize canvas with default nodes
    const initialNodes = [
      {
        id: 'node-1',
        type: 'fileName',
        position: { x: 100, y: 100 },
        data: { 
          id: 'node-1',
          label: 'File Name',
          fileName: 'crochet-pattern',
          instructions: [{
            type: 'fileName',
            fileName: 'crochet-pattern'
          }]
        }
      },
      {
        id: 'node-2',
        type: 'export',
        position: { x: 700, y: 700 },
        data: { 
          id: 'node-2',
          label: 'Export Pattern',
          instructions: []
        }
      }
    ];

    // Set initial nodes
    $nodes = initialNodes;
    nextNodeId = 3; // Set nextNodeId to 3 since we used 1 and 2
  });

  // Flow configuration
  const flowConfig = {
    fitView: true,
    nodeTypes: {
      pattern: PatternNode,
      text: TextNode,
      export: ExportNode,
      fileName: FileNameNode,
      color: ColorNode
    },
    defaultEdgeOptions: {
      type: 'default',
      animated: true
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

    <h2>Instructions</h2>
    <div class="instruction-list">
      {#each instructions as instruction}
        <div 
          class="instruction-item"
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, instruction)}
        >
          <span>{instruction.name}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="canvas-container" on:drop={handleDrop} on:dragover={(e) => e.preventDefault()}>
    <SvelteFlow 
      {nodes} 
      {edges} 
      nodeTypes={flowConfig.nodeTypes} 
      fitView={flowConfig.fitView}
      defaultEdgeOptions={flowConfig.defaultEdgeOptions}
      on:connect={handleConnect}
    >
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

  .instruction-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .instruction-item {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: move;
    transition: background-color 0.2s;
  }

  .instruction-item:hover {
    background: #f0f0f0;
  }
</style>
