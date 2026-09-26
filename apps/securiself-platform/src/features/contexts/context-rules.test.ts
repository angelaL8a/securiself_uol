import { describe, expect, it } from "vitest";
import { buildProfilePayload, getNotSharedLabels } from "./context-rules";

const fullContext = {
  internalName: "internal",
  displayName: "Ada L.",
  username: "ada",
  pronouns: "she/her",
  avatarUrl: "https://cdn.example.com/a.png",
  jobTitle: "Engineer",
  company: "Acme",
  shortBio: "Bio",
  documentId: "DOC-1",
};

const vault = { legalFirstName: "Ada", legalLastName: "Lovelace" };

describe("buildProfilePayload privacy rules", () => {
  it("SOCIAL hides legal and root fields", () => {
    const payload = buildProfilePayload("SOCIAL", fullContext, vault);
    expect(payload).toEqual({
      display_name: "Ada L.",
      username: "ada",
      pronouns: "she/her",
      avatar_url: "https://cdn.example.com/a.png",
    });
    expect(payload).not.toHaveProperty("legal_first_name");
    expect(payload).not.toHaveProperty("document_id");
  });

  it("PROFESSIONAL hides documentId, email and gender but shares work fields", () => {
    const payload = buildProfilePayload("PROFESSIONAL", fullContext, vault);
    expect(payload).toMatchObject({
      display_name: "Ada L.",
      job_title: "Engineer",
      company: "Acme",
      short_bio: "Bio",
    });
    expect(payload).not.toHaveProperty("document_id");
    expect(payload).not.toHaveProperty("legal_first_name");
    expect(payload).not.toHaveProperty("gender");
  });

  it("LEGAL exposes legal identity from the vault", () => {
    const payload = buildProfilePayload("LEGAL", fullContext, vault);
    expect(payload).toEqual({
      legal_first_name: "Ada",
      legal_last_name: "Lovelace",
      document_id: "DOC-1",
      avatar_url: "https://cdn.example.com/a.png",
    });
  });

  it("PRIVATE stays conservative", () => {
    const payload = buildProfilePayload("PRIVATE", fullContext, vault);
    expect(payload).toEqual({
      display_name: "Ada L.",
      pronouns: "she/her",
      avatar_url: "https://cdn.example.com/a.png",
    });
    expect(payload).not.toHaveProperty("username");
    expect(payload).not.toHaveProperty("legal_first_name");
  });

  it("defaults pronouns to 'hidden' when unset", () => {
    const payload = buildProfilePayload(
      "SOCIAL",
      { ...fullContext, pronouns: null },
      vault,
    );
    expect(payload.pronouns).toBe("hidden");
  });
});

describe("getNotSharedLabels (consent, Cohort A A4)", () => {
  it("lists the blocked labels for each category plus other Contexts", () => {
    expect(getNotSharedLabels("SOCIAL")).toEqual([
      "Legal name",
      "Document ID",
      "Account email",
      "Gender",
      "Your other Contexts",
    ]);
    expect(getNotSharedLabels("PROFESSIONAL")).toEqual([
      "Document ID",
      "Account email",
      "Gender",
      "Legal name",
      "Your other Contexts",
    ]);
    expect(getNotSharedLabels("LEGAL")).toEqual([
      "Account email",
      "Gender",
      "Your other Contexts",
    ]);
    expect(getNotSharedLabels("PRIVATE")).toEqual([
      "Account email",
      "Legal name",
      "Document ID",
      "Gender",
      "Your other Contexts",
    ]);
  });

  it("never lists a field the category's payload discloses", () => {
    const disclosed = (category: Parameters<typeof getNotSharedLabels>[0]) =>
      Object.keys(buildProfilePayload(category, fullContext, vault));
    for (const category of ["SOCIAL", "PROFESSIONAL", "PRIVATE"] as const) {
      expect(disclosed(category)).not.toContain("legal_first_name");
      expect(disclosed(category)).not.toContain("document_id");
    }
    expect(disclosed("LEGAL")).toContain("legal_first_name");
    expect(disclosed("LEGAL")).toContain("document_id");
    expect(getNotSharedLabels("LEGAL")).not.toContain("Legal name");
    expect(getNotSharedLabels("LEGAL")).not.toContain("Document ID");
  });
});
