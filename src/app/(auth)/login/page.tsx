import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return <LoginForm />;   
}
