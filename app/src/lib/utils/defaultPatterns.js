import sunflowerPattern from '../patterns/sunflower.json';

/**
 * Get all default patterns that should be available to all users
 * @returns {Array} Array of default pattern objects
 */
export function getDefaultPatterns() {
  // Add all default patterns here
  const defaultPatterns = [
    sunflowerPattern
  ];
  
  // Ensure all patterns have the required properties
  return defaultPatterns.map(pattern => {
    // Make sure the pattern has a preview image
    if (!pattern.preview && pattern.chart) {
      pattern.preview = pattern.chart;
    }
    
    // Ensure the pattern has an ID
    if (!pattern.id) {
      pattern.id = `default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return pattern;
  });
}

/**
 * Merge default patterns with user-saved patterns
 * @param {Array} userPatterns - User's saved patterns from localStorage
 * @returns {Array} Combined array of default and user patterns
 */
export function mergeWithDefaultPatterns(userPatterns = []) {
  const defaultPatterns = getDefaultPatterns();
  
  // Create a map of existing pattern IDs to avoid duplicates
  const existingPatternIds = new Set(userPatterns.map(p => p.id));
  
  // Only add default patterns that don't already exist in user patterns
  const newDefaultPatterns = defaultPatterns.filter(p => !existingPatternIds.has(p.id));
  
  return [...userPatterns, ...newDefaultPatterns];
} 