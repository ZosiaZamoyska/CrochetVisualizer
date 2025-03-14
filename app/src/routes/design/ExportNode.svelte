<script>
  import { Handle, Position, useNodeConnections, useNodesData } from '@xyflow/svelte';
  import { exportPatternToPDF } from '$lib/utils/export';
  export let data;
  export let id;

  const connections = useNodeConnections({
    id,
    handleType: 'target'
  });

  $: nodesData = useNodesData($connections.map((connection) => connection.source));
  
  // Update metadata whenever connections change
  $: if ($nodesData) {
    data.instructions = [
      ...$nodesData.flatMap(node => {
        if (node.type === 'text') {
          return [{
            type: 'text',
            content: node.data.text
          }];
        }
        return node.data.instructions || [];
      })
    ];
    console.log(data.instructions);
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
  }

  .preview-content {
    max-height: 200px;
    overflow-y: auto;
    padding: 8px;
    background: white;
    border-radius: 4px;
    border: 1px solid #eee;
  }

  .no-connections {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 8px;
  }

  .connections-preview {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .preview-title {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }

  .pattern-preview {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
  }

  .pattern-name {
    font-weight: 500;
    margin-bottom: 4px;
  }

  .pattern-text {
    white-space: pre-line;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.4;
  }

  .text-preview {
    padding: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 12px;
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