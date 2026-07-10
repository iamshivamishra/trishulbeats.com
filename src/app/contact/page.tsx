import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Trishul Beats team.",
};

export default function ContactPage() {
  return (
    <div className="page-shell max-w-5xl">
      <div className="page-header text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">Contact Us</h1>
        <p className="mt-3 text-muted-foreground">
          Have questions or feedback? We'd love to hear from you.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>Fill out the form and we'll get back to you soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input id="contact-name" placeholder="Your name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input id="contact-email" type="email" placeholder="you@example.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input id="contact-subject" placeholder="What's this about?" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-message">Message</Label>
                <Textarea
                  id="contact-message"
                  placeholder="Your message..."
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">Send Message</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-5">
              <Mail className="mb-2 h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Email</h3>
              <p className="mt-1 text-sm text-muted-foreground">contact@beat.com</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-5">
              <MapPin className="mb-2 h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Location</h3>
              <p className="mt-1 text-sm text-muted-foreground">India</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
