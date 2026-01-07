import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API Key
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
    console.warn("SENDGRID_API_KEY is missing in environment variables.");
}

/**
 * Send an email using SendGrid
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} params.text - Plain text content (optional)
 */
export async function sendEmail({ to, subject, html, text }) {
    try {
        const from = process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';

        const msg = {
            to,
            from,
            subject,
            html,
            text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback text generation
        };

        await sgMail.send(msg);
        console.log(`Email sent successfully to ${to}`);
        return { success: true };
    } catch (error) {
        console.error('SendGrid Email Error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        // Don't crash the app, just return failure
        return { success: false, error: error.message };
    }
}
