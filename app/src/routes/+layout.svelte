<script>
  import '../lib/App.css';
  import { page } from '$app/stores';
  import { SvelteFlowProvider } from '@xyflow/svelte';
</script>

<SvelteFlowProvider>
  <header class="header">
    <h1 class="header-title">Crochet Pattern Visualizer</h1>

    <nav class="nav-menu">
      <a 
        href="/" 
        class="nav-link" 
        class:active={$page.url.pathname === '/'}
      >
        Make
      </a>
      <a 
        href="/patterns" 
        class="nav-link" 
        class:active={$page.url.pathname === '/patterns'}
      >
        My Patterns
      </a>
      <a 
        href="/design" 
        class="nav-link" 
        class:active={$page.url.pathname === '/design'}
      >
        Design
      </a>
      <span class="tooltip-container">
        &#63;
        <span class="tooltip"><img src="data/Chart-Symbol.jpg" alt="Help" style="width: 250px;" />
        </span>
      </span>
    </nav>
  </header>

  <slot />
</SvelteFlowProvider> 