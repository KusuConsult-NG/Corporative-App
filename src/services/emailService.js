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
    },

    sendVerificationEmail: async (email, userName, verificationLink) => {
        try {
            if (!RESEND_API_KEY || RESEND_API_KEY === 'undefined') {
                console.warn('Email service not configured. Skipping verification email.')
                return { success: false, message: 'Email service not configured' }
            }

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
                    to: email,
                    subject: 'Verify Your Email Address',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                                .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
                                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>Welcome to AWSLMCSL!</h1>
                                </div>
                                <div class="content">
                                    <p>Dear ${userName},</p>
                                    <p>Thank you for registering with the Anchorage Welfare Savings and Loans Multipurpose Cooperative Society Limited.</p>
                                    <p>Please verify your email address by clicking the button below:</p>
                                    <p style="text-align: center;">
                                        <a href="${verificationLink}" class="button">Verify Email Address</a>
                                    </p>
                                    <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours. If you didn't create an account, please ignore this email.</p>
                                    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:<br>${verificationLink}</p>
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
                throw new Error(`Failed to send email: ${response.status}`)
            }

            return { success: true }
        } catch (error) {
            console.error('Error sending verification email:', error)
            return { success: false, error: error.message }
        }
    },

    sendRegistrationFeeReminder: async (email, userName, paymentLink) => {
        try {
            if (!RESEND_API_KEY || RESEND_API_KEY === 'undefined') {
                return { success: false, message: 'Email service not configured' }
            }

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
                    to: email,
                    subject: 'Complete Your Registration - Payment Required',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #667eea;">Complete Your Registration</h2>
                            <p>Dear ${userName},</p>
                            <p>Your email has been verified successfully! To complete your registration and gain full access to the cooperative platform, please pay the registration fee of <strong>₦2,000</strong>.</p>
                            <p style="text-align: center; margin: 30px 0;">
                                <a href="${paymentLink}" style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">Pay Registration Fee</a>
                            </p>
                            <p>After payment, you'll have access to all cooperative services including loans, savings, and commodities.</p>
                        </div>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending registration fee reminder:', error)
            return { success: false, error: error.message }
        }
    },

    sendAdminApprovalNotification: async (adminEmail, approvalType, userName, requestDetails) => {
        try {
            if (!RESEND_API_KEY || RESEND_API_KEY === 'undefined') {
                return { success: false, message: 'Email service not configured' }
            }

            const typeLabel = approvalType === 'bank_details' ? 'Bank Details' : 'Approval Request'

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
                    to: adminEmail,
                    subject: `New ${typeLabel} Approval Request`,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                                .detail-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
                                .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 10px 0; font-weight: bold; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h2>⚠️ Approval Request Pending</h2>
                                </div>
                                <div class="content">
                                    <p>Dear Admin,</p>
                                    <p><strong>${userName}</strong> has submitted a new ${typeLabel} approval request.</p>
                                    <div class="detail-box">
                                        <h3 style="margin-top: 0; color: #667eea;">Request Details</h3>
                                        ${requestDetails}
                                    </div>
                                    <p style="text-align: center;">
                                        <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/admin/approvals" class="button">Review Request</a>
                                    </p>
                                    <p style="color: #6b7280; font-size: 14px;">Please review and approve/reject this request at your earliest convenience.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending admin notification:', error)
            return { success: false, error: error.message }
        }
    },

    sendApprovalStatusUpdate: async (userEmail, userName, approvalType, status, note) => {
        try {
            if (!RESEND_API_KEY || RESEND_API_KEY === 'undefined') {
                return { success: false, message: 'Email service not configured' }
            }

            const statusText = status === 'approved' ? 'Approved' : 'Rejected'
            const statusColor = status === 'approved' ? '#10b981' : '#ef4444'
            const typeLabel = approvalType === 'bank_details' ? 'Bank Details' : 'Request'

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
                    to: userEmail,
                    subject: `${typeLabel} ${statusText}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: ${statusColor};">${typeLabel} ${statusText}</h2>
                            <p>Dear ${userName},</p>
                            <p>Your ${typeLabel} request has been <strong style="color: ${statusColor};">${statusText.toLowerCase()}</strong> by an administrator.</p>
                            ${note ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Note from Admin:</strong><br>${note}</p></div>` : ''}
                            <p>Login to your account to view the updated status.</p>
                        </div>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending approval status update:', error)
            return { success: false, error: error.message }
        }
    },

    sendGuarantorReminder: async (guarantorEmail, applicantName, loanAmount, approvalLink, daysRemaining) => {
        try {
            if (!RESEND_API_KEY || RESEND_API_KEY === 'undefined') {
                return { success: false, message: 'Email service not configured' }
            }

            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'AWSLMCSL Cooperative <noreply@awslmcsl.org>',
                    to: guarantorEmail,
                    subject: 'Reminder: Guarantor Request Pending',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #f59e0b;">⏰ Reminder: Action Required</h2>
                            <p>Dear Member,</p>
                            <p>This is a friendly reminder that <strong>${applicantName}</strong> is waiting for your response to their guarantor request for a loan of <strong>₦${loanAmount.toLocaleString()}</strong>.</p>
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                <p style="margin: 0;"><strong>Note:</strong> This request will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please respond as soon as possible.</p>
                            </div>
                            <p style="text-align: center; margin: 30px 0;">
                                <a href="${approvalLink}" style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">Review Request</a>
                            </p>
                        </div>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending guarantor reminder:', error)
            return { success: false, error: error.message }
        }
    }
}
