// Server-only file monitor wrapper
import { FileMonitor } from './file-monitor';

// Only create file monitor instance on server
export const fileMonitor = typeof window === 'undefined' ? new FileMonitor() : null;

// Safe wrapper functions that check server environment
export const safeStartMonitoring = async (assistantId: string, folderPath: string) => {
  if (typeof window === 'undefined' && fileMonitor) {
    try {
      // Check if folder exists before monitoring
      const fs = require('fs');
      if (!fs.existsSync(folderPath)) {
        console.warn(`Documents folder does not exist: ${folderPath}. Skipping monitoring setup.`);
        return;
      }
      return await fileMonitor.startMonitoring(assistantId, folderPath);
    } catch (error) {
      console.error('File monitoring failed:', error);
    }
  }
};

export const safeStopMonitoring = (assistantId: string) => {
  if (typeof window === 'undefined' && fileMonitor) {
    try {
      return fileMonitor.stopMonitoring(assistantId);
    } catch (error) {
      console.error('Stop monitoring failed:', error);
    }
  }
};

export const safeSyncFolder = async (assistantId: string, folderPath: string) => {
  if (typeof window === 'undefined' && fileMonitor) {
    try {
      // Check if folder exists before syncing
      const fs = require('fs');
      if (!fs.existsSync(folderPath)) {
        console.warn(`Documents folder does not exist: ${folderPath}. Skipping sync.`);
        return 0;
      }
      return await fileMonitor.syncFolder(assistantId, folderPath);
    } catch (error) {
      console.error('Folder sync failed:', error);
      return 0;
    }
  }
  return 0;
};