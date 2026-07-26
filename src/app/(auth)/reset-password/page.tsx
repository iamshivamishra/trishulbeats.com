import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: true },
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
