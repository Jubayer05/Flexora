export function guestAccessCodeEmail({ code, cartGroup }: { code: string; cartGroup: string }) {
  return {
    subject: 'Your Order Access Code',
    text: `Hello,\n\nYour access code for viewing your order is: ${code}\n\nThis code will expire in 15 minutes.\n\nOrder Number: ${cartGroup}\n\nIf you did not request this, please ignore this email.\n\nThank you,\nYour Company Team`,
    html: `<p>Hello,</p><p>Your access code for viewing your order is: <b>${code}</b></p><p>This code will expire in 15 minutes.</p><p>Order Number: <b>${cartGroup}</b></p><p>If you did not request this, please ignore this email.</p><p>Thank you,<br/>Your Company Team</p>`
  }
}
