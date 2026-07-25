import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
