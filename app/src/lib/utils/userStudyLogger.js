/**
 * User Study Logger
 * 
 * Simple logging system for tracking user actions during a study.
 * Logs actions with timestamps to localStorage and provides export functionality.
 */

// Flag to track if logging is active
let isLoggingActive = false;
let sessionStartTime = null;
let sessionId = null;
let participantId = 'anonymous';
let taskNumber = '0';
let actionLog = [];

// Track last visualization state to prevent duplicate logs
let lastVisualizationState = {
  viewMode: null,
  crochetType: null,
  timestamp: null
};

// CSV header for the log file
const CSV_HEADER = "timestamp,timeElapsed,actionType,description,details\n";

/**
 * Start a new user study logging session
 * @param {string} pid - Participant ID
 * @param {string} task - Task number
 * @returns {string} The ID of the new session
 */
export function startLogging(pid = 'anonymous', task = '0') {
  isLoggingActive = true;
  sessionStartTime = new Date();
  sessionId = `study-session-${sessionStartTime.toISOString()}`;
  participantId = pid || 'anonymous';
  taskNumber = task || '0';
  actionLog = [];
  
  // Reset visualization state tracking
  lastVisualizationState = {
    viewMode: null,
    crochetType: null,
    timestamp: null
  };
  
  // Log the start of the session
  logAction('SESSION_START', 'User study session started');
  
  // Save the active session ID to localStorage
  localStorage.setItem('activeUserStudySession', sessionId);
  
  return sessionId;
}

/**
 * Stop the current logging session
 * @returns {Object} The complete log data
 */
export function stopLogging() {
  if (!isLoggingActive) return null;
  
  // Log the end of the session
  logAction('SESSION_END', 'User study session ended');
  
  // Set logging to inactive
  isLoggingActive = false;
  
  // Clear the active session from localStorage
  localStorage.removeItem('activeUserStudySession');
  
  // Create the complete log data
  const logData = {
    sessionId,
    participantId,
    taskNumber,
    startTime: sessionStartTime.toISOString(),
    endTime: new Date().toISOString(),
    actions: actionLog
  };
  
  // Save the complete log to localStorage
  saveLogToLocalStorage(logData);
  
  // Also return the log data
  return logData;
}

/**
 * Log a user action
 * @param {string} actionType - Type of action (e.g., PATTERN_CHANGE, NODE_ADD)
 * @param {string} description - Description of the action
 * @param {Object} details - Optional details about the action
 */
export function logAction(actionType, description, details = {}) {
  if (!isLoggingActive) return;
  
  // Skip duplicate visualization changes for the same state
  if (actionType === ActionTypes.VISUALIZATION_CHANGE) {
    const newViewMode = details.newViewMode || null;
    const newCrochetType = details.newCrochetType || null;
    
    // Check if this is the same as the last visualization state within a short time window
    const now = new Date();
    const timeSinceLastVisualization = lastVisualizationState.timestamp ? 
      (now - lastVisualizationState.timestamp) : Infinity;
    
    // If the same view mode and crochet type were logged in the last 500ms, skip this log
    if (lastVisualizationState.viewMode === newViewMode && 
        lastVisualizationState.crochetType === newCrochetType &&
        timeSinceLastVisualization < 500) {
      console.log('[USER STUDY] Skipping duplicate visualization change log');
      return;
    }
    
    // Update last visualization state
    lastVisualizationState = {
      viewMode: newViewMode,
      crochetType: newCrochetType,
      timestamp: now
    };
  }
  
  const timestamp = new Date();
  const timeElapsed = timestamp - sessionStartTime; // ms since session start
  
  const action = {
    timestamp: timestamp.toISOString(),
    timeElapsed, // milliseconds since session start
    actionType,
    description,
    details
  };
  
  // Add to in-memory log
  actionLog.push(action);
  
  // Save to session storage for persistence between refreshes
  saveSessionToStorage();
  
  // Log to console for debugging
  console.log(`[USER STUDY] ${action.actionType}: ${action.description}`);
}

/**
 * Save the current session to sessionStorage to preserve between refreshes
 */
