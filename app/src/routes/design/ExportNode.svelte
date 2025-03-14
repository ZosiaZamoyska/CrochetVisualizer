<script>
  import { Handle, Position, useNodeConnections, useNodesData } from '@xyflow/svelte';
  import { exportPatternToPDF } from '$lib/utils/export';
  import { nodeDataStore } from '$lib/store';
  export let data;
  export let id;

  const connections = useNodeConnections({
    id,
    handleType: 'target'
  });

  $: nodesData = useNodesData($connections.map((connection) => connection.source));
  
  // Subscribe to the nodeDataStore to get updated data
  let storeData;
  nodeDataStore.subscribe(store => {
    storeData = store;
  });
  
  // Update metadata whenever connections change or nodeDataStore updates
  $: if ($nodesData && storeData) {
    // Collect instructions from all connected nodes
    const instructions = [];
    
    $connections.forEach(connection => {
      const sourceId = connection.source;
      const sourceData = storeData[sourceId];
      
      if (sourceData && sourceData.instructions) {
        instructions.push(...sourceData.instructions);
      }
    });
    
    // Update the node data with the collected instructions
    data.instructions = instructions;
    console.log('Export node instructions updated:', data.instructions);
  }
  
  async function handleExport() {
    try {
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