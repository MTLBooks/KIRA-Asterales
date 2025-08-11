import { SMTPClient } from 'emailjs'
import { resolve } from 'path'

/**
 * Email body data, at least one of text and html must not be empty
 */
type EmailBodyType =
	| { text: string; html?: string }
	| { text?: string; html: string }
	| { text: string; html: string }

/**
 * Send email
 * @param to Recipient
 * @param title Email title (subject)
 * @param body Email body, see EmailBodyType for details
 * @returns Result of sending email
 */
export const sendMail = async (to: string, title: string, body: EmailBodyType) => {
	const smtpHost = process.env.SMTP_ENDPOINT
	const smtpPort = process.env.SMTP_PORT
	const smtpUsername = process.env.SMTP_USER_NAME
	const smtpPassword = process.env.SMTP_PASSWORD
	const KIRAKIRA_EMAIL_SENDER_ADDRESS = 'KIRAKIRA <no-reply@kirakira.moe>'

	if (!smtpHost) {
		console.error('ERROR', 'Failed to send email, smtpHost in environment variables is empty')
		throw new Error('Unable send email because the smtpHost is null')
	}

	if (smtpPort === undefined || smtpPort === null) {
		console.error('ERROR', 'Failed to send email, smtpPort in environment variables is empty or not a valid port')
		throw new Error('Unable send email because the smtpPort is null')
	}

	if (!smtpUsername) {
		console.error('ERROR', 'Failed to send email, smtpUsername in environment variables is empty')
		throw new Error('Unable send email because the smtpUsername is null')
	}

	if (!smtpPassword) {
		console.error('ERROR', 'Failed to send email, smtpPassword in environment variables is empty')
		throw new Error('Unable send email because the smtpPassword is null')
	}

	if (!to) {
		console.error('ERROR', 'Failed to send email, recipient is empty')
		throw new Error('Unable to send the mail, Recipient(TO) is empty')
	}

	if (!title) {
		console.error('ERROR', 'Failed to send email, email title (subject) is empty')
		throw new Error('Unable to send the mail, email title (subject) is empty')
	}

	if (title.length > 200) {
		console.warn('WARN', 'WARNING', 'Warning: Current email title (subject) length exceeds 200 characters, please reduce the length. Emails with titles longer than 1000 characters cannot be sent.')
	}

	if (title.length > 1000) {
		console.error('ERROR', 'Failed to send email, email title (subject) is too long')
		throw new Error('Unable to send the mail, title (subject) is too long')
	}

	if (!body.text && !body.html) {
		console.error('ERROR', 'Failed to send email, both text and html in email body are empty, please provide at least one body data')
		throw new Error('Unable to send the mail, text and html in body in null')
	}

	// Configure SMTP client and specify port
	const client = new SMTPClient({
		user: smtpUsername, // Your SMTP username
		password: smtpPassword, // Your SMTP password
		host: smtpHost, // Choose appropriate SMTP server address based on your region
		port: parseInt(smtpPort, 10), // Specify port (e.g., 587 or 465)
		tls: true, // Enable TLS
		ssl: false,
	})

	// Configure email content
	const message = {
		text: body.text,
		from: KIRAKIRA_EMAIL_SENDER_ADDRESS, // Sender email address
		to, // Recipient email address
		subject: title, // Email subject
		attachment: [
			{
				data: body.html,
				alternative: true,
			},
			// #region Embedded attachment images
			/* {
				path: resolve(import.meta.dirname, "../assets/images", "background.png"),
				type: "image/png",
				headers: { "Content-ID": "<background>" },
			}, */
			// Unfortunately, many email clients don't support displaying embedded images with CSS background-image!
			{
				path: resolve(import.meta.dirname, "../assets/images", "banner.png"),
				type: "image/png",
				headers: { "Content-ID": "<banner>" },
			},
			// #endregion
		],
	}

	try {
		const result = await client.sendAsync(message)
		return { success: true, result, message: 'Email sent successfully' }
	} catch (error) {
		console.error('ERROR', 'Failed to send email, sending error occurred', error)
		return { success: false, result: undefined, message: 'Email sending failed' }
	}
}

/**
 * Validate if Email address is valid
 * @param email Email address to be validated
 * @returns Validation result, returns true if invalid
 */
export function isInvalidEmail(email: string): boolean {
	return !email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]{2,}$/)
}
