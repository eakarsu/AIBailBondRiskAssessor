const nodemailer = require('nodemailer');
const pool = require('../db');

// Create reusable transporter using environment config
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

/**
 * Send a court date reminder email to the bail agent
 */
async function sendCourtDateReminder({ agentEmail, agentName, defendantName, courtDate, hearingType, courtName, caseNumber, bondAmount }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[EmailService] SMTP not configured. Skipping email for:', defendantName);
    return { skipped: true, reason: 'SMTP not configured' };
  }

  const transporter = createTransporter();
  const formattedDate = new Date(courtDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const mailOptions = {
    from: `"Bail Bond Risk System" <${process.env.SMTP_USER}>`,
    to: agentEmail,
    subject: `[REMINDER] Court Date in 48h: ${defendantName} - ${hearingType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Court Date Reminder</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">AI Bail Bond Risk Assessor</p>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
          <p>Hello ${agentName || 'Bail Agent'},</p>
          <p>This is an automated reminder that the following defendant has a court appearance within the next <strong>48 hours</strong>:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #fff; font-weight: bold; width: 40%;">Defendant</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: #fff;">${defendantName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Court Date</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #fff; font-weight: bold;">Hearing Type</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: #fff;">${hearingType || 'Hearing'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Court</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">${courtName || 'See case file'}</td>
            </tr>
            ${caseNumber ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #fff; font-weight: bold;">Case Number</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: #fff;">${caseNumber}</td>
            </tr>` : ''}
            ${bondAmount ? `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5; font-weight: bold;">Bond Amount</td>
              <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;">$${parseFloat(bondAmount).toLocaleString()}</td>
            </tr>` : ''}
          </table>

          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin: 15px 0;">
            <strong>Action Required:</strong> Please ensure the defendant is aware of their court obligation and confirm attendance.
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated notification from the AI Bail Bond Risk Assessor system.
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
    text: `Court Date Reminder\n\nDefendant: ${defendantName}\nCourt Date: ${formattedDate}\nHearing Type: ${hearingType || 'Hearing'}\nCourt: ${courtName || 'See case file'}\n${caseNumber ? `Case #: ${caseNumber}\n` : ''}${bondAmount ? `Bond Amount: $${parseFloat(bondAmount).toLocaleString()}\n` : ''}\nPlease ensure the defendant is aware of their court obligation.`
  };

  const info = await transporter.sendMail(mailOptions);
  return { sent: true, messageId: info.messageId };
}

/**
 * Check for court dates within the next 48 hours and send reminders to bail agents.
 * Called by the scheduler in index.js.
 */
async function checkAndSendCourtDateReminders() {
  try {
    console.log('[EmailService] Checking for upcoming court dates (next 48h)...');

    const agentEmail = process.env.BAIL_AGENT_EMAIL || process.env.SMTP_USER;
    if (!agentEmail) {
      console.log('[EmailService] No agent email configured (BAIL_AGENT_EMAIL). Skipping reminders.');
      return;
    }

    // Find court cases with hearing dates in next 48 hours
    const result = await pool.query(
      `SELECT cc.id, cc.next_hearing_date, cc.hearing_type, cc.court_name, cc.case_number,
              d.first_name, d.last_name, d.email as defendant_email,
              bb.bond_amount
       FROM court_cases cc
       LEFT JOIN defendants d ON cc.defendant_id = d.id
       LEFT JOIN bail_bonds bb ON bb.defendant_id = d.id AND bb.status = 'active'
       WHERE cc.next_hearing_date BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
         AND (cc.status IS NULL OR cc.status NOT IN ('Closed','closed','Completed','completed','Dismissed','dismissed'))
         AND (cc.reminder_sent IS NULL OR cc.reminder_sent = false)
       ORDER BY cc.next_hearing_date ASC`
    );

    if (result.rows.length === 0) {
      console.log('[EmailService] No upcoming court dates found in the next 48 hours.');
      return;
    }

    console.log(`[EmailService] Found ${result.rows.length} upcoming court date(s). Sending reminders...`);

    for (const row of result.rows) {
      const defendantName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || `Defendant #${row.defendant_id}`;
      try {
        const emailResult = await sendCourtDateReminder({
          agentEmail,
          agentName: 'Bail Agent',
          defendantName,
          courtDate: row.next_hearing_date,
          hearingType: row.hearing_type,
          courtName: row.court_name,
          caseNumber: row.case_number,
          bondAmount: row.bond_amount,
        });

        if (emailResult.sent) {
          console.log(`[EmailService] Reminder sent for ${defendantName} (Case ID: ${row.id})`);
          // Mark reminder as sent (gracefully skip if column doesn't exist)
          await pool.query(
            `UPDATE court_cases SET reminder_sent = true WHERE id = $1`,
            [row.id]
          ).catch(() => {});
        } else {
          console.log(`[EmailService] Skipped reminder for ${defendantName}: ${emailResult.reason}`);
        }
      } catch (emailErr) {
        console.error(`[EmailService] Failed to send reminder for ${defendantName}:`, emailErr.message);
      }
    }
  } catch (err) {
    console.error('[EmailService] Error during court date check:', err.message);
  }
}

/**
 * Start the hourly scheduler for court date reminders.
 */
function startCourtDateReminderScheduler() {
  const intervalMs = parseInt(process.env.REMINDER_INTERVAL_MS) || 60 * 60 * 1000; // default 1 hour
  console.log(`[EmailService] Court date reminder scheduler started (checking every ${intervalMs / 60000} minutes).`);

  // Run immediately on startup, then on interval
  checkAndSendCourtDateReminders();
  setInterval(checkAndSendCourtDateReminders, intervalMs);
}

module.exports = {
  sendCourtDateReminder,
  checkAndSendCourtDateReminders,
  startCourtDateReminderScheduler,
};
