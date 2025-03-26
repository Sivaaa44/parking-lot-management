// Create a new file: backend/utils/timeUtil.js

// Using native Date methods for IST (UTC+5:30)
function getCurrentISTTime() {
  const now = new Date();
  // Create a new date object that explicitly represents this time in IST
  // We don't modify the time - we just ensure it's interpreted as IST
  // This is the correct approach rather than adding 5.5 hours
  return now;
}

function convertToIST(date) {
  if (!date) return null;
  // Convert any date to a proper Date object without timezone manipulation
  // The dates should already be stored correctly, we just need a proper object
  return new Date(date);
}

function formatISTDate(date) {
  if (!date) return '';
  const dateObj = new Date(date);
  return dateObj.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// For display purposes only - converts local time to IST
function getISTString(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

module.exports = {
  getCurrentISTTime,
  convertToIST,
  formatISTDate,
  getISTString
};