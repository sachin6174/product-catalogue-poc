import { z } from "zod";
import { CatalogService } from "../catalog/catalogService.js";
import { EmailSender } from "./emailSender.js";

export const enquirySchema = z.object({
  productId: z.string().trim().min(1),
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email address").max(254),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().max(1000).optional(),
});
export type Enquiry = z.infer<typeof enquirySchema>;

export class ProductNotFoundError extends Error {}

export class EnquiryService {
  constructor(
    private readonly catalog: CatalogService,
    private readonly emailSender: EmailSender,
    private readonly salesInbox: string,
  ) {}

  async submit(enquiry: Enquiry): Promise<void> {
    // Look the product up ourselves rather than trusting a title sent by the client.
    const product = await this.catalog.getProduct(enquiry.productId);
    if (!product) throw new ProductNotFoundError();

    // Plain text only, so customer input can't inject HTML into the sales inbox.
    const text = [
      `New enquiry for: ${product.title} (id ${product.id}, $${product.price.toFixed(2)})`,
      "",
      `Name:    ${enquiry.name}`,
      `Email:   ${enquiry.email}`,
      `Phone:   ${enquiry.phone || "-"}`,
      "",
      "Message:",
      enquiry.message || "-",
    ].join("\n");

    await this.emailSender.send({
      to: this.salesInbox,
      replyTo: enquiry.email, // sales can just hit "reply"
      subject: `New enquiry: ${product.title}`,
      text,
    });
  }
}
