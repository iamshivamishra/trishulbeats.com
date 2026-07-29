"use client";

import { useState } from "react";
import { Mail, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

export default function ContactClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to send message");
        return;
      }

      setSent(true);
      toast.success("Message sent successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell max-w-5xl">
      {/* Hero */}
      <div className="page-header relative overflow-hidden text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <Reveal>
          <span className="inline-block rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Get in Touch
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Contact Us</h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Have questions or feedback? We&apos;d love to hear from you.
          </p>
        </Reveal>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <Reveal delay={100}>
          <Card className="border-border/60 bg-card/80 shadow-sm transition-shadow duration-300 hover:shadow-md">
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
              <CardDescription>Fill out the form and we&apos;ll get back to you soon.</CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div
                  className="flex animate-in fade-in zoom-in-95 flex-col items-center py-8 text-center duration-500"
                  role="status"
                  aria-live="polite"
                >
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-9 w-9 text-green-500" />
                  </span>
                  <h3 className="text-lg font-semibold">Message sent!</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Thanks for reaching out. We&apos;ll get back to you soon.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 transition-transform duration-200 hover:-translate-y-0.5"
                    onClick={() => {
                      setSent(false);
                      setName("");
                      setEmail("");
                      setSubject("");
                      setMessage("");
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Name</Label>
                      <Input
                        id="contact-name"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-subject">Subject</Label>
                    <Input
                      id="contact-subject"
                      placeholder="What's this about?"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      minLength={2}
                      className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea
                      id="contact-message"
                      placeholder="Your message..."
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      minLength={10}
                      className="resize-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 sm:w-auto"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={180}>
            <Card className="group border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-5">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">Email</h3>
                <p className="mt-1 text-sm text-muted-foreground">contact@trishulbeats.com</p>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={260}>
            <Card className="group border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-5">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">Location</h3>
                <p className="mt-1 text-sm text-muted-foreground">India</p>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}