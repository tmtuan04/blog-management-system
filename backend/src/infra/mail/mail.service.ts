import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter, createTransport } from 'nodemailer';
import { AppConfig } from '../../config/configuration';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

/** Gửi email qua SMTP. Dev dùng Mailtrap hoặc Ethereal (requirements mục 9) */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const mail = config.get('mail', { infer: true });
    this.from = mail.from;
    this.transporter = createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.port === 465,
      auth: mail.user ? { user: mail.user, pass: mail.password } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    const info = (await this.transporter.sendMail({
      from: this.from,
      ...message,
    })) as { messageId?: string };
    this.logger.log(`Đã gửi email "${message.subject}" (${info.messageId})`);
  }

  /** UC03: link đặt lại mật khẩu, hết hạn sau 15 phút */
  sendPasswordReset(to: string, fullName: string, link: string) {
    const name = escapeHtml(fullName);
    return this.send({
      to,
      subject: 'Đặt lại mật khẩu',
      text: `Xin chào ${fullName},\n\nMở link sau để đặt mật khẩu mới (hiệu lực 15 phút, dùng 1 lần):\n${link}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
      html: `<p>Xin chào ${name},</p><p>Bấm vào link sau để đặt mật khẩu mới. Link có hiệu lực trong 15 phút và chỉ dùng được 1 lần.</p><p><a href="${escapeHtml(link)}">Đặt lại mật khẩu</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
    });
  }
}
