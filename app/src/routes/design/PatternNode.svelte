<script>
  import { Handle, Position, useNodeConnections, useNodesData } from '@xyflow/svelte';
  export let data;

  // Store connections in metadata
  const connections = useNodeConnections({
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
      }),
      {
        type: 'pattern',
        name: data.label,
        preview: data.image,
        grid: data.pattern.grid,
        formattedPattern: data.pattern.formattedPattern
      }
    ];
    console.log('data.instructions in pattern node');
    console.log(data.instructions);  }

  function handleLoad() {
    window.loadPattern(data.id);
  }
</script>

<div class="pattern-node">
  <Handle type="target" position={Position.Left} />
  
  <div class="pattern-content">
    {#if data.image}
      <img src={data.image} alt={data.label} />
    {:else}
      <div class="no-preview">No preview</div>
    {/if}
    <div class="pattern-name">{data.label}</div>
  </div>

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .pattern-node {
    padding: 10px;
    border-radius: 5px;
    background: white;
    border: 1px solid #ddd;
    min-width: 150px;
  }

  .pattern-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  img {
    width: 100px;
    height: 100px;
    object-fit: contain;
  }

  .no-preview {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    color: #666;
    font-size: 0.8rem;
  }

  .pattern-name {
    font-weight: 500;
  }

  button {
    padding: 4px 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }

  button:hover {
    background: var(--primary-color-dark);
  }
</style> 