<script>
  import { Handle, Position, useNodeConnections, useNodesData } from '@xyflow/svelte';
  //import { updateDownstreamInstructions } from './+page.svelte';

  export let data;
  let isEditing = false;
  let text = data.text;

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
        type: 'text',
        content: data.text
      }
    ];
    console.log(data.instructions);
  }

  function handleDoubleClick() {
    isEditing = true;
  }

  function handleBlur() {
    isEditing = false;
    data.text = text;
    // Update instructions with new text
    data.instructions = [{
      type: 'text',
      content: text
    }];
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      isEditing = false;
      data.text = text;
      // Update instructions with new text
      data.instructions = [{
        type: 'text',
        content: text
      }];
    }
  }
</script>

<div class="text-node" on:dblclick={handleDoubleClick}>
  <Handle type="target" position={Position.Left} />
  
  <div 
    class="text-container"
  >
    {#if isEditing}
      <input
        type="text"
        bind:value={text}
        on:blur={handleBlur}
        on:keydown={handleKeydown}
        autofocus
      />
    {:else}
      <div class="text-content">{text}</div>
    {/if}
  </div>
  

  <Handle type="source" position={Position.Right} />
</div>

<style>
  .text-node {
    padding: 10px;
    border-radius: 5px;
    background: white;
    border: 1px solid #ddd;
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    min-width: 150px;
  }

  .text-container {
    flex: 1;
    padding: 8px;
    background: #f8f8f8;
    border-radius: 4px;
    cursor: text;
  }

  .text-content {
    color: #333;
    font-size: 14px;
  }

  input {
    width: 100%;
    padding: 4px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
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