import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const filePath = path.join(process.cwd(), 'data', 'reports.json');

        // Kiểm tra file có tồn tại không
        if (!fs.existsSync(filePath)) {
            return res.status(200).json({
                reports: [],
                lastInventory: {}
            });
        }

        // Đọc file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error reading reports:', error);
        return res.status(500).json({
            error: 'Failed to read reports',
            details: error.message
        });
    }
}