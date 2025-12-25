// api/send-telegram.js
export default async function handler(req, res) {
  // Chỉ chấp nhận POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(500).json({ 
      error: 'Telegram credentials not configured',
      hint: 'Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel environment variables'
    });
  }

  try {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.description || 'Failed to send message');
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Đã gửi báo cáo vào Telegram thành công!' 
    });

  } catch (error) {
    console.error('Telegram API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to send message to Telegram',
      details: error.message 
    });
  }
}