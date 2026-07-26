import type { Metadata } from "next";
import SignupForm from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false, follow: true },
};

export default function SignupPage() {
  return <SignupForm />;
}
