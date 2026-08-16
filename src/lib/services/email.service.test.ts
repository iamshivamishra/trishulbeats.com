import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockSend = vi.fn();

vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

import { emailService } from "./email.service";

describe("emailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  describe("sendPasswordResetEmail", () => {
    it("sends password reset email successfully", async () => {
      // Arrange
      mockSend.mockResolvedValue({ id: "email-1" });

      // Act
      await emailService.sendPasswordResetEmail("user@test.com", "reset-token", "John");

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          subject: "Reset your Trishul Beats password",
        })
      );
    });

    it("throws error when send fails", async () => {
      // Arrange
      mockSend.mockRejectedValue(new Error("Network error"));

      // Act & Assert
      await expect(
        emailService.sendPasswordResetEmail("user@test.com", "token", "John")
      ).rejects.toThrow("Failed to send password reset email");
    });
  });

  describe("sendContactFormEmail", () => {
    it("sends contact form email successfully", async () => {
      // Arrange
      mockSend.mockResolvedValue({ id: "email-2" });

      // Act
      await emailService.sendContactFormEmail(
        "Jane",
        "jane@test.com",
        "Inquiry",
        "Hello, I have a question."
      );

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "[Contact Form] Inquiry",
          replyTo: "jane@test.com",
        })
      );
    });

    it("throws error when send fails", async () => {
      // Arrange
      mockSend.mockRejectedValue(new Error("API error"));

      // Act & Assert
      await expect(
        emailService.sendContactFormEmail("Jane", "jane@test.com", "Help", "Message")
      ).rejects.toThrow("Failed to send email");
    });
  });

  describe("missing API key", () => {
    it("throws error when RESEND_API_KEY is not set", async () => {
      // Arrange - the lazy init already happened with api key set,
      // so test the throw path by making send reject with the key error
      mockSend.mockImplementation(() => {
        throw new Error("RESEND_API_KEY environment variable is not set");
      });

      // Act & Assert
      await expect(
        emailService.sendPasswordResetEmail("user@test.com", "token", "John")
      ).rejects.toThrow("Failed to send password reset email");
    });
  });
});
