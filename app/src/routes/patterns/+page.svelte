<script>
  import { onMount } from 'svelte';
  import '$lib/App.css';

  let savedPatterns = [];

  function loadPattern(pattern) {
    // Store the pattern data in localStorage for the design page to access
    localStorage.setItem('patternToLoad', JSON.stringify(pattern));
    // Navigate to the design page
    window.location.href = '/';
  }

  function deletePattern(id) {
    savedPatterns = savedPatterns.filter(p => p.id !== id);
    localStorage.setItem('savedPatterns', JSON.stringify(savedPatterns));
  }

  onMount(() => {
    // Load saved patterns from localStorage
    const saved = localStorage.getItem('savedPatterns');
    if (saved) {
      savedPatterns = JSON.parse(saved);
    }
  });
</script>

<div class="patterns-container">
  <h2>My Saved Patterns</h2>
  <div class="patterns-grid">
    {#each savedPatterns as pattern}
      <div class="pattern-card">
        <div class="pattern-preview">
          {#if pattern.preview}
            <img src={pattern.preview} alt="Pattern preview" />
          {:else}
            <div class="no-preview">No preview available</div>
          {/if}
        </div>
        <div class="pattern-info">
          <h3>{pattern.name}</h3>
          <p>Created: {new Date(pattern.timestamp).toLocaleDateString()}</p>
          <div class="pattern-actions">
            <button class="primary" on:click={() => loadPattern(pattern)}>Load</button>
            <button class="destructive" on:click={() => deletePattern(pattern.id)}>Delete</button>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div> 