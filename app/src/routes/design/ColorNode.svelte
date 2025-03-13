<script>
  import { Handle, Position } from '@xyflow/svelte';
  export let data;
  export let id;

  let color = '#000000';
  let colorName = 'Black';
  let isEditing = false;

  function handleColorChange(event) {
    color = event.target.value;
    if (!isEditing) {
      // Only update color name if not being manually edited
      updateColorName(color);
    }
    updateData();
  }

  function handleNameChange(event) {
    colorName = event.target.value;
    isEditing = true;
    updateData();
  }

  function handleNameBlur() {
    isEditing = false;
  }

  function updateColorName(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Simple color name mapping
    if (r === 0 && g === 0 && b === 0) colorName = 'Black';
    else if (r === 255 && g === 255 && b === 255) colorName = 'White';
    else if (r === 255 && g === 0 && b === 0) colorName = 'Red';
    else if (r === 0 && g === 255 && b === 0) colorName = 'Green';
    else if (r === 0 && g === 0 && b === 255) colorName = 'Blue';
    else colorName = `RGB(${r}, ${g}, ${b})`;
  }

  function updateData() {
    data.color = color;
    data.colorName = colorName;
    data.instructions = [{
      type: 'color',
      color: color,
      colorName: colorName
    }];
  }
</script>

<div class="color-node">
  <div class="color-label">use yarn color:</div>
  <div class="color-picker-container">
    <input 
      type="color" 
      bind:value={color}
      on:change={handleColorChange}
    />
    <input 
      type="text"
      class="color-name"
      bind:value={colorName}
      on:input={handleNameChange}
      on:blur={handleNameBlur}
      style="color: {color}"
    />
  </div>
  <Handle type="source" position={Position.Right} />
</div>

<style>
  .color-node {
    background: white;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 200px;
  }

  .color-label {
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
  }

  .color-picker-container {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }

  input[type="color"] {
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
  }

  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }

  .color-name {
    font-size: 14px;
    font-weight: 500;
    flex-grow: 1;
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: transparent;
  }

  .color-name:focus {
    outline: none;
    border-color: #4a9eff;
  }
</style> 