/**
 * Professional HTML Email Template Base
 * Mobile-responsive, email client compatible design
 */

export interface EmailTemplateVariables {
  [key: string]: string | number | undefined | null
}

/**
 * Generate professional HTML email wrapper with mobile-responsive design
 */
export function generateEmailHTML(
  content: string,
  options?: {
    title?: string
    preheader?: string
    backgroundColor?: string
    primaryColor?: string
  }
): string {
  const {
    title = 'UHQ Accounts',
    preheader = '',
    backgroundColor = '#f8fafc',
    primaryColor = '#111827'
  } = options || {}

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    
    /* Base styles */
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
      background-color: ${backgroundColor};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #1f2937;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Container */
    .email-wrapper {
      width: 100%;
      background-color: ${backgroundColor};
      padding: 20px 0;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    /* Header */
    .email-header {
      background-color: ${primaryColor};
      padding: 30px 20px;
      text-align: center;
    }
    
    .email-header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    
    /* Content */
    .email-content {
      padding: 40px 30px;
    }
    
    /* Typography */
    h1, h2, h3, h4, h5, h6 {
      margin: 0 0 16px 0;
      color: #111827;
      font-weight: 600;
      line-height: 1.3;
    }
    
    h1 { font-size: 28px; }
    h2 { font-size: 24px; }
    h3 { font-size: 20px; }
    h4 { font-size: 18px; }
    
    p {
      margin: 0 0 16px 0;
      color: #374151;
      line-height: 1.6;
    }
    
    a {
      color: ${primaryColor};
      text-decoration: underline;
    }
    
    /* Buttons */
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      line-height: 1.5;
      text-align: center;
      margin: 20px 0;
    }
    
    .button:hover {
      opacity: 0.9;
    }
    
    /* Divider */
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
      border: none;
    }
    
    /* Info boxes */
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid ${primaryColor};
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .success-box {
      background-color: #ecfdf5;
      border-left-color: #10b981;
    }
    
    .warning-box {
      background-color: #fffbeb;
      border-left-color: #f59e0b;
    }
    
    .error-box {
      background-color: #fef2f2;
      border-left-color: #ef4444;
    }
    
    /* Footer */
    .email-footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .email-footer p {
      margin: 8px 0;
      color: #6b7280;
      font-size: 14px;
    }
    
    .email-footer a {
      color: #6b7280;
      text-decoration: none;
    }
    
    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        border-radius: 0 !important;
      }
      
      .email-content {
        padding: 30px 20px !important;
      }
      
      .email-header {
        padding: 20px 15px !important;
      }
      
      .email-header h1 {
        font-size: 20px !important;
      }
      
      h1 { font-size: 24px !important; }
      h2 { font-size: 20px !important; }
      h3 { font-size: 18px !important; }
      
      .button {
        display: block !important;
        width: 100% !important;
        padding: 12px 20px !important;
      }
      
      .email-footer {
        padding: 20px 15px !important;
      }
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #1f2937 !important;
      }
      
      .email-content {
        color: #f9fafb !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: #f9fafb !important;
      }
      
      p {
        color: #d1d5db !important;
      }
      
      .email-footer {
        background-color: #111827 !important;
        border-top-color: #374151 !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      ${preheader ? `<div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${preheader}</div>` : ''}
      
      <div class="email-header">
        <h1>${title}</h1>
      </div>
      
      <div class="email-content">
        ${content}
      </div>
      
      <div class="email-footer">
        <p><strong>UHQ Accounts</strong></p>
        <p>Thank you for your business!</p>
        <p>
          <a href="${process.env.FRONTEND_URL || 'https://flexora.com'}">Visit our website</a> | 
          <a href="mailto:support@flexora.com">Contact Support</a>
        </p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Convert HTML to plain text (basic conversion)
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Replace template variables in text
 */
export function replaceTemplateVariables(
  template: string,
  variables: EmailTemplateVariables
): string {
  let result = template
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
    const replacement = value !== null && value !== undefined ? String(value) : ''
    result = result.replace(regex, replacement)
  }
  
  return result
}

