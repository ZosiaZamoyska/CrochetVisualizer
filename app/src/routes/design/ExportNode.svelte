<script>
  import { Handle, Position, useNodeConnections, useNodesData } from '@xyflow/svelte';
  import { exportPatternToPDF } from '$lib/utils/export';
  import { nodeDataStore } from '$lib/store';
  import { onMount, afterUpdate } from 'svelte';
  export let data;
  export let id;

  // Get all connections to this node
  const connections = useNodeConnections({
    id,
    handleType: 'target'
  });

  // Get data for all connected nodes
  $: nodesData = useNodesData($connections.map((connection) => connection.source));
  
  // Subscribe to the nodeDataStore to get updated data
  let storeData;
  nodeDataStore.subscribe(store => {
    storeData = store;
    
    // If this node exists in the store, sync its instructions
    if (store && store[id] && store[id].instructions) {
      if (JSON.stringify(data.instructions) !== JSON.stringify(store[id].instructions)) {
        console.log(`Syncing export node ${id} instructions from store`);
        data.instructions = [...store[id].instructions];
      }
    }
  });
  
  // Force refresh instructions from current connections
  function refreshInstructions() {
    if (!$connections || !storeData) return;
    
    console.log(`Refreshing export node ${id}, found ${$connections.length} connections`);
    
    // Debug connections
    $connections.forEach(conn => {
      console.log(`Connection: ${conn.source} -> ${conn.target}`);
      const sourceExists = storeData[conn.source] !== undefined;
      console.log(`Source ${conn.source} exists in store: ${sourceExists}`);
    });
    
    // Get all actual nodes from the parent component
    let actualNodeIds = [];
    if (window.getFlowNodes) {
      actualNodeIds = window.getFlowNodes().map(node => node.id);
      console.log(`Actual nodes in flow: ${actualNodeIds.join(', ')}`);
    }
    
    const instructions = [];
    
    // Only include connections where the source node still exists in both the store AND the actual nodes
    const validConnections = $connections.filter(connection => {
      const sourceExistsInStore = storeData[connection.source] !== undefined;
      const sourceExistsInFlow = actualNodeIds.includes(connection.source);
      return sourceExistsInStore && sourceExistsInFlow;
    });
    
    console.log(`Found ${validConnections.length} valid connections out of ${$connections.length} total`);
    
    validConnections.forEach(connection => {
      const sourceId = connection.source;
      const sourceData = storeData[sourceId];
      
      if (sourceData && sourceData.instructions) {
        instructions.push(...sourceData.instructions);
      }
    });
    
    // Update the node data with the collected instructions
    console.log(`Manually refreshing export node ${id} instructions, found ${instructions.length} items`);
    data.instructions = [...instructions];
    
    // Also update the store
    nodeDataStore.update(store => {
      if (store[id]) {
        store[id] = {
          ...store[id],
          instructions: [...instructions]
        };
      }
      return store;
    });
  }
  
  // Update metadata whenever connections change or nodeDataStore updates
  $: if ($nodesData && storeData) {
    // Get all actual nodes from the parent component
    let actualNodeIds = [];
    if (window.getFlowNodes) {
      actualNodeIds = window.getFlowNodes().map(node => node.id);
    }
    
    // Collect instructions from all connected nodes
    const instructions = [];
    
    // Only process connections where the source node still exists in both the store AND the actual nodes
    const validConnections = $connections.filter(connection => {
      const sourceExistsInStore = storeData[connection.source] !== undefined;
      const sourceExistsInFlow = actualNodeIds.includes(connection.source);
      return sourceExistsInStore && sourceExistsInFlow;
    });
    
    validConnections.forEach(connection => {
      const sourceId = connection.source;
      const sourceData = storeData[sourceId];
      
      if (sourceData && sourceData.instructions) {
        instructions.push(...sourceData.instructions);
      }
    });
    
    // Update the node data with the collected instructions
    if (JSON.stringify(data.instructions) !== JSON.stringify(instructions)) {
      data.instructions = [...instructions];
      console.log(`Export node ${id} instructions updated: ${instructions.length} items`);
    }
  }
  
  // After each update, ensure the data is in sync with the store
  afterUpdate(() => {
    if (storeData && storeData[id] && storeData[id].instructions) {
      if (JSON.stringify(data.instructions) !== JSON.stringify(storeData[id].instructions)) {
        data.instructions = [...storeData[id].instructions];
      }
    }
  });
  
  // On mount, register with parent to get actual nodes
  onMount(() => {
    // Register this node with the parent component
    if (window.registerExportNode) {
      window.registerExportNode(id, refreshInstructions);
    }
    
    return () => {
      // Unregister on unmount
      if (window.unregisterExportNode) {
        window.unregisterExportNode(id);
      }
    };
  });
  
  async function handleExport() {
    // Force refresh instructions before exporting
    refreshInstructions();
    
    try {
      console.log('Exporting with instructions:', data.instructions);
      await exportPatternToPDF(data.instructions);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export pattern. Please check the console for details.');
    }
  }
</script>

<div class="export-node">
  <Handle type="target" position={Position.Left} />
  
  <div class="export-container">
    <button 
      class="export-button"
      on:click={handleExport}
      disabled={!data.instructions || data.instructions.length === 0}
    >
      Export Pattern
    </button>
    
    <button 
      class="refresh-button"
      on:click={refreshInstructions}
      title="Refresh instructions from connected nodes"
    >
      Refresh
    </button>
    
    {#if data.instructions && data.instructions.length > 0}
      <div class="preview-badge">{data.instructions.length} items</div>
    {/if}
  </div>
</div>

<style>
  .export-node {
    padding: 10px;
    border-radius: 5px;
    background: white;
    border: 1px solid #ddd;
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    min-width: 200px;
  }

  .export-container {
    flex: 1;
    padding: 8px;
    background: #f8f8f8;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
  }

  .preview-badge {
    position: absolute;
    top: -10px;
    right: -10px;
    background: var(--primary-color, #4299e1);
    color: white;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: bold;
  }

  .export-button {
    width: 100%;
    padding: 8px 16px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .refresh-button {
    width: 100%;
    padding: 6px 12px;
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .refresh-button:hover {
    background: #e0e0e0;
  }

  .export-button:hover:not(:disabled) {
    background: var(--primary-color-dark);
  }

  .export-button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  :global(.svelte-flow__handle) {
    width: 8px;
    height: 8px;
    background: var(--primary-color);
  }

  :global(.svelte-flow__handle:hover) {
    background: var(--primary-color-dark);
  }
</style> 