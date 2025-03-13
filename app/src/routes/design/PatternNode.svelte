<script>
  import { Handle, Position } from '@xyflow/svelte';
  export let data;
</script>

<div class="custom-node">
  <Handle type="target" position={Position.Left} />

  <div class="preview-container">
    {#if data.image}
      <img src={data.image} alt={data.label} />
    {:else}
      <div class="no-preview">No preview</div>
    {/if}
  </div>
  <Handle type="source" position={Position.Right} />

</div>

<style>
  .custom-node {
    padding: 10px;
    border-radius: 5px;
    background: white;
    border: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: relative;
  }
  .preview-container {
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border-radius: 4px;
    overflow: hidden;
  }
  .preview-container img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .node-label {
    font-size: 14px;
    font-weight: 500;
  }
  .load-button {
    padding: 4px 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .load-button:hover {
    background: var(--primary-color-dark);
  }
  .no-preview {
    color: #666;
    font-size: 12px;
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