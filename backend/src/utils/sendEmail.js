import axios from 'axios';

/**
 * Send email using Brevo (Sendinblue) REST API via Axios
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content
 * @returns {Promise<Object>} - Send result
 */
export const sendEmail = async (to, subject, htmlContent) => {
  try {
    console.log('📧 Sending email to:', to);
    console.log('📋 Subject:', subject);

    const response = await axios({
      method: 'post',
      url: 'https://api.brevo.com/v3/smtp/email',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      data: {
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'TaskHub',
          email: process.env.BREVO_SENDER_EMAIL
        },
        to: [
          {
            email: to
          }
        ],
        subject,
        htmlContent
      }
    });

    console.log('✅ Email sent successfully via Brevo API:', response.data);
    return {
      success: true,
      messageId: response.data.messageId,
    };
  } catch (error) {
    console.error('❌ Error sending email via Brevo API:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

/**
 * Send email verification email (SENT FIRST - AFTER REGISTRATION)
 */
export const sendVerificationEmail = async (userEmail, fullName, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
  const subject = 'Verify Your Email Address - TaskHub';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #21808d 0%, #134252 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #21808d; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to TaskHub!</h1>
        </div>
        <div class="content">
          <h2>Hi ${fullName}! 👋</h2>
          <p>Thank you for registering with TaskHub! We're excited to have you on board.</p>
          
          <p>Before you can start earning money by completing tasks, please verify your email address by clicking the button below:</p>
          
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify My Email Address</a>
          </p>
          
          <div class="warning">
            <p><strong>⏰ Important:</strong> This verification link will expire in <strong>24 hours</strong>.</p>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px;">
            ${verificationUrl}
          </p>
          
          <h3>What's Next After Verification?</h3>
          <ul>
            <li>✅ Browse available jobs</li>
            <li>✅ Complete tasks and submit proof</li>
            <li>✅ Earn money to your wallet</li>
            <li>✅ Withdraw anytime (BEP20, Telebirr, CBE Bank)</li>
          </ul>
          
          <p>If you didn't create an account with TaskHub, please ignore this email.</p>
          
          <p><strong>The TaskHub Team</strong></p>
        </div>
        <div class="footer">
          <p>© 2025 TaskHub. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(userEmail, subject, htmlContent);
};

/**
 * Send welcome email to verified user (SENT SECOND - AFTER EMAIL VERIFICATION)
 */
export const sendWelcomeEmail = async (userEmail, fullName) => {
  const subject = 'Welcome to TaskHub! 🎉 Your Account is Verified';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #21808d 0%, #134252 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #21808d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .success-badge { background: #28a745; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎊 Account Verified Successfully!</h1>
        </div>
        <div class="content">
          <div style="text-align: center;">
            <div class="success-badge">✓ Email Verified</div>
          </div>
          
          <h2>Hi ${fullName}! 👋</h2>
          <p>Congratulations! Your email has been verified and your TaskHub account is now fully active.</p>
          
          <h3>🚀 Start Earning Now:</h3>
          <ul>
            <li>✅ Browse available jobs</li>
            <li>✅ Complete tasks and submit proof</li>
            <li>✅ Earn money to your wallet</li>
            <li>✅ Withdraw anytime (BEP20, Telebirr, CBE Bank)</li>
          </ul>
          
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/jobs" class="button">Browse Jobs Now</a>
          </p>
          
          <h3>⚠️ Important Reminders:</h3>
          <ul>
            <li>Duplicate accounts are strictly forbidden</li>
            <li>Always submit valid proof for tasks</li>
            <li>Minimum withdrawal: $1.00</li>
          </ul>
          
          <p>If you have any questions, feel free to contact our support team.</p>
          
          <p>Happy earning! 💰</p>
          <p><strong>The TaskHub Team</strong></p>
        </div>
        <div class="footer">
          <p>© 2025 TaskHub. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(userEmail, subject, htmlContent);
};

/**
 * Send withdrawal request confirmation
 */
export const sendWithdrawalRequestEmail = async (userEmail, fullName, amount, method) => {
  const subject = 'Withdrawal Request Received';
  
  // Ensure amount is a number before .toFixed
  const displayAmount = Number(amount);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #21808d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .amount { font-size: 32px; font-weight: bold; color: #21808d; text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Withdrawal Request Received</h1>
        </div>
        <div class="content">
          <h2>Hi ${fullName},</h2>
          <p>We've received your withdrawal request and it's being processed.</p>
          
          <div class="amount">$${isNaN(displayAmount) ? amount : displayAmount.toFixed(2)}</div>
          
          <p><strong>Method:</strong> ${method === 'bep20' ? 'BEP20 Crypto' : method === 'telebirr' ? 'Telebirr' : 'CBE Bank'}</p>
          
          <p>Processing typically takes 1-2 business days. You'll receive another email once your withdrawal is completed.</p>
          
          <p>Thank you for using TaskHub!</p>
          <p><strong>The TaskHub Team</strong></p>
        </div>
        <div class="footer">
          <p>© 2025 TaskHub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(userEmail, subject, htmlContent);
};

/**
 * Send withdrawal completion  confirmation
 */

export const sendWithdrawalCompletedEmail = async (userEmail, fullName, amount, method) => {
  const subject = 'Withdrawal Processed Successfully';

  const displayAmount = Number(amount);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #21808d; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .amount { font-size: 32px; font-weight: bold; color: #21808d; text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Withdrawal Processed</h1>
        </div>
        <div class="content">
          <h2>Hi ${fullName},</h2>
          <p>Your withdrawal request has been processed successfully.</p>
          
          <div class="amount">$${isNaN(displayAmount) ? amount : displayAmount.toFixed(2)}</div>
          
          <p><strong>Method:</strong> ${method === 'bep20' ? 'BEP20 Crypto' : method === 'telebirr' ? 'Telebirr' : 'CBE Bank'}</p>
          
          <p>If you have any concerns or did not receive your funds, please contact support.</p>
          
          <p>Thank you for using TaskHub!</p>
          <p><strong>The TaskHub Team</strong></p>
        </div>
        <div class="footer">
          <p>© 2025 TaskHub. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(userEmail, subject, htmlContent);
};


export const sendJobAddedNotification = async (job, recipient) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const BASE_URL = isDev
    ? (process.env.DEV_FRONTEND_URL || 'http://localhost:3000')
    : (process.env.FRONTEND_URL || 'https://taskhub.com');

  const subject = `💼 New Job Available on TaskHub`;
  const jobUrl = `${BASE_URL}/jobs/${job._id}`;
  const viewAllUrl = `${BASE_URL}/jobs`;

  function getAgo(date) {
    const now = new Date();
    const then = new Date(date || now);
    const s = Math.floor((now - then) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s/60) + ' minutes ago';
    if (s < 86400) return Math.floor(s/3600) + ' hours ago';
    return Math.floor(s/86400) + ' days ago';
  }
  const publishedAgo = getAgo(job.createdAt);

  const totalSlots = typeof job.totalSlots === "number" ? job.totalSlots : Number(job.totalSlots) || 0;
  const filledSlots = typeof job.filledSlots === "number" ? job.filledSlots : Number(job.filledSlots) || 0;
  const availableVacancy = Math.max(0, totalSlots - filledSlots);

  const platformName = job.platform
    ? job.platform[0].toUpperCase() + job.platform.slice(1)
    : '';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>New Job Available</title>
    <style>
      body { background:#f7f9fa; margin:0; padding:0; font-family: Arial,sans-serif; color:#1b2733;}
      .main { max-width:410px; background:white; margin:38px auto; border-radius:10px; box-shadow:0 2px 16px #e2e8f0;}
      .content { padding:35px 33px 28px 33px; }
      .headline { font-size:1.22em; font-weight:bold; margin-bottom:16px; letter-spacing:0.08em; color:#155da6;}
      .row {margin: 16px 0;}
      .field-label {font-weight:600; color:#189079;}
      .reward {font-size:1.1em; color:#19a432;font-weight:bold;}
      .cta-bar {margin-top:30px;}
      .btn {
        display:inline-block; background:#1574f6; color:#fff; font-weight:bold; font-size:1em;
        border-radius:6px; padding:14px 32px; margin-right:9px; text-decoration:none; box-shadow:0 2px 8px #c2d1f6;
        border:none; outline:none; letter-spacing:0.1em;
      }
      .btn:hover { background: #1255b3;}
      .btn2 {
        background:#1b2733; color:#fff; margin-left:0; box-shadow:0 2px 8px #bbc1c7;
      }
      .footer {color:#8697aa;text-align:center;font-size:0.99em;margin:22px 7px 10px 7px;}
      @media (max-width:500px){
        .main {max-width:99%;}
        .content {padding:24px 4% 16px 4%;}
        .cta-bar {margin-top:18px;}
      }
    </style>
  </head>
  <body>
    <div class="main">
      <div class="content">
        <div class="headline">A New TaskHub Job Is Waiting For You!</div>
        <div class="row"><span class="field-label">Title:</span> ${job.title}</div>
        <div class="row"><span class="field-label">Platform:</span> ${platformName}</div>
        <div class="row"><span class="field-label">Published:</span> ${publishedAgo}</div>
        <div class="row"><span class="field-label">Vacancy Available:</span> ${availableVacancy}</div>
        <div class="row reward">Earn: $${Number(job.reward).toFixed(2)}</div>
        <div class="cta-bar">
          <a href="${jobUrl}" class="btn" target="_blank">Apply Now</a>
          <a href="${viewAllUrl}" class="btn btn2" target="_blank">View All Jobs</a>
        </div>
      </div>
      <div class="footer">
        TaskHub – Your gateway to new earning opportunities.<br/>
        &copy; ${new Date().getFullYear()} TaskHub. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  return await sendEmail(recipient, subject, htmlContent);
};


export default sendEmail;