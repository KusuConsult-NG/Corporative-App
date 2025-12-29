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
                                .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
                                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
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
                                        <p><strong>Applicant:</strong> ${applicantName}</p>
                                        <p><strong>Loan Amount:</strong> ₦${loanAmount.toLocaleString()}</p>
                                        <p><strong>Purpose:</strong> ${loanPurpose}</p>
                                    </div>
                                    <p style="text-align: center;">
                                        <a href="${approvalLink}" class="button">Review & Respond to Request</a>
                                    </p>
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
            return { success: false, error: error.message }
        }
    },

    // NEW: Send loan approval email
    sendLoanApprovalEmail: async (userEmail, loan) => {
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
                    to: userEmail,
                    subject: '🎉 Loan Approved!',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                                .amount { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
                                .detail-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                                .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>✅ Loan Approved!</h1>
                                </div>
                                <div class="content">
                                    <p>Dear ${loan.userName},</p>
                                    <p>Great news! Your loan application has been approved by our administrators.</p>
                                    <div class="amount">₦${loan.amount.toLocaleString()}</div>
                                    <div class="detail-box">
                                        <h3 style="color: #10b981; margin-top: 0;">Loan Details</h3>
                                        <p><strong>Amount:</strong> ₦${loan.amount.toLocaleString()}</p>
                                        <p><strong>Purpose:</strong> ${loan.purpose}</p>
                                        <p><strong>Duration:</strong> ${loan.duration} months</p>
                                        <p><strong>Monthly Payment:</strong> ₦${(loan.amount / loan.duration).toLocaleString()}</p>
                                    </div>
                                    <p style="text-align: center;">
                                        <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/member/loans" class="button">View Loan Details</a>
                                    </p>
                                    <p style="color: #6b7280; font-size: 14px;">The loan amount will be disbursed to your account within 2-3 business days. Monthly deductions will begin from your next salary.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending loan approval email:', error)
            return { success: false, error: error.message }
        }
    },

    // NEW: Send loan rejection email
    sendLoanRejectionEmail: async (userEmail, loan, reason) => {
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
                    to: userEmail,
                    subject: 'Loan Application Update',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: #f9fafb; padding: 30px; border-radius: 10px; border-left: 4px solid #ef4444;">
                                <h2 style="color: #ef4444;">Loan Application Update</h2>
                                <p>Dear ${loan.userName},</p>
                                <p>We regret to inform you that your loan application for <strong>₦${loan.amount.toLocaleString()}</strong> could not be approved at this time.</p>
                                ${reason ? `<div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Reason:</strong><br>${reason}</p></div>` : ''}
                                <p>You may resubmit your application after addressing the concerns mentioned above. If you have any questions, please contact our support team.</p>
                                <p style="color: #6b7280; font-size: 14px;">Thank you for your understanding.</p>
                            </div>
                        </body>
                        </html>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending loan rejection email:', error)
            return { success: false, error: error.message }
        }
    },

    // NEW: Send commodity order approval email
    sendOrderApprovalEmail: async (userEmail, order) => {
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
                    to: userEmail,
                    subject: '📦 Commodity Order Approved!',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                <h1>✅ Order Approved!</h1>
                            </div>
                            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                                <p>Dear ${order.userName},</p>
                                <p>Great news! Your commodity order has been approved.</p>
                                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="color: #8b5cf6; margin-top: 0;">Order Details</h3>
                                    <p><strong>Product:</strong> ${order.productName}</p>
                                    <p><strong>Quantity:</strong> ${order.quantity}</p>
                                    <p><strong>Total Amount:</strong> ₦${order.totalAmount.toLocaleString()}</p>
                                    ${order.paymentType === 'installment' ? `<p><strong>Payment Plan:</strong> ${order.duration} monthly installments of ₦${order.monthlyPayment.toLocaleString()}</p>` : ''}
                                </div>
                                <p style="text-align: center;">
                                    <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/member/orders" style="display: inline-block; background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Order</a>
                                </p>
                                <p style="color: #6b7280; font-size: 14px;">Your order will be processed and ready for delivery soon. You'll receive another notification when it ships.</p>
                            </div>
                        </body>
                        </html>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending order approval email:', error)
            return { success: false, error: error.message }
        }
    },

    // NEW: Send payment confirmation email
    sendPaymentConfirmationEmail: async (userEmail, payment) => {
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
                    to: userEmail,
                    subject: '💳 Payment Processed',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: #f9fafb; padding: 30px; border-radius: 10px; border-left: 4px solid #10b981;">
                                <h2 style="color: #10b981;">✅ Payment Processed</h2>
                                <p>Dear ${payment.userName},</p>
                                <p>Your installment payment has been successfully processed.</p>
                                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <p><strong>Product:</strong> ${payment.productName}</p>
                                    <p><strong>Installment:</strong> ${payment.installmentNumber} of ${payment.totalInstallments}</p>
                                    <p><strong>Amount Paid:</strong> ₦${payment.amount.toLocaleString()}</p>
                                    <p><strong>Payment Reference:</strong> ${payment.reference}</p>
                                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                                </div>
                                <p>You can view your complete payment schedule and progress in your account.</p>
                                <p style="text-align: center;">
                                    <a href="${process.env.VITE_APP_URL || 'http://localhost:5173'}/member/orders" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Payment Schedule</a>
                                </p>
                            </div>
                        </body>
                        </html>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending payment confirmation email:', error)
            return { success: false, error: error.message }
        }
    },

    // NEW: Send broadcast email
    sendBroadcastEmail: async (userEmail, broadcast) => {
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
                    to: userEmail,
                    subject: `📢 ${broadcast.subject}`,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                                <h2>📢 Broadcast Message</h2>
                            </div>
                            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                                <h3 style="color: #667eea;">${broadcast.subject}</h3>
                                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap;">${broadcast.message}</div>
                                <p style="color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px;">
                                    This is a broadcast message from AWSLMCSL Cooperative Society.<br>
                                    Sent by: ${broadcast.senderName}
                                </p>
                            </div>
                        </body>
                        </html>
                    `
                })
            })

            return { success: true }
        } catch (error) {
            console.error('Error sending broadcast email:', error)
            return { success: false, error: error.message }
        }
    },

    // Existing methods continue below...
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
                        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2>Welcome to AWSLMCSL!</h2>
                            <p>Dear ${userName},</p>
                            <p>Please verify your email address by clicking the button below:</p>
                            <p style="text-align: center;">
                                <a href="${verificationLink}" style="display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
                            </p>
                            <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
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
    }
}
