import express from 'express';
import { sendEmail } from '../utils/sendEmail.js';

const router = express.Router();

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'All fields required.' });
  }
  const subject = `Contact Message from ${name}`;
  const htmlContent = `
    <h2>New contact form message!</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
  `;
  const RECIPIENT = process.env.BREVO_SENDER_EMAIL;
  if(!RECIPIENT){
    return res.status(500).json({ success: false, message: 'Recipient email (BREVO_SENDER_EMAIL) not set in .env.' });
  }
  const result = await sendEmail(RECIPIENT, subject, htmlContent);
  if(result.success) {
    return res.json({ success: true });
  } else {
    return res.status(500).json({ success: false, message: 'Failed to send', error: result.error });
  }
});

export default router;
