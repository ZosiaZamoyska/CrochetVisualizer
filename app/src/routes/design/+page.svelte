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
  import { patternToLoad, nodeDataStore, updateNodeData } from '$lib/store';
  import { propagateData } from '$lib/NodeDataPropagation';
  import { mergeWithDefaultPatterns } from '$lib/utils/defaultPatterns.js';
  import PatternNode from './PatternNode.svelte';
  import TextNode from './TextNode.svelte';
  import ExportNode from './ExportNode.svelte';
  import FileNameNode from './FileNameNode.svelte';
  import ColorNode from './ColorNode.svelte';
  import ImageNode from './ImageNode.svelte';
  
  let savedPatterns = [];
  const nodes = writable([]);
  const edges = writable([]);
  let nextNodeId = 1;
  let nodesInitialized = false;
  let previousEdges = [];

  // Watch for changes in nodes
  $: if ($nodes.length > 0 && !nodesInitialized) {
    nodesInitialized = true;
    // Initialize node data in the store
    $nodes.forEach(node => {
      updateNodeData(node.id, node.data);
    });
  }

  // Watch for node deletions
  $: if (nodesInitialized && $nodes.length > 0) {
    // Check if any nodes were deleted
    const nodeIds = $nodes.map(node => node.id);
    
    // Get all node IDs in the store
    let storeNodeIds = [];
    let deletedNodeIds = [];
    
    nodeDataStore.update(store => {
      storeNodeIds = Object.keys(store);
      
      // Find deleted nodes
      deletedNodeIds = storeNodeIds.filter(id => !nodeIds.includes(id));
      
      // Remove deleted nodes from the store
      deletedNodeIds.forEach(id => {
        delete store[id];
        console.log(`Node ${id} was deleted, removing from store`);
      });
      
      return store;
    });
    
    // If any nodes were deleted, refresh all export nodes
    if (deletedNodeIds.length > 0) {
      console.log(`Nodes were deleted: ${deletedNodeIds.join(', ')}, refreshing export nodes`);
      
      // Find all edges that reference deleted nodes
      const edgesToRemove = $edges.filter(edge => 
        deletedNodeIds.includes(edge.source) || deletedNodeIds.includes(edge.target)
      );
      
      // If there are edges to remove, update the edges store
      if (edgesToRemove.length > 0) {
        console.log(`Removing ${edgesToRemove.length} edges that reference deleted nodes`);
        const updatedEdges = $edges.filter(edge => 
          !deletedNodeIds.includes(edge.source) && !deletedNodeIds.includes(edge.target)
        );
        edges.set(updatedEdges);
      }
      
      // Refresh all export nodes using their registered refresh functions
      Object.entries(exportNodeRefreshFunctions).forEach(([id, refreshFunction]) => {
        console.log(`Refreshing export node ${id} after node deletion`);
        refreshFunction();
      });
    }
  }

  // Watch for changes in edges
  $: if ($edges) {
    // Check for deleted edges
    if (previousEdges.length > $edges.length) {
      console.log('Edge was deleted, updating data flow');
      
      // Find deleted edges
      const currentEdgeIds = $edges.map(edge => `${edge.source}-${edge.target}`);
      const deletedEdges = previousEdges.filter(edge => 
        !currentEdgeIds.includes(`${edge.source}-${edge.target}`)
      );
      
      // For each deleted edge, update the target node
      deletedEdges.forEach(edge => {
        const targetNode = $nodes.find(node => node.id === edge.target);
        if (targetNode && targetNode.type === 'export') {
          console.log(`Edge to export node ${edge.target} was deleted, refreshing`);
          
          // Use the registered refresh function if available
          if (exportNodeRefreshFunctions[edge.target]) {
            exportNodeRefreshFunctions[edge.target]();
          }
        }
      });
    } else if (previousEdges.length < $edges.length) {
      // New edge was added
      const newEdges = $edges.filter(edge => 
        !previousEdges.some(pe => pe.source === edge.source && pe.target === edge.target)
      );
      
      // For each new edge, propagate data
      newEdges.forEach(edge => {
        propagateData({
          edges: $edges,
          nodes: $nodes,
          sourceId: edge.source
        });
        
        // If the target is an export node, refresh it
        const targetNode = $nodes.find(node => node.id === edge.target);
        if (targetNode && targetNode.type === 'export' && exportNodeRefreshFunctions[edge.target]) {
          console.log(`New edge to export node ${edge.target} was added, refreshing`);
          exportNodeRefreshFunctions[edge.target]();
        }
      });
    } else {
      // For each edge, propagate data from source to target
      $edges.forEach(edge => {
        propagateData({
          edges: $edges,
          nodes: $nodes,
          sourceId: edge.source
        });
      });
    }
    
    // Update previous edges
    previousEdges = [...$edges];
  }

  // Keep track of export nodes for refreshing
  const exportNodeRefreshFunctions = {};

  // Function to register an export node
  function registerExportNode(id, refreshFunction) {
    console.log(`Registering export node ${id} for refreshing`);
    exportNodeRefreshFunctions[id] = refreshFunction;
  }

  // Function to unregister an export node
  function unregisterExportNode(id) {
    console.log(`Unregistering export node ${id}`);
    delete exportNodeRefreshFunctions[id];
  }

  // Function to get all addexport nodes
  function getFlowNodes() {
    return $nodes;
  }

  // Function to force refresh the entire flow
  function refreshFlow() {
    console.log('Manually refreshing the entire flow');
    
    // First, update the nodeDataStore to ensure it's clean
    nodeDataStore.update(store => {
      // Remove any nodes that no longer exist
      const nodeIds = $nodes.map(node => node.id);
      Object.keys(store).forEach(id => {
        if (!nodeIds.includes(id)) {
          delete store[id];
          console.log(`Cleaning up node ${id} from store during refresh`);
        }
      });
      return store;
    });
    
    // Then propagate data for all edges
    $edges.forEach(edge => {
      // Only propagate if the source node still exists
      if ($nodes.some(node => node.id === edge.source)) {
        propagateData({
          edges: $edges,
          nodes: $nodes,
          sourceId: edge.source
        });
      }
    });
    
    // Finally, refresh all export nodes using their registered refresh functions
    Object.entries(exportNodeRefreshFunctions).forEach(([id, refreshFunction]) => {
      console.log(`Refreshing export node ${id} via registered function`);
      refreshFunction();
    });
  }

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
    },
    {
      id: 'image-upload',
      name: 'Image Upload',
      type: 'image'
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
    
    // Add node data to store
    updateNodeData(newNode.id, newNode.data);
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
    
    // Add node data to store
    updateNodeData(newNode.id, newNode.data);
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
    
    // Add node data to store
    updateNodeData(newNode.id, newNode.data);
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
    
    // Add node data to store
    updateNodeData(newNode.id, newNode.data);
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
    
    // Add node data to store
    updateNodeData(newNode.id, newNode.data);
  }

  function addImageNode(position) {
    const newNode = {
      id: `node-${nextNodeId}`,
      type: 'image',
      position,
      data: { 
        id: `node-${nextNodeId}`,
        label: 'Image',
        imageUrl: null,
        caption: '',
        instructions: []
      }
    };
    
    nextNodeId++;
    $nodes = [...$nodes, newNode];
    
    // Add node data to store
    updateNodeData(newNode.id, newNode.data);
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
    } else if (item.type === 'image') {
      addImageNode(position);
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
      
      // Trigger data propagation
      setTimeout(() => {
        propagateData({
          edges: $edges,
          nodes: $nodes,
          sourceId: params.source
        });
      }, 0);
    }
  }

  // Handle node changes
  function handleNodeChange(event) {
    // If a node's data has changed, update the store and propagate
    if (event.detail.node && event.detail.node.data) {
      const nodeId = event.detail.node.id;
      updateNodeData(nodeId, event.detail.node.data);
      
      // Propagate data to connected nodes
      propagateData({
        edges: $edges,
        nodes: $nodes,
        sourceId: nodeId
      });
    }
  }

  // Handle edge changes
  function handleEdgesChange(event) {
    console.log('Edges changed:', event);
  }

  // Load pattern into the main editor
  function loadPatternToEditor(nodeId) {
    const node = $nodes.find(n => n.id === nodeId);
    if (node) {
      patternToLoad.set(node.data.pattern);
    }
  }

  // Function to check if a pattern is a default pattern
  function isDefaultPattern(id) {
    // Get default pattern IDs
    const defaultPatterns = getDefaultPatterns();
    const defaultPatternIds = new Set(defaultPatterns.map(p => p.id));
    return defaultPatternIds.has(id);
  }

  onMount(() => {
    // Load saved patterns from localStorage
    let userPatterns = [];
    const saved = localStorage.getItem('savedPatterns');
    if (saved) {
      try {
        userPatterns = JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved patterns:', error);
        userPatterns = [];
      }
    }

    // Merge user patterns with default patterns
    savedPatterns = mergeWithDefaultPatterns(userPatterns);
    
    // Save the merged patterns back to localStorage
    localStorage.setItem('savedPatterns', JSON.stringify(savedPatterns));

    // Add loadPattern to window for node button click handling
    window.loadPattern = loadPatternToEditor;
    
    // Add functions for export nodes to access
    window.getFlowNodes = getFlowNodes;
    window.registerExportNode = registerExportNode;
    window.unregisterExportNode = unregisterExportNode;

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
    
    // Initialize node data in the store
    initialNodes.forEach(node => {
      updateNodeData(node.id, node.data);
    });
  });

  // Flow configuration
  const flowConfig = {
    fitView: true,
    nodeTypes: {
      pattern: PatternNode,
      text: TextNode,
      export: ExportNode,
      fileName: FileNameNode,
      color: ColorNode,
      image: ImageNode
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
          <div class="pattern-info">
            <span class="pattern-name">{pattern.name}</span>
            {#if isDefaultPattern(pattern.id)}
              <span class="default-badge">Default</span>
            {/if}
          </div>
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
    
    <div class="actions">
      <button class="refresh-button" on:click={refreshFlow}>
        Refresh Flow
      </button>
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
      on:nodechange={handleNodeChange}
      on:edgeschange={handleEdgesChange}
      deleteKeyCode="Delete"
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
  
  .actions {
    margin-top: 1rem;
    padding: 0.5rem;
    border-top: 1px solid #ddd;
  }
  
  .refresh-button {
    width: 100%;
    padding: 0.5rem;
    background: var(--primary-color, #4299e1);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  
  .refresh-button:hover {
    background: var(--primary-color-dark, #3182ce);
  }

  .pattern-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .pattern-name {
    font-weight: bold;
  }
  
  .default-badge {
    font-size: 0.7rem;
    background: var(--primary-color, #4299e1);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    align-self: flex-start;
  }
</style>
