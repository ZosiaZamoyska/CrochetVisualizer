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
  import { propagateData } from '$lib/NodeDataPropagation.svelte';
  import { mergeWithDefaultPatterns, getDefaultPatterns } from '$lib/utils/defaultPatterns.js';
  import { logAction, ActionTypes } from '$lib/utils/userStudyLogger';
  import UserStudyControls from '$lib/UserStudyControls.svelte';
  import PatternNode from './PatternNode.svelte';
  import TextNode from './TextNode.svelte';
  import ExportNode from './ExportNode.svelte';
  import FileNameNode from './FileNameNode.svelte';
  import ColorNode from './ColorNode.svelte';
  import ImageNode from './ImageNode.svelte';
  
  let savedPatterns = [];
  let savedFlows = [];
  const nodes = writable([]);
  const edges = writable([]);
  let nextNodeId = 1;
  let nodesInitialized = false;
  let previousEdges = [];
  let showFlowsMenu = false;

  // Watch for changes in nodes
  $: if ($nodes.length > 0 && !nodesInitialized) {
    nodesInitialized = true;
    // Initialize node data in the store
    $nodes.forEach(node => {
      updateNodeData(node.id, node.data);
    });
    
    // Set the current phase to project composition when in design view
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
      // Log node deletion
      logAction(ActionTypes.NODE_DELETE, `Nodes deleted: ${deletedNodeIds.join(', ')}`);
      
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
    
    // Log node addition
    logAction(ActionTypes.NODE_ADD, `Pattern node added: ${pattern.name}`, {
      position,
      nodeType: 'pattern'
    });
    
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
    
    // Log node addition
    logAction(ActionTypes.NODE_ADD, 'Text node added', {
      position,
      nodeType: 'text'
    });
    
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
    
    // Log node addition
    logAction(ActionTypes.NODE_ADD, 'Export node added', {
      position,
      nodeType: 'export'
    });
    
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
      
      // Log connection
      logAction(ActionTypes.NODE_ADD, `Edge added: ${params.source} -> ${params.target}`, {
        source: params.source,
        target: params.target
      });
      
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

  // Function to save the current flow as a template
  function saveCurrentFlow() {
    // Record pattern save/export    
    // Log save action
    logAction(ActionTypes.SAVE, 'Flow saved as template');
    
    // Ask for a name for this flow
    const flowName = prompt('Enter a name for this flow template:');
    if (!flowName) return; // User cancelled
    
    // Create a flow object
    const flow = {
      id: Date.now(),
      name: flowName,
      timestamp: new Date().toISOString(),
      nodes: $nodes,
      edges: $edges
    };
    
    // Load existing flows from localStorage
    let flows = [];
    const saved = localStorage.getItem('savedFlows');
    if (saved) {
      try {
        flows = JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved flows:', error);
      }
    }
    
    // Add the new flow
    flows.push(flow);
    
    // Save back to localStorage
    localStorage.setItem('savedFlows', JSON.stringify(flows));
    
    // Update the flows list
    savedFlows = flows;
    
    alert(`Flow "${flowName}" saved as template!`);
  }
  
  // Function to load a saved flow
  function loadFlow(flow) {
    // Record project composition activity
    
    // Log loading action
    logAction(ActionTypes.VISUALIZATION_CHANGE, `Flow template loaded: ${flow.name}`);
    
    if (confirm('Loading a flow template will replace your current design. Continue?')) {
      // Set the nodes and edges from the saved flow
      nodes.set(flow.nodes);
      edges.set(flow.edges);
      
      // Find the highest node ID to set nextNodeId
      const highestId = flow.nodes.reduce((max, node) => {
        const idNum = parseInt(node.id.replace('node-', ''));
        return isNaN(idNum) ? max : Math.max(max, idNum);
      }, 0);
      
      nextNodeId = highestId + 1;
      
      // Initialize node data in the store
      nodeDataStore.update(store => {
        // Clear the store first
        return {};
      });
      
      flow.nodes.forEach(node => {
        updateNodeData(node.id, node.data);
      });
      
      // Toggle off the flows menu
      showFlowsMenu = false;
      
      // Refresh the flow to ensure all connections are properly established
      setTimeout(refreshFlow, 100);
    }
  }
  
  // Function to delete a saved flow
  function deleteFlow(id) {
    // Record correction
    
    // Log deletion
    const flowToDelete = savedFlows.find(f => f.id === id);
    logAction(ActionTypes.NODE_DELETE, `Flow template deleted: ${flowToDelete?.name || id}`);
    
    if (confirm('Are you sure you want to delete this flow template?')) {
      // Filter out the flow to delete
      savedFlows = savedFlows.filter(f => f.id !== id);
      
      // Save back to localStorage
      localStorage.setItem('savedFlows', JSON.stringify(savedFlows));
    }
  }

  onMount(() => {
    // Set the current phase to project composition when in design view
    
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
    
    // Load saved flows from localStorage
    const savedFlowsData = localStorage.getItem('savedFlows');
    if (savedFlowsData) {
      try {
        savedFlows = JSON.parse(savedFlowsData);
      } catch (error) {
        console.error('Error parsing saved flows:', error);
        savedFlows = [];
      }
    }
    
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

    // Set the current phase to project composition when in design view
    
    // Enhance existing functions with metrics tracking
    const originalHandleConnect = handleConnect;
    handleConnect = (params) => {
      originalHandleConnect(params);
    };
    
    const originalSaveCurrentFlow = saveCurrentFlow;
    saveCurrentFlow = () => {
      originalSaveCurrentFlow();
    };
    
    const originalLoadFlow = loadFlow;
    loadFlow = (flow) => {
      originalLoadFlow(flow);
    };
    
    const originalDeleteFlow = deleteFlow;
    deleteFlow = (id) => {
      originalDeleteFlow(id);
    };
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

  // Function to save the current pattern to the library
  function saveCurrentPatternToLibrary() {
    // Check if there are any pattern nodes in the flow
    const patternNodes = $nodes.filter(node => node.type === 'pattern');
    
    if (patternNodes.length === 0) {
      alert('No pattern nodes found. Add at least one pattern node to save to library.');
      return;
    }
    
    let selectedPatternNode;
    
    // If there's only one pattern node, use it
    if (patternNodes.length === 1) {
      selectedPatternNode = patternNodes[0];
    } else {
      // If there are multiple pattern nodes, let the user choose
      const patternOptions = patternNodes.map((node, index) => 
        `${index + 1}: ${node.data.label || node.data.pattern?.name || 'Unnamed pattern'}`
      );
      
      const selection = prompt(
        `Multiple patterns found. Enter the number of the pattern to save:\n\n${patternOptions.join('\n')}`,
        '1'
      );
      
      if (!selection) return; // User cancelled
      
      const selectedIndex = parseInt(selection) - 1;
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= patternNodes.length) {
        alert('Invalid selection. Please enter a valid number.');
        return;
      }
      
      selectedPatternNode = patternNodes[selectedIndex];
    }
    
    const pattern = selectedPatternNode.data.pattern;
    
    if (!pattern) {
      alert('Selected node does not contain a valid pattern.');
      return;
    }
    
    // Ask for a custom name (default to the current pattern name)
    const customName = prompt('Enter a name for this pattern:', pattern.name);
    if (!customName) return; // User cancelled
    
    // Create a new pattern object with a unique ID and the custom name
    const newPattern = {
      ...pattern,
      id: Date.now(),
      name: customName,
      timestamp: new Date().toISOString()
    };
    
    // Log save action
    logAction(ActionTypes.SAVE, `Pattern saved to library: ${customName}`);
    
    // Record pattern save/export
    
    // Load existing patterns from localStorage
    let userPatterns = [];
    const saved = localStorage.getItem('savedPatterns');
    if (saved) {
      try {
        userPatterns = JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved patterns:', error);
      }
    }
    
    // Add the new pattern
    userPatterns.push(newPattern);
    
    // Save back to localStorage
    localStorage.setItem('savedPatterns', JSON.stringify(userPatterns));
    
    // Update the patterns in the sidebar
    savedPatterns = mergeWithDefaultPatterns(userPatterns);
    
    alert(`Pattern "${customName}" saved to library!`);
  }

  // Add metrics tracking to the SvelteFlow component
  function handleNodesChange(event) {
    // Track node deletions for metrics
    if (event.detail.some(change => change.type === 'remove')) {
    }
  }
  
  function handleEdgesChange(event) {
    // Track edge deletions for metrics
    if (event.detail.some(change => change.type === 'remove')) {
    }
    handleEdgesChange(event);
  }

  function savePatternToLibrary(pattern, customName) {
    // Load existing patterns from localStorage
    let userPatterns = [];
    const saved = localStorage.getItem('savedPatterns');
    if (saved) {
      try {
        userPatterns = JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved patterns:', error);
      }
    }
    
    // Add the new pattern
    userPatterns.push(newPattern);
    
    // Save back to localStorage
    localStorage.setItem('savedPatterns', JSON.stringify(userPatterns));
    
    // Update the patterns in the sidebar
    savedPatterns = mergeWithDefaultPatterns(userPatterns);
    
    alert(`Pattern "${customName}" saved to library!`);
  }
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
      
      <button class="save-button" on:click={saveCurrentPatternToLibrary}>
        Save Pattern to Library
      </button>
      
      <button class="flow-button" on:click={saveCurrentFlow}>
        Save Flow Template
      </button>
      
      <button class="flow-button" on:click={() => showFlowsMenu = !showFlowsMenu}>
        {showFlowsMenu ? 'Hide Flow Templates' : 'Load Flow Template'}
      </button>
    </div>
    
    {#if showFlowsMenu}
      <div class="flows-menu">
        <h3>Saved Flow Templates</h3>
        {#if savedFlows.length === 0}
          <p class="no-flows">No saved flow templates</p>
        {:else}
          {#each savedFlows as flow}
            <div class="flow-item">
              <div class="flow-info">
                <span class="flow-name">{flow.name}</span>
                <span class="flow-date">{new Date(flow.timestamp).toLocaleDateString()}</span>
              </div>
              <div class="flow-actions">
                <button class="flow-load" on:click={() => loadFlow(flow)}>Load</button>
                <button class="flow-delete" on:click={() => deleteFlow(flow.id)}>Delete</button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
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

  .save-button {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #38a169;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  
  .save-button:hover {
    background: #2f855a;
  }

  .flow-button {
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #805ad5;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  
  .flow-button:hover {
    background: #6b46c1;
  }
  
  .flows-menu {
    margin-top: 1rem;
    padding: 0.5rem;
    background: #f0f0f0;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  .flows-menu h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }
  
  .no-flows {
    font-style: italic;
    color: #666;
    font-size: 0.9rem;
  }
  
  .flow-item {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .flow-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  
  .flow-name {
    font-weight: bold;
  }
  
  .flow-date {
    font-size: 0.8rem;
    color: #666;
  }
  
  .flow-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .flow-actions button {
    flex: 1;
    padding: 0.25rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: bold;
  }
  
  .flow-load {
    background: #805ad5;
    color: white;
  }
  
  .flow-load:hover {
    background: #6b46c1;
  }
  
  .flow-delete {
    background: #e53e3e;
    color: white;
  }
  
  .flow-delete:hover {
    background: #c53030;
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

  .user-study-section {
    margin: 1rem 0;
    padding: 0.5rem;
    border-bottom: 1px solid #ddd;
  }
</style>
