<script>
  import { PATTERNS, SHAPE_TYPES } from '../shapes';

  export let onShapeSelect;

  const colors = {
    [SHAPE_TYPES.SQUARE]: '#00ff00',
    [SHAPE_TYPES.HEXAGON]: '#ff0000',
    [SHAPE_TYPES.TRIANGLE]: '#0000ff'
  };
</script>

<div class="shape-library">
  <h2>Shape Library</h2>
  <div class="pattern-list">
    {#each Object.values(PATTERNS) as pattern}
      <button 
        class="pattern-item"
        on:click={() => onShapeSelect(pattern)}
      >
        <div class="pattern-preview" style="background-color: {colors[pattern.id]}">
          <svg viewBox="-50 -50 100 100" width="40" height="40">
            {#if pattern.id === SHAPE_TYPES.SQUARE}
              <rect x="-40" y="-40" width="80" height="80" fill="white" stroke="black" stroke-width="2"/>
            {:else if pattern.id === SHAPE_TYPES.HEXAGON}
              <path d="M 40 0 L 20 34.6 L -20 34.6 L -40 0 L -20 -34.6 L 20 -34.6 Z" fill="white" stroke="black" stroke-width="2"/>
            {:else if pattern.id === SHAPE_TYPES.TRIANGLE}
              <path d="M 0 -40 L 34.6 20 L -34.6 20 Z" fill="white" stroke="black" stroke-width="2"/>
            {/if}
          </svg>
        </div>
        <span>{pattern.name}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .shape-library {
    width: 250px;
    padding: 20px;
    background-color: var(--bg-secondary);
    border-radius: 8px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  h2 {
    margin: 0 0 20px 0;
    font-size: 1.5em;
  }

  .pattern-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pattern-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .pattern-item:hover {
    background-color: var(--bg-hover);
  }

  .pattern-preview {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  span {
    font-size: 1.1em;
  }
</style> 