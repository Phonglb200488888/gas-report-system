import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { report, lastInventory } = req.body;

        // Đường dẫn đến file JSON
        const filePath = path.join(process.cwd(), 'data', 'reports.json');

        // Đọc file hiện tại
        let data = { reports: [], lastInventory: {} };
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            data = JSON.parse(fileContent);
        }

        // Kiểm tra xem đã có báo cáo ngày này chưa
        const existingIndex = data.reports.findIndex(r => r.date === report.date);
        if (existingIndex >= 0) {
            data.reports[existingIndex] = report;
        } else {
            data.reports.push(report);
        }

        // Cập nhật tồn kho
        if (lastInventory) {
            data.lastInventory = lastInventory;
        }

        // Sắp xếp theo ngày giảm dần
        data.reports.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Ghi lại file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

        return res.status(200).json({
            success: true,
            message: 'Đã lưu báo cáo thành công!'
        });

    } catch (error) {
        console.error('Error saving report:', error);
        return res.status(500).json({
            error: 'Failed to save report',
            details: error.message
        });
    }
}