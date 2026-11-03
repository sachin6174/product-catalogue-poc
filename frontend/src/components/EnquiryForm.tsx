import { FormEvent, useState } from "react";
import { ApiError, api } from "../api";

type Status = "idle" | "sending" | "sent";

// Browser `required`/`type="email"` give quick feedback, but the backend is the
// source of truth for validation - its field errors are shown next to each input.
export function EnquiryForm({ productId }: { productId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();

    setStatus("sending");
    setError(undefined);
    setFieldErrors({});
    try {
      await api.submitEnquiry({
        productId,
        name: value("name"),
        email: value("email"),
        phone: value("phone") || undefined,
        message: value("message") || undefined,
      });
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      if (err instanceof ApiError) setFieldErrors(err.fields);
    }
  }

  if (status === "sent") {
    return (
      <p role="status" className="thank-you">
        Thank you for your enquiry! Our sales team will be in touch soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="enquiry-form">
      <h2>Enquire about this product</h2>
      <Field label="Name" name="name" required maxLength={100} autoComplete="name" errors={fieldErrors.name} />
      <Field label="Email" name="email" type="email" required maxLength={254} autoComplete="email" errors={fieldErrors.email} />
      <Field label="Phone (optional)" name="phone" type="tel" maxLength={30} autoComplete="tel" errors={fieldErrors.phone} />
      <Field label="Message (optional)" name="message" multiline maxLength={1000} errors={fieldErrors.message} />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength: number;
  autoComplete?: string;
  errors?: string[];
}

// The error sits outside the <label> and is linked with aria-describedby, so
// screen readers announce it without it becoming part of the field's name.
function Field({ label, name, type = "text", multiline, errors, ...inputProps }: FieldProps) {
  const id = `enquiry-${name}`;
  const errorId = `${id}-error`;
  const a11y = {
    id,
    name,
    "aria-invalid": errors ? true : undefined,
    "aria-describedby": errors ? errorId : undefined,
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea rows={4} {...a11y} {...inputProps} /> : <input type={type} {...a11y} {...inputProps} />}
      {errors && (
        <span id={errorId} className="error">
          {errors.join(", ")}
        </span>
      )}
    </div>
  );
}
