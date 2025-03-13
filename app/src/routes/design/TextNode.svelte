<script>
  import { Handle, Position } from '@xyflow/svelte';
  export let data;
  let isEditing = false;
  let text = data.text;

  function handleDoubleClick() {
    isEditing = true;
  }

  function handleBlur() {
    isEditing = false;
    data.text = text;
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      isEditing = false;
      data.text = text;
    }
  }
</script>

<div class="text-node">
  <Handle type="target" position={Position.Left} />
  
  <div 
    class="text-container"
    on:dblclick={handleDoubleClick}
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