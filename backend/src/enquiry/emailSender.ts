import nodemailer from "nodemailer";

export interface EmailMessage {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

// The boundary to the email provider. Swapping to SES, SendGrid, etc. means
// writing one new class - nothing else in the app changes.
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

// Any SMTP server. Locally that's Mailpit (see docker-compose.yml); most real
// providers, including Amazon SES, also accept SMTP.
export class SmtpEmailSender implements EmailSender {
  private readonly transporter;

  constructor(
    options: { host: string; port: number; user?: string; pass?: string },
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.port === 465,
      auth: options.user ? { user: options.user, pass: options.pass } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}

// For running the backend without any mail server: prints the email instead.
export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[email] to=${message.to} subject="${message.subject}"\n${message.text}`);
  }
}
