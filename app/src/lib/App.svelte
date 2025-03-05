<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { parsePattern, grid } from './parser.js';
  import { createP5Instance } from './p5Sketch.js';

  let patternInput = "";
  let websocketPort = 8765;
  let arduinoData = "";
  let stitchesType = ["ch", "sc", "dc"];
  let arduinoStatus = ["waiting", "receiving"];
  let status = "waiting";
  
  // Predefined crochet patterns
  const patterns = {
    "Basic Chain": "ch ch ch ch ch ch ch ch",
    "Single Crochet Row": "ch ch ch ch ch ch ch ch sc sc sc sc sc sc sc",
    "Normal Wave": "ch ch ch ch ch ch sc dc sc dc sc ch sc sc sc sc sc ch sc sc sc sc sc ch sc sc sc sc sc",
    "Exaggerated Wave": "ch ch ch ch ch ch sc dc sc dc sc ch sc dc sc dc sc ch sc dc sc dc sc ch sc dc sc dc sc",
    "Up-Down Wave": "ch ch ch ch ch ch sc dc sc dc sc ch dc sc dc sc dc ch sc dc sc dc sc ch dc sc dc sc dc",
    "Random": "ch ch ch ch dc sc sc sc sc ch sc sc ch sc sc sc"
  };

  // Function to update patternInput and parse the pattern
  function selectPattern(event) {
    patternInput = event.target.value;
    parsePattern(patternInput);
  }

  let p5Instance = null;
  let currentStep = 1;
  let isPlaying = false;
  let stitchesDone = patternInput.split(" ").length;
  let interval;

  function playPattern() {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    isPlaying = true;
    currentStep = 2;

    interval = setInterval(() => {
      if (currentStep <= patternInput.length) {
        let partialPattern = patternInput.substring(0, currentStep);
        stitchesDone = partialPattern.split(" ").length;
        parsePattern(patternInput);
        currentStep += 3;
      } else {
        stopPlayback();
      }
    }, 700);
  }
  
  function stopPlayback() {
    clearInterval(interval);
    isPlaying = false;
  }
  // Ensure canvas redraws every time patternInput changes
  $: patternInput, redrawCanvas();

  // Function to trigger the canvas redraw
  function redrawCanvas() {
    createCanvasInstance();
  }

  function undoLastStitch() {
    const stitches = patternInput.trim().split(" ");
    if (stitches.length > 0) {
      stitches.pop();
      patternInput = stitches.join(" ");
      parsePattern(patternInput.trim());
    }
  }

  onMount(async () => {
    const socket = new WebSocket(`ws://localhost:${websocketPort}`);
  
    socket.onmessage = (event) => {

      let receivedData = event.data;

      if (stitchesType.includes(receivedData))
      {
        patternInput += arduinoData + " ";
        parsePattern(patternInput.trim());
      }
      if (arduinoStatus.includes(receivedData))
      {
        console.log("hello");
        status = receivedData;
      }

    };

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onerror = (error) => {
      console.log('WebSocket error: ', error);
    };

    parsePattern(patternInput);

    if (typeof window !== 'undefined') {
      const module = await import('p5');
      const p5 = module.default;

      if (p5Instance) {
        p5Instance.remove();
      }

      //createCanvasInstance();
      p5Instance = new p5((p) => createP5Instance(p, grid, patternInput, currentStep, isPlaying), document.getElementById('p5Canvas'));
    }
  });

  async function createCanvasInstance() {
    if (typeof window !== 'undefined') {
      const module = await import('p5');
      const p5 = module.default;

      if (p5Instance) {
        p5Instance.remove(); // Remove existing instance
      }

      // Create a new p5 instance
      p5Instance = new p5((p) => createP5Instance(p, grid, patternInput, currentStep, isPlaying), document.getElementById('p5Canvas'));
    }
  }
</script>



<style lang="css">
  @import './App.css';
</style>

<div class="container">
  <div class="input-container">
    <div class="status-container">

      <h1>Status:</h1>
      <div class="dot {status}"></div>
      <h1> {status}</h1>
    </div>
    <select on:change={selectPattern}>
      <option value="" disabled selected>Select a design</option>
      {#each Object.keys(patterns) as design}
        <option value={patterns[design]}>{design}</option>
      {/each}
    </select>
    <button on:click={playPattern}>{isPlaying ? "Stop" : "Play"}</button>
    <button on:click={undoLastStitch}>Undo</button>
    <br>
    <br>
    <input type="text" bind:value={patternInput} on:input={() => parsePattern(patternInput.trim())} placeholder="Enter crochet pattern">
  </div>
  
  
  <div class="grid-container" id="p5Canvas"></div>
</div>