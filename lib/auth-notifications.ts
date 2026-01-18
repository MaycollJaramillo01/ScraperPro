/**
 * Notification system for login approvals
 * This will send notifications to the admin when someone tries to login
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "Maycolljaramillo01@gmail.com";

export interface LoginRequest {
  id: string;
  email: string;
  requestedAt: string;
  ipAddress?: string;
  userAgent?: string;
  status: "pending" | "approved" | "rejected";
}

// In-memory store for login requests (in production, use a database)
const loginRequests = new Map<string, LoginRequest>();

/**
 * Create a login request notification
 */
export async function createLoginRequest(
  email: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<string> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const request: LoginRequest = {
    id: requestId,
    email: email.toLowerCase(),
    requestedAt: new Date().toISOString(),
    ipAddress,
    userAgent,
    status: "pending",
  };

  loginRequests.set(requestId, request);

  // Send notification to admin
  await sendAdminNotification(request);

  return requestId;
}

/**
 * Send notification to admin
 * This can be extended to use Microsoft Graph API for push notifications
 */
async function sendAdminNotification(request: LoginRequest): Promise<void> {
  try {
    // Option 1: Send email notification (simpler, works immediately)
    await sendEmailNotification(request);

    // Option 2: Microsoft Graph API for push notifications (requires setup)
    // await sendMicrosoftPushNotification(request);
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
}

/**
 * Send email notification to admin
 */
async function sendEmailNotification(request: LoginRequest): Promise<void> {
  // In production, use a service like Resend, SendGrid, or Nodemailer
  // For now, we'll log it and you can integrate your email service
  
  const emailBody = `
Nueva solicitud de login detectada:

Email: ${request.email}
Fecha: ${new Date(request.requestedAt).toLocaleString()}
IP: ${request.ipAddress || "N/A"}
User Agent: ${request.userAgent || "N/A"}

Para aprobar este login, visita:
${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/approvals

Request ID: ${request.id}
  `;

  console.log("📧 Email notification to admin:", ADMIN_EMAIL);
  console.log("Subject: Nueva solicitud de login");
  console.log("Body:", emailBody);

  // TODO: Integrate with your email service
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'noreply@yourdomain.com',
  //   to: ADMIN_EMAIL,
  //   subject: 'Nueva solicitud de login - ScraperPro',
  //   html: emailBody,
  // });
}

/**
 * Send Microsoft Push Notification (requires Microsoft Graph API setup)
 * This requires:
 * 1. Azure AD app registration
 * 2. Microsoft Graph API permissions
 * 3. OAuth token for Microsoft Graph
 */
async function sendMicrosoftPushNotification(request: LoginRequest): Promise<void> {
  // This is a placeholder - you'll need to implement Microsoft Graph API integration
  // See: https://learn.microsoft.com/en-us/graph/api/user-sendmail
  
  const microsoftGraphToken = process.env.MICROSOFT_GRAPH_TOKEN;
  if (!microsoftGraphToken) {
    console.warn("Microsoft Graph token not configured, skipping push notification");
    return;
  }

  // Example implementation:
  // const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${microsoftGraphToken}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     message: {
  //       subject: 'Nueva solicitud de login - ScraperPro',
  //       body: {
  //         contentType: 'Text',
  //         content: `Nueva solicitud de login de ${request.email}`,
  //       },
  //       toRecipients: [{
  //         emailAddress: {
  //           address: ADMIN_EMAIL,
  //         },
  //       }],
  //     },
  //   }),
  // });
}

/**
 * Get login request by ID
 */
export function getLoginRequest(requestId: string): LoginRequest | null {
  return loginRequests.get(requestId) || null;
}

/**
 * Get all pending login requests
 */
export function getPendingLoginRequests(): LoginRequest[] {
  return Array.from(loginRequests.values()).filter((req) => req.status === "pending");
}

/**
 * Update login request status
 */
export function updateLoginRequestStatus(
  requestId: string,
  status: "approved" | "rejected",
): boolean {
  const request = loginRequests.get(requestId);
  if (!request) {
    return false;
  }

  request.status = status;
  loginRequests.set(requestId, request);
  return true;
}

/**
 * Clean up old requests (older than 24 hours)
 */
export function cleanupOldRequests(): void {
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  for (const [id, request] of loginRequests.entries()) {
    if (new Date(request.requestedAt).getTime() < twentyFourHoursAgo) {
      loginRequests.delete(id);
    }
  }
}

