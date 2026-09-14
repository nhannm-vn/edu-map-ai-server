import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { Resend } from 'resend'

@Injectable()
export class MailService {
  private resend: Resend

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
  }

  async sendResetPasswordEmail(email: string, resetLink: string) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Acme <onboarding@resend.dev>',
        to: [email],
        subject: 'Yêu cầu đặt lại mật khẩu của bạn',
        html: `
        <div style="background-color: #f3f4f6; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            
            <!-- Header -->
            <div style="background: #4f46e5; padding: 24px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 20px;">Khôi phục mật khẩu</h2>
            </div>

            <!-- Body Content -->
            <div style="padding: 32px 24px;">
              <p style="color: #374151; font-size: 15px; margin-top: 0;">Xin chào,</p>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này. Vui lòng nhấn vào nút bên dưới để tiến hành nhập mật khẩu mới.
              </p>

              <!-- Form-like Visual Box / CTA Button -->
              <div style="margin: 28px 0; text-align: center;">
                <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);">
                  Đến trang đặt lại mật khẩu
                </a>
              </div>

              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-top: 20px;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 6px 0;">Hoặc copy đường dẫn này dán vào trình duyệt:</p>
                <a href="${resetLink}" style="color: #4f46e5; font-size: 12px; word-break: break-all; text-decoration: underline;">${resetLink}</a>
              </div>

              <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; margin-bottom: 0;">
                Liên kết này có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu thay đổi, vui lòng bỏ qua email này.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} EduMap AI. All rights reserved.</p>
            </div>

          </div>
        </div>
      `,
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : String(err))
    }
  }
}
