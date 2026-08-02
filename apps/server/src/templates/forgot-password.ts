const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] as string,
  );

export const forgotPasswordEmailTemplate = (name: string, link: string) => `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:32px 16px;background:#f7f8fa;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 0;">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#0d7a63;">Intervue</p>
                <h1 style="margin:16px 0 0;font-size:22px;line-height:1.3;letter-spacing:-0.02em;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">
                  Hi ${escapeHtml(name)}, we received a request to reset your Intervue password.
                  This link expires in one hour and can only be used once.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 0;">
                <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;background:#0d7a63;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;border-radius:8px;">Reset password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#94a3b8;">
                  If you did not request this, you can safely ignore this email — your password stays unchanged.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
