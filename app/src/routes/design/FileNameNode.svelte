<script>
  import { Handle, Position } from '@xyflow/svelte';
  export let data;
  export let id;

  let fileName = 'crochet-pattern';

  function handleFileNameChange(event) {
    fileName = event.target.value;
    data.fileName = fileName;
    data.instructions = [{
      type: 'fileName',
      fileName: fileName
    }];
  }
</script>

<div class="file-name-node">
  <label for="fileName">File Name:</label>
  <input 
    type="text" 
    id="fileName" 
    bind:value={fileName}
    on:change={handleFileNameChange}
    placeholder="Enter file name"
  />
  <Handle type="source" position={Position.Right} />

</div>

<style>
  .file-name-node {
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 200px;
  }

  label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: #666;
  }

  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  input:focus {
    outline: none;
    border-color: #4a9eff;
  }
</style> 