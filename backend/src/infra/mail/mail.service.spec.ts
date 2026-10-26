import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('MailService', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'id-1' });
  const configWith = (user: string, port = 587) =>
    ({
      get: () => ({
        host: 'smtp.test',
        port,
        user,
        password: 'secret',
        from: 'Blog <no-reply@blog.local>',
      }),
    }) as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('tạo transport SMTP, có auth khi có MAIL_USER', () => {
    new MailService(configWith('user') as never);
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'secret' },
    });
  });

  it('không có MAIL_USER thì không gửi auth, cổng 465 dùng TLS', () => {
    new MailService(configWith('', 465) as never);
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true, auth: undefined }),
    );
  });

  it('sendPasswordReset gửi link và escape tên người dùng', async () => {
    const service = new MailService(configWith('user') as never);
    await service.sendPasswordReset(
      'a@b.com',
      '<b>An</b>',
      'http://localhost:4200/reset-password?token=abc',
    );
    const mail = sendMail.mock.calls[0][0] as Record<string, string>;
    expect(mail.from).toBe('Blog <no-reply@blog.local>');
    expect(mail.to).toBe('a@b.com');
    expect(mail.text).toContain('reset-password?token=abc');
    expect(mail.html).toContain('&lt;b&gt;An&lt;/b&gt;');
  });
});