function saveSessionToStorage() {
  try {
    const currentSession = {
      sessionId,
      startTime: sessionStartTime,
      actions: actionLog,
      participantId,
      taskNumber
    };
    sessionStorage.setItem('currentUserStudySession', JSON.stringify(currentSession));
  } catch (error) {
    console.error('Error saving session to storage:', error);
  }
}

/**
 * Restore session from storage if available
 */
export function restoreSessionFromStorage() {
  try {
    const savedSession = sessionStorage.getItem('currentUserStudySession');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      sessionId = session.sessionId;
      sessionStartTime = new Date(session.startTime);
      actionLog = session.actions;
      participantId = session.participantId || 'anonymous';
      taskNumber = session.taskNumber || '0';
      isLoggingActive = true;
      return true;
    }
  } catch (error) {
    console.error('Error restoring session from storage:', error);
  }
  return false;
}

/**
 * Format an action as a CSV row
 * @param {Object} action - The action to format
 * @returns {string} CSV formatted row
 */
function formatActionAsCSV(action) {
  // Format the details as a JSON string, escaped for CSV
  const detailsStr = JSON.stringify(action.details).replace(/"/g, '""');
  
  // Create CSV row with proper escaping
  return `"${action.timestamp}",${action.timeElapsed},"${action.actionType}","${action.description.replace(/"/g, '""')}","${detailsStr}"\n`;
}

/**
 * Save the log data to localStorage
 * @param {Object} logData - The complete log data to save
 */
function saveLogToLocalStorage(logData) {
  // Get existing logs
  let savedLogs = [];
  try {
    const savedLogsString = localStorage.getItem('userStudyLogs');
    if (savedLogsString) {
      savedLogs = JSON.parse(savedLogsString);
    }
  } catch (error) {
    console.error('Error loading saved logs:', error);
  }
  
  // Add the new log
  savedLogs.push(logData);
  
  // Save back to localStorage
  localStorage.setItem('userStudyLogs', JSON.stringify(savedLogs));
  
  // Clear session storage since we've saved the completed log
  sessionStorage.removeItem('currentUserStudySession');
}

/**
 * Export all saved logs as a JSON file
 */
export function exportLogs() {
  try {
    const savedLogsString = localStorage.getItem('userStudyLogs');
    if (!savedLogsString) {
      console.warn('No logs found to export');
      return;
    }
    
    const savedLogs = JSON.parse(savedLogsString);
    
    // Create a blob with the logs
    const blob = new Blob([JSON.stringify(savedLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-study-logs-${new Date().toISOString().split('.')[0].replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting logs:', error);
  }
}

/**
 * Export current session logs as a single CSV file
 */
export function exportCurrentSessionAsCSV() {
  if (!actionLog.length) {
    console.warn('No logs in current session to export');
    return;
  }
  
  // Create CSV content
  let csvContent = CSV_HEADER;
  
  // Add all action rows
  actionLog.forEach(action => {
    csvContent += formatActionAsCSV(action);
  });
  
  // Download the complete CSV
  const filename = `user-study-P${participantId}-T${taskNumber}-${new Date().toISOString().split('.')[0].replace(/:/g, '-')}.csv`;
  
  // Create a blob with the CSV data
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  // Create a download link
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return filename;
}

/**
 * Clear all saved logs from localStorage
 */
export function clearLogs() {
  localStorage.removeItem('userStudyLogs');
  localStorage.removeItem('activeUserStudySession');
  sessionStorage.removeItem('currentUserStudySession');
}

/**
 * Check if logging is currently active
 * @returns {boolean} True if logging is active
 */
export function isLogging() {
  return isLoggingActive;
}

// Set participant and task information
export function setParticipantInfo(pid, task) {
  participantId = pid || participantId;
  taskNumber = task || taskNumber;
}

// Action type constants
export const ActionTypes = {
  PATTERN_CHANGE: 'PATTERN_CHANGE',
  NODE_ADD: 'NODE_ADD',
  NODE_DELETE: 'NODE_DELETE',
  UNDO: 'UNDO',
  COLOR_CHANGE: 'COLOR_CHANGE',
  STITCH_TYPE_CHANGE: 'STITCH_TYPE_CHANGE',
  VISUALIZATION_CHANGE: 'VISUALIZATION_CHANGE',
  EXPORT: 'EXPORT',
  SAVE: 'SAVE',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE'
}; 