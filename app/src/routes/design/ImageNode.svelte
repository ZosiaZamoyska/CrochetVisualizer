<script>
  import { Handle, Position } from '@xyflow/svelte';
  import { updateNodeData } from '$lib/store';
  export let data;
  export let id;

  let fileInput;
  let isEditing = false;
  let caption = data.caption || '';

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        data.imageUrl = e.target.result;
        // Update instructions for export
        const updatedInstructions = [{
          type: 'image',
          imageUrl: data.imageUrl,
          caption: data.caption
        }];
        
        data.instructions = updatedInstructions;
        
        // Update the node data store to trigger propagation
        updateNodeData(id, {
          ...data,
          imageUrl: data.imageUrl,
          instructions: updatedInstructions
        });
      };
      reader.readAsDataURL(file);
    }
  }

  function toggleEdit() {
    isEditing = !isEditing;
    if (!isEditing && caption !== data.caption) {
      data.caption = caption;
      
      // Update instructions for export
      let updatedInstructions;
      if (data.instructions && data.instructions.length > 0) {
        updatedInstructions = [...data.instructions];
        updatedInstructions[0].caption = caption;
      } else {
        updatedInstructions = [{
          type: 'image',
          imageUrl: data.imageUrl,
          caption: caption
        }];
      }
      
      data.instructions = updatedInstructions;
      
      // Update the node data store to trigger propagation
      updateNodeData(id, {
        ...data,
        caption,
        instructions: updatedInstructions
      });
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      toggleEdit();
    }
  }
</script>

<div class="image-node">
  <Handle type="source" position={Position.Right} />
  <Handle type="target" position={Position.Left} />
  
  <div class="image-container">
    <div class="image-header">
      <span class="image-label">Image</span>
    </div>
    
    {#if data.imageUrl}
      <div class="image-preview">
        <img src={data.imageUrl} alt="Uploaded image" />
        
        {#if isEditing}
          <input 
            type="text" 
            bind:value={caption} 
            placeholder="Add a caption..." 
            on:keydown={handleKeyDown}
            on:blur={toggleEdit}
            class="caption-input"
            autofocus
          />
        {:else}
          <div class="caption" on:dblclick={toggleEdit}>
            {data.caption || 'Double-click to add caption'}
          </div>
        {/if}
        
        <button class="change-image-btn" on:click={() => fileInput.click()}>
          Change Image
        </button>
      </div>
    {:else}
      <div class="upload-area" on:click={() => fileInput.click()}>
        <div class="upload-prompt">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Click to upload an image</span>
        </div>
      </div>
    {/if}
    
    <input 
      type="file" 
      accept="image/*" 
      on:change={handleFileChange} 
      bind:this={fileInput}
      style="display: none;"
    />
  </div>
</div>

<style>
  .image-node {
    padding: 10px;
    border-radius: 5px;
    background: white;
    border: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 200px;
    max-width: 300px;
  }

  .image-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .image-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
  }

  .image-label {
    font-weight: 500;
    color: #333;
  }

  .upload-area {
    border: 2px dashed #ccc;
    border-radius: 4px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .upload-area:hover {
    background-color: #f5f5f5;
  }

  .upload-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #666;
  }

  .image-preview {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .image-preview img {
    width: 100%;
    border-radius: 4px;
    object-fit: contain;
  }

  .caption {
    font-size: 14px;
    color: #666;
    text-align: center;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
  }

  .caption:hover {
    background-color: #f5f5f5;
  }

  .caption-input {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .change-image-btn {
    padding: 6px 12px;
    background: var(--primary-color, #4299e1);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .change-image-btn:hover {
    background: var(--primary-color-dark, #3182ce);
  }

  :global(.svelte-flow__handle) {
    width: 8px;
    height: 8px;
    background: var(--primary-color, #4299e1);
  }

  :global(.svelte-flow__handle:hover) {
    background: var(--primary-color-dark, #3182ce);
  }
</style> 