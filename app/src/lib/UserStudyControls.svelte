<script>
  import { startLogging, stopLogging, exportLogs, clearLogs, isLogging } from './utils/userStudyLogger';
  import { onMount } from 'svelte';

  let studyActive = false;
  let participantId = '';
  let taskNumber = '1';
  let showStudyDialog = false;
  let sessionStats = {
    startTime: null,
    duration: 0,
    actionCount: 0
  };

  let statsInterval;

  onMount(() => {
    // Check if there's an active study session from localStorage
    const activeSession = localStorage.getItem('activeUserStudySession');
    if (activeSession) {
      studyActive = true;
      updateStats();
      startStatsInterval();
    }
  });

  function startStatsInterval() {
    // Update stats every second
    statsInterval = setInterval(updateStats, 1000);
  }

  function stopStatsInterval() {
    if (statsInterval) {
      clearInterval(statsInterval);
      statsInterval = null;
    }
  }

  function updateStats() {
    if (studyActive) {
      const currentLogs = JSON.parse(localStorage.getItem('userStudyLogs') || '[]');
      if (currentLogs.length > 0) {
        const currentSession = currentLogs[currentLogs.length - 1];
        if (currentSession && currentSession.actions) {
          sessionStats.startTime = new Date(currentSession.startTime);
          sessionStats.actionCount = currentSession.actions.length;
          sessionStats.duration = Math.floor((new Date() - sessionStats.startTime) / 1000);
        }
      }
    }
  }

  function toggleStudy() {
    if (studyActive) {
      // End the study
      const logData = stopLogging();
      if (logData) {
        // Store the participant ID and task number in the filename
        const filename = participantId && taskNumber ? 
          `user-study-P${participantId}-T${taskNumber}-${new Date().toISOString().split('.')[0].replace(/:/g, '-')}.json` :
          `user-study-logs-${new Date().toISOString().split('.')[0].replace(/:/g, '-')}.json`;
        
        // Export logs with custom filename
        exportLogsWithFilename(filename, logData);
        
        alert(`User study ended. Log data saved as "${filename}".`);
        stopStatsInterval();
      }
      studyActive = false;
    } else {
      // Show dialog to collect participant info before starting
      showStudyDialog = true;
    }
  }
  
  function startStudyWithInfo() {
    if (!participantId.trim()) {
      if (!confirm('No participant ID entered. Continue anyway?')) {
        return;
      }
    }
    
    // Close the dialog
    showStudyDialog = false;
    
    // Start logging
    startLogging();
    sessionStats.startTime = new Date();
    sessionStats.actionCount = 0;
    sessionStats.duration = 0;
    startStatsInterval();
    
    studyActive = true;
    
    alert(`User study started for ${participantId ? 'Participant ' + participantId : 'anonymous participant'}, Task ${taskNumber}. All actions will be logged.`);
  }
  
  function cancelStudyStart() {
    showStudyDialog = false;
  }
  
  function exportLogsWithFilename(filename, logData) {
    try {
      // Add participant ID and task number to log data
      if (participantId || taskNumber) {
        logData.participantId = participantId || 'anonymous';
        logData.taskNumber = taskNumber || '0';
      }
      
      // Create a JSON blob with just this session's data
      const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  }
  
  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
</script>

<div class="user-study-controls">
  <button 
    class="user-study-button" 
    class:active={studyActive} 
    on:click={toggleStudy}
  >
    {#if studyActive}
      <span class="recording-indicator"></span>
      <span>End User Study</span>
    {:else}
      <span>Start User Study</span>
    {/if}
  </button>
</div>

<!-- Study Start Dialog -->
{#if showStudyDialog}
  <div class="study-dialog-overlay">
    <div class="study-dialog">
      <h3>Start User Study</h3>
      <div class="study-form">
        <div class="input-group">
          <label for="participant-id">Participant ID:</label>
          <input 
            id="participant-id" 
            type="text" 
            bind:value={participantId} 
            placeholder="e.g. P01"
          />
        </div>
        <div class="input-group">
          <label for="task-number">Task:</label>
          <select id="task-number" bind:value={taskNumber}>
            <option value="1">Task 1: Crocheting + Recording</option>
            <option value="2">Task 2: Editing</option>
            <option value="3">Task 3: Project Composition</option>
          </select>
        </div>
      </div>
      <div class="dialog-buttons">
        <button class="primary" on:click={startStudyWithInfo}>Start</button>
        <button class="secondary" on:click={cancelStudyStart}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .user-study-controls {
    margin: 10px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .user-study-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background-color: var(--primary-color, #4299e1);
    color: white;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .user-study-button:hover {
    background-color: var(--primary-color-dark, #3182ce);
  }
  
  .user-study-button.active {
    background-color: #e53e3e;
  }
  
  .user-study-button.active:hover {
    background-color: #c53030;
  }
  
  .recording-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: white;
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
    100% {
      opacity: 1;
    }
  }
  
  .study-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  label {
    font-size: 12px;
    font-weight: bold;
  }
  
  input, select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .study-stats {
    background-color: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    display: flex;
    justify-content: space-between;
  }
  
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .stat-label {
    font-size: 12px;
    color: #666;
  }
  
  .stat-value {
    font-weight: bold;
    font-size: 16px;
  }
  
  /* Dialog styles */
  .study-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .study-dialog {
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    width: 400px;
    max-width: 90%;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .study-dialog h3 {
    margin-top: 0;
    margin-bottom: 16px;
    color: var(--text-primary, #333);
    font-size: 18px;
  }
  
  .dialog-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  
  .dialog-buttons button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .dialog-buttons button.primary {
    background-color: var(--primary-color, #4299e1);
    color: white;
  }
  
  .dialog-buttons button.secondary {
    background-color: #e2e8f0;
    color: #4a5568;
  }
  
  .dialog-buttons button:hover {
    opacity: 0.9;
  }
</style> 