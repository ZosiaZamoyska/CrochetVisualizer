<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { patternToLoad } from '$lib/store';
  import { mergeWithDefaultPatterns, getDefaultPatterns } from '$lib/utils/defaultPatterns';
  
  let patterns = [];
  let defaultPatternIds = new Set();
  
  onMount(() => {
    // Get default pattern IDs to mark them as non-deletable
    const defaultPatterns = getDefaultPatterns();
    defaultPatternIds = new Set(defaultPatterns.map(p => p.id));
    
    // Load saved patterns from localStorage
    let userPatterns = [];
    const saved = localStorage.getItem('savedPatterns');
    if (saved) {
      try {
        userPatterns = JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved patterns:', error);
        userPatterns = [];
      }
    }
    
    // Merge user patterns with default patterns
    patterns = mergeWithDefaultPatterns(userPatterns);
  });
  
  function loadPattern(pattern) {
    patternToLoad.set(pattern);
    goto('/');
  }
  
  function deletePattern(id) {
    // Don't allow deletion of default patterns
    if (defaultPatternIds.has(id)) {
      alert('Default patterns cannot be deleted.');
      return;
    }
    
    // Filter out the pattern to delete
    patterns = patterns.filter(p => p.id !== id);
    
    // Save updated patterns to localStorage
    const userPatterns = patterns.filter(p => !defaultPatternIds.has(p.id));
    localStorage.setItem('savedPatterns', JSON.stringify(userPatterns));
  }
  
  function isDefaultPattern(id) {
    return defaultPatternIds.has(id);
  }
</script>

<div class="library-container">
  <h1>Pattern Library</h1>
  
  <div class="patterns-grid">
    {#each patterns as pattern}
      <div class="pattern-card">
        <div class="pattern-preview">
          {#if pattern.preview}
            <img src={pattern.preview} alt={pattern.name} />
          {:else}
            <div class="no-preview">No preview</div>
          {/if}
        </div>
        
        <div class="pattern-info">
          <h3>{pattern.name}</h3>
          {#if isDefaultPattern(pattern.id)}
            <span class="default-badge">Default</span>
          {/if}
          <div class="pattern-actions">
            <button class="action-button edit" on:click={() => loadPattern(pattern)}>
              Edit
            </button>
            
            <button 
              class="action-button delete" 
              on:click={() => deletePattern(pattern.id)}
              disabled={isDefaultPattern(pattern.id)}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
  
  <div class="back-link">
    <a href="/">Back to Editor</a>
  </div>
</div>

<style>
  .library-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  h1 {
    margin-bottom: 2rem;
    color: var(--primary-color, #4299e1);
  }
  
  .patterns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .pattern-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .pattern-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  
  .pattern-preview {
    height: 200px;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .pattern-preview img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .no-preview {
    color: #999;
    font-style: italic;
  }
  
  .pattern-info {
    padding: 1rem;
  }
  
  .pattern-info h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
  }
  
  .default-badge {
    display: inline-block;
    background: var(--primary-color, #4299e1);
    color: white;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  
  .pattern-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  .action-button {
    flex: 1;
    padding: 0.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  
  .action-button.edit {
    background: var(--primary-color, #4299e1);
    color: white;
  }
  
  .action-button.edit:hover {
    background: var(--primary-color-dark, #3182ce);
  }
  
  .action-button.delete {
    background: #e53e3e;
    color: white;
  }
  
  .action-button.delete:hover:not(:disabled) {
    background: #c53030;
  }
  
  .action-button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .back-link {
    margin-top: 2rem;
    text-align: center;
  }
  
  .back-link a {
    color: var(--primary-color, #4299e1);
    text-decoration: none;
    font-weight: bold;
  }
  
  .back-link a:hover {
    text-decoration: underline;
  }
</style> 