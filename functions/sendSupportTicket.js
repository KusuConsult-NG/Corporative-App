const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

const resend = new Resend(functions.config().resend?.api_key || process.env.VITE_RESEND_API_KEY);

/**
 * Send Support Ticket Email
 * Sends support ticket details to support@anchoragecs.com
 */
exports.sendSupportTicketEmail = functions.https.onCall(async (data, context) => {
    try {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { subject, message, category, priority } = data;
        const userId = context.auth.uid;

        // FIX-010: Validate and sanitize inputs
        if (!subject || subject.length > 200) {
            throw new functions.https.HttpsError('invalid-argument', 'Subject must be between 1-200 characters');
        }

        if (!message || message.length > 5000) {
            throw new functions.https.HttpsError('invalid-argument', 'Message must be between 1-5000 characters');
        }

        if (!category || !priority) {
            throw new functions.https.HttpsError('invalid-argument', 'Category and priority are required');
        }

        // Basic HTML escaping to prevent XSS in emails
        const escapeHtml = (text) => {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        const sanitizedSubject = escapeHtml(subject);
        const sanitizedMessage = escapeHtml(message);

        // Get user details
        const db = admin.firestore();
        const usersSnapshot = await db.collection('users')
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            throw new functions.https.HttpsError('not-found', 'User not found');
        }

        const userData = usersSnapshot.docs[0].data();
        const userName = `${userData.firstName} ${userData.lastName}`;
        const userEmail = userData.email;
        const userPhone = userData.phoneNumber || 'Not provided';

        // Store ticket in Firestore
        const ticketRef = await db.collection('supportTickets').add({
            userId,
            userName,
            userEmail,
            userPhone,
            subject,
            message,
            category: category || 'general',
            priority: priority || 'medium',
            status: 'open',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send email notification to support
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        .info-row {
            display: flex;
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            width: 120px;
            color: #555;
        }
        .info-value {
            color: #333;
        }
        .message-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            white-space: pre-wrap;
            border: 1px solid #e0e0e0;
        }
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .priority-high {
            background: #fee;
            color: #c00;
        }
        .priority-medium {
            background: #fef3cd;
            color: #856404;
        }
        .priority-low {
            background: #d1ecf1;
            color: #0c5460;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">🎫 New Support Ticket</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">AWSLMCSL Cooperative Portal</p>
    </div>
    
    <div class="content">
        <div class="info-box">
            <h2 style="margin-top: 0; color: #667eea;">Ticket Information</h2>
            <div class="info-row">
                <span class="info-label">Ticket ID:</span>
                <span class="info-value">${ticketRef.id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Category:</span>
                <span class="info-value">${category || 'General'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Priority:</span>
                <span class="info-value">
                    <span class="priority-badge priority-${priority || 'medium'}">${priority || 'medium'}</span>
                </span>
            </div>
            <div class="info-row">
                <span class="info-label">Subject:</span>
                <span class="info-value"><strong>${sanitizedSubject}</strong></span>
            </div>
        </div>

        <div class="info-box">
            <h2 style="margin-top: 0; color: #667eea;">User Details</h2>
            <div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${userName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value"><a href="mailto:${userEmail}">${userEmail}</a></span>
            </div>
            <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value"><a href="tel:${userPhone}">${userPhone}</a></span>
            </div>
            <div class="info-row">
                <span class="info-label">User ID:</span>
                <span class="info-value" style="font-family: monospace; font-size: 11px;">${userId}</span>
            </div>
        </div>

        <div style="margin-top: 20px;">
            <h3 style="color: #667eea; margin-bottom: 10px;">Message:</h3>
            <div class="message-box">${sanitizedMessage}</div>
        </div>

        <div style="text-align: center;">
            <a href="https://console.firebase.google.com/project/device-streaming-c7297924/firestore/data/supportTickets/${ticketRef.id}" class="btn">
                View in Firebase Console
            </a>
        </div>
    </div>

    <div class="footer">
        <p><strong>AWSLMCSL - Anchorage Welfare Savings and Loans Multipurpose Cooperative Society Limited</strong></p>
        <p>University of Jos Library, PMB 2084<br>
        Phone: 08065810868, 08136905553 | Email: support@anchoragecs.com</p>
        <p style="margin-top: 15px; color: #999;">This is an automated notification from the AWSLMCSL Support System</p>
    </div>
</body>
</html>
        `;

        await resend.emails.send({
            from: 'AWSLMCSL Support <notifications@anchoragecs.com>',
            to: 'support@anchoragecs.com',
            replyTo: userEmail,
            subject: `[Support Ticket #${ticketRef.id.substring(0, 8)}] ${sanitizedSubject}`,
            html: emailHtml
        });

        // Send confirmation email to user
        const userEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .success-icon {
            font-size: 48px;
            text-align: center;
            margin: 20px 0;
        }
        .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="margin: 0;">✅ Ticket Received</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">We've got your message!</p>
    </div>
    
    <div class="content">
        <div class="success-icon">✓</div>
        
        <p>Dear ${userName},</p>
        
        <p>Thank you for contacting AWSLMCSL support. We have received your support ticket and our team will review it shortly.</p>
        
        <div class="info-box">
            <p><strong>Ticket ID:</strong> ${ticketRef.id}</p>
            <p><strong>Subject:</strong> ${sanitizedSubject}</p>
            <p><strong>Status:</strong> Open</p>
            <p><strong>Priority:</strong> ${priority || 'Medium'}</p>
        </div>

        <p><strong>What happens next?</strong></p>
        <ul>
            <li>Our support team will review your ticket within 24 hours</li>
            <li>We'll respond to your email: ${userEmail}</li>
            <li>For urgent issues, please call: 08065810868 or 08136905553</li>
        </ul>

        <p>If you have any additional information to add, simply reply to this email.</p>

        <p>Best regards,<br>
        <strong>AWSLMCSL Support Team</strong></p>
    </div>

    <div class="footer">
        <p><strong>AWSLMCSL</strong></p>
        <p>University of Jos Library, PMB 2084<br>
        Phone: 08065810868, 08136905553 | Email: support@anchoragecs.com</p>
    </div>
</body>
</html>
        `;

        await resend.emails.send({
            from: 'AWSLMCSL Support <notifications@anchoragecs.com>',
            to: userEmail,
            subject: `Support Ticket Received - #${ticketRef.id.substring(0, 8)}`,
            html: userEmailHtml
        });

        return {
            success: true,
            ticketId: ticketRef.id,
            message: 'Support ticket submitted successfully! Check your email for confirmation.'
        };

    } catch (error) {
        console.error('Error sending support ticket email:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
