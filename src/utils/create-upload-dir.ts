import * as fs from 'fs';
import * as path from 'path';

export function ensureUploadDirectory() {
    const uploadDir = path.join(process.cwd(), 'uploads', 'employee-photos');
    
    console.log('🔍 Checking upload directory:', uploadDir);
    
    if (!fs.existsSync(uploadDir)) {
        console.log('📁 Creating upload directory...');
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Upload directory created successfully!');
    } else {
        console.log('✅ Upload directory already exists');
    }
    
    return uploadDir;
}