<script>
  import { Handle, Position, useNodeConnections, useNodesData } from '@xyflow/svelte';
  export let data;
  let dataView = false;
  // Store connections in metadata
  const connections = useNodeConnections({
    handleType: 'target'
  });

  $: nodesData = useNodesData($connections.map((connection) => connection.source));
  $: if (dataView) {
    data.image = data.preview;
  } else {
    data.image = data.chart;
  }
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
    <div class="pattern-name">{data.label}</div>

    {#if data.image}
      <img src={data.image} alt={data.label} />
    {:else}
      <div class="no-preview">No preview</div>
    {/if}
    <div class="switch-view">
      <p>View:</p>
      <label class="switch">
        <input type="checkbox" bind:checked={dataView}>
        <span class="slider round"></span>
      </label>
    </div>
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
  .switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
  }

  /* Hide default HTML checkbox */
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* The slider */
  .switch-view {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    gap: 10px;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: .4s;
    transition: .4s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: .4s;
    transition: .4s;
  }

  input:checked + .slider {
    background-color: #2196F3;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #2196F3;
  }

  input:checked + .slider:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
  }

  /* Rounded sliders */
  .slider.round {
    border-radius: 34px;
  }

  .slider.round:before {
    border-radius: 50%;
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