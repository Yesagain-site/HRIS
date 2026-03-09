// src/utils/photoUrl.ts
// Utility to handle photo URLs and fix localhost references

/**
 * Get the backend URL from environment variables
 */
function getBackendUrlFromEnv(): string {
    // Use type assertion to tell TypeScript this exists
    const viteApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    return viteApiUrl || 'https://hris-50hb.onrender.com';
}

/**
 * Fixes photo URLs that contain localhost references or are relative paths
 * Replaces localhost URLs with the actual backend URL
 * Adds backend URL prefix to relative paths
 */
export function fixPhotoUrl(photoUrl: string | null | undefined): string | null {
    if (!photoUrl) return null;
    
    console.log('🔧 fixPhotoUrl input:', photoUrl);

    // Get the backend URL from environment or use production URL
    const backendUrl = getBackendUrlFromEnv();

    // List of localhost patterns to replace
    const localhostPatterns = [
        'http://localhost:10000',
        'http://localhost:5000',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:5001',
    ];

    // Check if the URL contains any localhost pattern
    for (const pattern of localhostPatterns) {
        if (photoUrl.includes(pattern)) {
            console.log(`🔧 Fixing localhost URL: ${photoUrl}`);
            const fixedUrl = photoUrl.replace(pattern, backendUrl);
            console.log(`✅ Fixed URL: ${fixedUrl}`);
            return fixedUrl;
        }
    }

    // ✅ NEW: Handle relative paths (starting with /)
    if (photoUrl.startsWith('/')) {
        const fullUrl = `${backendUrl}${photoUrl}`;
        console.log(`🔧 Converting relative path: ${photoUrl} -> ${fullUrl}`);
        return fullUrl;
    }

    // ✅ NEW: Handle paths without protocol (like 'uploads/...')
    if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://')) {
        const fullUrl = `${backendUrl}/${photoUrl}`;
        console.log(`🔧 Adding backend URL to path: ${photoUrl} -> ${fullUrl}`);
        return fullUrl;
    }

    // URL is already correct
    console.log('✅ URL already correct:', photoUrl);
    return photoUrl;
}

/**
 * Get the full backend URL for uploads
 */
export function getBackendUrl(): string {
    return getBackendUrlFromEnv();
}

/**
 * Construct a proper upload URL
 */
export function getUploadUrl(path: string): string {
    const backendUrl = getBackendUrl();
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${backendUrl}${cleanPath}`;
}


// // src/utils/photoUrl.ts
// // Utility to handle photo URLs and fix localhost references

// /**
//  * Get the backend URL from environment variables
//  */
// function getBackendUrlFromEnv(): string {
//     // Use type assertion to tell TypeScript this exists
//     const viteApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
//     return viteApiUrl || 'https://hris-50hb.onrender.com';
// }

// /**
//  * Fixes photo URLs that contain localhost references
//  * Replaces localhost URLs with the actual backend URL
//  */
// export function fixPhotoUrl(photoUrl: string | null | undefined): string | null {
//     if (!photoUrl) return null;

//     // Get the backend URL from environment or use production URL
//     const backendUrl = getBackendUrlFromEnv();

//     // List of localhost patterns to replace
//     const localhostPatterns = [
//         'http://localhost:10000',
//         'http://localhost:5000',
//         'http://localhost:3000',
//         'http://localhost:8080',
//     ];

//     // Check if the URL contains any localhost pattern
//     for (const pattern of localhostPatterns) {
//         if (photoUrl.includes(pattern)) {
//             console.log(`🔧 Fixing localhost URL: ${photoUrl}`);
//             const fixedUrl = photoUrl.replace(pattern, backendUrl);
//             console.log(`✅ Fixed URL: ${fixedUrl}`);
//             return fixedUrl;
//         }
//     }

//     // URL is already correct
//     return photoUrl;
// }

// /**
//  * Get the full backend URL for uploads
//  */
// export function getBackendUrl(): string {
//     return getBackendUrlFromEnv();
// }

// /**
//  * Construct a proper upload URL
//  */
// export function getUploadUrl(path: string): string {
//     const backendUrl = getBackendUrl();
//     // Remove leading slash if present
//     const cleanPath = path.startsWith('/') ? path : `/${path}`;
//     return `${backendUrl}${cleanPath}`;
// }