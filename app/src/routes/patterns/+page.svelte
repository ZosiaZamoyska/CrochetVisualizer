<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { patternToLoad } from '$lib/store';
  import '$lib/App.css';
  import { mergeWithDefaultPatterns, getDefaultPatterns } from '$lib/utils/defaultPatterns';

  let savedPatterns = [];
  let defaultPatternIds = new Set();

  function loadPattern(pattern) {
    if (pattern) {
      // localStorage.setItem('patternToLoad', JSON.stringify(pattern));
      patternToLoad.set(pattern);
      goto('/');
    } else {
      console.error('No pattern provided to load.'); // Error handling
    }
  }

  function deletePattern(id) {
    // Don't allow deletion of default patterns
    if (defaultPatternIds.has(id)) {
      alert('Default patterns cannot be deleted.');
      return;
    }
    
    // Filter out the pattern to delete
    savedPatterns = savedPatterns.filter(p => p.id !== id);
    
    // Save updated patterns to localStorage (excluding default patterns)
    const userPatterns = savedPatterns.filter(p => !defaultPatternIds.has(p.id));
    localStorage.setItem('savedPatterns', JSON.stringify(userPatterns));
  }
  
  function isDefaultPattern(id) {
    return defaultPatternIds.has(id);
  }

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
        console.log('Loaded user patterns:', userPatterns);
      } catch (error) {
        console.error('Error parsing saved patterns:', error);
        userPatterns = [];
      }
    }
    
    // Merge user patterns with default patterns
    savedPatterns = mergeWithDefaultPatterns(userPatterns);
    console.log('Combined patterns:', savedPatterns);
  });
</script>

<div class="patterns-container">
  <div class="page-header">
    <h2>My Saved Patterns</h2>
  </div>
  <div class="patterns-grid">
    {#each savedPatterns as pattern}
      <div class="pattern-card">
        <div class="pattern-preview">
          {#if pattern.preview}
            <img src={pattern.preview} alt="Pattern preview" />
          {:else}
            <div class="no-preview">No preview available</div>
          {/if}
          {#if isDefaultPattern(pattern.id)}
            <span class="default-badge">Default</span>
          {/if}
        </div>
        <div class="pattern-info">
          <h3>{pattern.name}</h3>
          <p>Created: {new Date(pattern.timestamp).toLocaleDateString()}</p>
          <div class="pattern-actions">
            <button class="primary" on:click={() => loadPattern(pattern)}>Load</button>
            <button 
              class="destructive" 
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
</div>

<style>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .library-link {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: var(--primary-color, #4299e1);
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  
  .library-link:hover {
    background: var(--primary-color-dark, #3182ce);
  }
  
  .patterns-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  h2 {
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
    width: 100%;
    height: 200px;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  
  
  .default-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: var(--primary-color, #4299e1);
    color: white;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
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
  
  .pattern-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  .pattern-actions button {
    flex: 1;
    padding: 0.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  
  .primary {
    background: var(--primary-color, #4299e1);
    color: white;
  }
  
  .primary:hover {
    background: var(--primary-color-dark, #3182ce);
  }
  
  .destructive {
    background: #e53e3e;
    color: white;
  }
  
  .destructive:hover:not(:disabled) {
    background: #c53030;
  }
  
  .destructive:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
</style> 