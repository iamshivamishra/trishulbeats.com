import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema, updateProfileSchema } from "./auth";

describe("signupSchema", () => {
  const validInput = {
    name: "John Doe",
    email: "john@example.com",
    password: "securepass123",
    role: "buyer" as const,
  };

  it("accepts valid buyer signup", () => {
    const result = signupSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid producer signup", () => {
    const result = signupSchema.safeParse({ ...validInput, role: "producer" });
    expect(result.success).toBe(true);
  });

  it("lowercases email", () => {
    const result = signupSchema.parse({ ...validInput, email: "John@Example.COM" });
    expect(result.email).toBe("john@example.com");
  });

  it("trims name", () => {
    const result = signupSchema.parse({ ...validInput, name: "  John Doe  " });
    expect(result.name).toBe("John Doe");
  });

  it("rejects invalid email", () => {
    expect(signupSchema.safeParse({ ...validInput, email: "not-email" }).success).toBe(false);
  });

  it("rejects short name", () => {
    expect(signupSchema.safeParse({ ...validInput, name: "J" }).success).toBe(false);
  });

  it("rejects long name (>50)", () => {
    expect(signupSchema.safeParse({ ...validInput, name: "x".repeat(51) }).success).toBe(false);
  });

  it("rejects short password (<8)", () => {
    expect(signupSchema.safeParse({ ...validInput, password: "short" }).success).toBe(false);
  });

  it("rejects long password (>100)", () => {
    expect(signupSchema.safeParse({ ...validInput, password: "x".repeat(101) }).success).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(signupSchema.safeParse({ ...validInput, role: "admin" }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(signupSchema.safeParse({}).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "john@example.com", password: "pass123" });
    expect(result.success).toBe(true);
  });

  it("lowercases email", () => {
    const result = loginSchema.parse({ email: "JOHN@EXAMPLE.COM", password: "pass" });
    expect(result.email).toBe("john@example.com");
  });

  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "pass" }).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid name update", () => {
    expect(updateProfileSchema.safeParse({ name: "New Name" }).success).toBe(true);
  });

  it("accepts valid username", () => {
    expect(updateProfileSchema.safeParse({ username: "john_doe-123" }).success).toBe(true);
  });

  it("rejects username with uppercase", () => {
    expect(updateProfileSchema.safeParse({ username: "JohnDoe" }).success).toBe(false);
  });

  it("rejects username with spaces", () => {
    expect(updateProfileSchema.safeParse({ username: "john doe" }).success).toBe(false);
  });

  it("rejects username shorter than 3 chars", () => {
    expect(updateProfileSchema.safeParse({ username: "ab" }).success).toBe(false);
  });

  it("accepts valid social links", () => {
    const result = updateProfileSchema.safeParse({
      socialLinks: {
        instagram: "https://instagram.com/user",
        youtube: "https://youtube.com/user",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for social links", () => {
    const result = updateProfileSchema.safeParse({
      socialLinks: { instagram: "" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid social link URL", () => {
    const result = updateProfileSchema.safeParse({
      socialLinks: { instagram: "not-a-url" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 genres", () => {
    const result = updateProfileSchema.safeParse({
      genres: ["Hip Hop", "Trap", "R&B", "Pop", "Lo-Fi", "Drill"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts up to 5 valid genres", () => {
    const result = updateProfileSchema.safeParse({
      genres: ["Hip Hop", "Trap", "R&B"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects bio over 500 chars", () => {
    expect(updateProfileSchema.safeParse({ bio: "x".repeat(501) }).success).toBe(false);
  });
});
