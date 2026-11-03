import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { CatalogService } from "./catalog/catalogService.js";
import { FakeStoreRepository } from "./catalog/fakeStoreRepository.js";
import { ConsoleEmailSender, EmailSender, SmtpEmailSender } from "./enquiry/emailSender.js";
import { EnquiryService } from "./enquiry/enquiryService.js";

// The one place where concrete implementations are chosen and wired together.
// Changing the product source or email provider happens here.
const config = loadConfig();

const repository = new FakeStoreRepository({
  baseUrl: config.FAKE_STORE_URL,
  cacheTtlMs: config.PRODUCT_CACHE_TTL_SECONDS * 1000,
});
const catalog = new CatalogService(repository, config.FEATURED_PRODUCT_IDS);

const emailSender: EmailSender =
  config.EMAIL_TRANSPORT === "smtp"
    ? new SmtpEmailSender(
        { host: config.SMTP_HOST, port: config.SMTP_PORT, user: config.SMTP_USER, pass: config.SMTP_PASS },
        config.MAIL_FROM,
      )
    : new ConsoleEmailSender();
const enquiries = new EnquiryService(catalog, emailSender, config.SALES_INBOX);

createApp({ catalog, enquiries }).listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT} (email: ${config.EMAIL_TRANSPORT})`);
});
