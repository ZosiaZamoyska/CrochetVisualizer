<script>
  import '../lib/App.css';
  import { page } from '$app/stores';
</script>

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
      href="/design" 
      class="nav-link" 
      class:active={$page.url.pathname === '/design'}
    >
      Design
    </a>
    <a 
      href="/patterns" 
      class="nav-link" 
      class:active={$page.url.pathname === '/patterns'}
    >
      My Patterns
    </a>
  </nav>
</header>

<slot /> 