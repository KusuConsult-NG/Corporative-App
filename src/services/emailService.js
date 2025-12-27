const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY

export const emailService = {
    sendGuarantorNotification: async (guarantorEmail, loanDetails) => {
        try {
            // Skip email if API key is not configured
            if (!RESEND_API_KEY || RESEND_API_KEY === 'undefined') {
                console.warn('Email service not configured. Skipping email notification.')
                return { success: false, message: 'Email service not configured' }
            }

            const { applicantName, loanAmount, loanPurpose, approvalLink } = loanDetails

            // Create an AbortController with 5 second timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
                    to: guarantorEmail,
                    subject: 'Guarantor Request for Loan Application',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                                .detail-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
                                .detail-row:last-child { border-bottom: none; }
                                .label { font-weight: bold; color: #6b7280; }
                                .value { color: #111827; }
                                .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
                                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                                .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>Guarantor Request</h1>
                                    <p>AWSLMCSL Cooperative Society</p>
                                </div>
                                <div class="content">
                                    <p>Dear Member,</p>
                                    <p><strong>${applicantName}</strong> has requested you to be a guarantor for their loan application.</p>
                                    
                                    <div class="detail-box">
                                        <h3 style="margin-top: 0; color: #667eea;">Loan Details</h3>
                                        <div class="detail-row">
                                            <span class="label">Applicant:</span>
                                            <span class="value">${applicantName}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="label">Loan Amount:</span>
                                            <span class="value">₦${loanAmount.toLocaleString()}</span>
                                        </div>
                                        <div class="detail-row">
                                            <span class="label">Purpose:</span>
                                            <span class="value">${loanPurpose}</span>
                                        </div>
                                    </div>

                                    <div class="warning">
                                        <strong>⚠️ Important:</strong> As a guarantor, you agree to take responsibility for this loan if the borrower defaults. Please review the terms carefully before accepting.
                                    </div>

                                    <p style="text-align: center;">
                                        <a href="${approvalLink}" class="button">Review & Respond to Request</a>
                                    </p>

                                    <p style="color: #6b7280; font-size: 14px;">This link will expire in 3 days. Please respond as soon as possible.</p>
                                </div>
                                <div class="footer">
                                    <p>AWSLMCSL Cooperative Society<br>This is an automated message, please do not reply.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                })
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const errorText = await response.text()
                console.error('Email API error:', errorText)
                throw new Error(`Failed to send email: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Email request timed out after 5 seconds')
            } else {
                console.error('Error sending guarantor notification:', error)
            }
            // Don't throw - just log the error and continue
            return { success: false, error: error.message }
        }
    },

    sendApplicantUpdate: async (applicantEmail, guarantorName, status) => {
        try {
            const statusText = status === 'approved' ? 'approved' : 'declined'
            const statusColor = status === 'approved' ? '#10b981' : '#ef4444'

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
                    to: applicantEmail,
                    subject: `Guarantor Update: ${guarantorName} has ${statusText} your request`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: ${statusColor};">Guarantor ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h2>
                            <p><strong>${guarantorName}</strong> has ${statusText} your request to be a guarantor for your loan application.</p>
                            <p>Login to your account to view the updated status of your application.</p>
                        </div>
                    `
                })
            })
        } catch (error) {
            console.error('Error sending applicant update:', error)
        }
    }
}
