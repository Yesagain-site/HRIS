// localStorageCleanup.ts - EXPORT the function
export const cleanupLocalStorage = () => {
  console.log('🧹 Cleaning localStorage...');
  
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('payroll_') || 
        key.includes('payroll') || 
        key.includes('Payroll') ||
        key.includes('excel_') ||
        key.includes('upload_')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  🗑️ Removed: ${key}`);
    });
    
    console.log(`✅ Removed ${keysToRemove.length} payroll items`);
    
  } catch (error) {
    console.error('❌ Error cleaning localStorage:', error);
  }
};

// ✅ EXPORT as default too for flexibility
export default cleanupLocalStorage;