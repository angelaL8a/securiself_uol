import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NAV_ITEMS } from "@/components/layout/console-sidebar";
import { CONTEXT_CATEGORIES } from "@/features/contexts/context-rules";
import { routes } from "@/lib/routes";
import {
  AUTHORIZATION_FLOW,
  CODE_TO_TOKEN_TRANSITION,
  CREDENTIAL_LIFECYCLE,
  DOCS_AREAS,
  docsAreaHref,
  findDocsArea,
  REVOCATION_RECOVERY,
} from "../developer-docs";
import { DocsAreaView } from "./developer-docs";
import { DOCS_AREA_CONTENT } from "./docs-areas";
import { DocsTabs } from "./docs-tabs";

const pathname = vi.hoisted(() => ({ current: "/console/docs" as string }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

/** Renders every area, as the tabbed routes do across a full read-through. */
function renderAllAreas() {
  return render(
    <>
      {DOCS_AREAS.map((area) => (
        <DocsAreaView key={area.slug || "overview"} area={area} />
      ))}
    </>,
  );
}

describe("Developer Docs", () => {
  it("links the console sidebar to the docs route", () => {
    const item = NAV_ITEMS.find((entry) => entry.label === "Developer Docs");
    expect(item?.href).toBe(routes.console.docs);
    expect(routes.console.docs).toBe("/console/docs");
  });

  // The areas are route-backed: a slug with no content component would render
  // an empty page in production, which no type check catches.
  it("resolves content for every documentation area", () => {
    for (const area of DOCS_AREAS) {
      expect(DOCS_AREA_CONTENT[area.slug]).toBeTypeOf("function");
    }
    expect(Object.keys(DOCS_AREA_CONTENT)).toHaveLength(DOCS_AREAS.length);
    expect(docsAreaHref("")).toBe(routes.console.docs);
    expect(docsAreaHref("setup")).toBe("/console/docs/setup");
  });

  it("renders only its own sections in each area, each with a matching anchor", () => {
    for (const area of DOCS_AREAS) {
      const { container, unmount } = render(
        <DocsAreaView area={area} />,
      );

      const headings = screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent);
      expect(headings).toEqual(area.sections.map((section) => section.title));

      for (const section of area.sections) {
        expect(container.querySelector(`#${section.id}`)).not.toBeNull();
      }
      unmount();
    }
  });

  it("points the sticky section navigation at sections present in the same area", () => {
    for (const area of DOCS_AREAS.filter((entry) => entry.sections.length > 1)) {
      const { container, unmount } = render(
        <DocsAreaView area={area} />,
      );

      const nav = screen.getByRole("navigation", {
        name: "Documentation sections",
      });
      for (const section of area.sections) {
        expect(
          within(nav).getByRole("link", { name: new RegExp(section.title, "i") }),
        ).toHaveAttribute("href", `#${section.id}`);
        expect(container.querySelector(`#${section.id}`)).not.toBeNull();
      }
      unmount();
    }
  });

  it("marks the current area in the sticky area navigation", () => {
    pathname.current = "/console/docs/token-exchange";
    render(<DocsTabs />);

    const nav = screen.getByRole("navigation", { name: "Documentation areas" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(DOCS_AREAS.length);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      DOCS_AREAS.map((area) => docsAreaHref(area.slug)),
    );

    const current = links.filter(
      (link) => link.getAttribute("aria-current") === "page",
    );
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Token Exchange");
    pathname.current = routes.console.docs;
  });

  // Change 3 of the post-evaluation refinement: the lifecycle reference must
  // keep distinguishing all five values participants conflated.
  it("distinguishes every credential and authorization artifact", () => {
    render(<DocsAreaView area={DOCS_AREAS[0]} />);

    const table = screen.getByRole("table", {
      name: /credential and authorization artifact/i,
    });
    for (const value of [
      "SecuriSelf session credential",
      "client_id",
      "client_secret",
      "Authorization code",
      "access_token",
    ]) {
      expect(within(table).getByText(value)).toBeInTheDocument();
    }

    // The two values that must never reach browser-executed code say so in
    // words, not only through an icon.
    for (const row of CREDENTIAL_LIFECYCLE.filter((entry) => entry.serverOnly)) {
      expect(row.exposure).toMatch(/^Never\./);
    }
    expect(CREDENTIAL_LIFECYCLE.filter((entry) => entry.serverOnly)).toHaveLength(
      2,
    );
  });

  // Change 4: the causal chain has to stay ordered and complete, because the
  // component renders it as a bare list with no other ordering signal.
  it("states the authorization-code to access-token sequence in order", () => {
    render(<DocsAreaView area={DOCS_AREAS[0]} />);

    const text = document.body.textContent ?? "";
    const order = [
      "selects one Context and approves",
      "single-use authorization code",
      "returns to your registered callback",
      "receives the code",
      "client_secret",
      "validates the exchange",
      "Context-bound access token is returned",
      "Your server calls GET /api/v1/profiles/me",
      "Context-filtered profile is returned",
    ].map((marker) => text.indexOf(marker));

    expect(order).not.toContain(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(AUTHORIZATION_FLOW).toHaveLength(9);
    expect(text).toContain(
      "Sending the code to the profile endpoint returns",
    );
  });

  it("covers every critical integration stage across the areas", () => {
    renderAllAreas();

    const body = document.body.textContent ?? "";
    for (const marker of [
      "client_secret",
      "/oauth/authorize",
      "response_type",
      "identity_context",
      "?code=",
      "POST",
      "/oauth/token",
      "grant_type",
      "authorization_code",
      "/api/v1/profiles/me",
      "Authorization: Bearer <ACCESS_TOKEN>",
      "Accept-Language",
      "Access token has been revoked",
      "Authorization code has already been used",
    ]) {
      expect(body).toContain(marker);
    }
  });

  it("represents all four context categories in the payload and locale references", () => {
    render(<DocsAreaView area={DOCS_AREAS[5]} />);

    for (const label of ["Professional", "Legal", "Social", "Private"]) {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    }

    // The localization table is keyed off Record<ContextCategory, string[]>,
    // so every category must appear as a row.
    const body = document.body.textContent ?? "";
    for (const category of CONTEXT_CATEGORIES) {
      expect(body).toContain(category.value);
    }
    expect(body).toContain("Supported locales are en and es");
  });

  it("uses placeholders instead of real credentials", () => {
    renderAllAreas();

    const body = document.body.textContent ?? "";
    expect(body).toContain("scs_client_example");
    expect(body).toContain("<SECURISELF_CLIENT_SECRET>");
    // A generated secret would start with the real prefix.
    expect(body).not.toContain("scs_secret_scs");
  });

  it("gives each copy button a distinct accessible name within an area", () => {
    for (const area of DOCS_AREAS) {
      const { unmount } = render(<DocsAreaView area={area} />);

      const names = screen
        .queryAllByRole("button", { name: /^Copy / })
        .map((button) => button.getAttribute("aria-label") ?? button.textContent);

      expect(new Set(names).size).toBe(names.length);
      unmount();
    }
  });
});

/** Renders one area by slug and returns its `main`-equivalent container. */
function renderArea(slug: string) {
  const area = findDocsArea(slug);
  if (!area) throw new Error(`No docs area "${slug}"`);
  return render(<DocsAreaView area={area} />).container;
}

/** Text of each `<li>` of the first ordered list inside `root`. */
function listItems(root: Element) {
  const list = root.querySelector("ol");
  expect(list).not.toBeNull();
  return Array.from(list!.querySelectorAll(":scope > li")).map(
    (item) => item.textContent ?? "",
  );
}

function expectInOrder(text: string, markers: string[]) {
  const positions = markers.map((marker) => text.indexOf(marker));
  expect(positions).not.toContain(-1);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
}

// Cohort B refinement B1 (docs/external-evaluation/B): the boundary between
// the callback's authorization code and the access token.
describe("Developer Docs — B1 authorization code to access token", () => {
  it("sends the Authorization callback onward to Token Exchange", () => {
    const callback = renderArea("authorization").querySelector("#callback")!;

    expect(
      within(callback as HTMLElement).getByRole("link", { name: "Token Exchange" }),
    ).toHaveAttribute("href", "/console/docs/token-exchange");
    const text = callback.textContent ?? "";
    const statement = "The authorization code is not a Profile API credential.";
    expect(text).toContain(statement);
    expectInOrder(text.slice(text.indexOf(statement)), [
      "POST /oauth/token",
      "client_secret",
      "access token",
      "GET /api/v1/profiles/me",
    ]);
  });

  it("opens Token Exchange with the code-to-token transition, grouped by channel", () => {
    const section = renderArea("token-exchange").querySelector("#code-to-token")!;
    const scope = within(section as HTMLElement);
    const text = section.textContent ?? "";

    expect(text).toContain("You are here");
    expect(scope.getByRole("link", { name: "callback" })).toHaveAttribute(
      "href",
      "/console/docs/authorization#callback",
    );
    expect(text).toContain(
      "Exchange it server-side for an access token before calling the Profile API.",
    );
    expect(text).toContain("sending the code there returns 401 Invalid access token");

    const items = listItems(section);
    expect(items).toHaveLength(CODE_TO_TOKEN_TRANSITION.length);
    expectInOrder(items.join("\n"), [
      "/oauth/authorize",
      "?code=",
      "application backend",
      "POST /oauth/token",
      "Access token returned",
      "GET /api/v1/profiles/me",
    ]);
    // Each channel label is rendered once, at the start of its run of steps.
    expectInOrder(text, [
      "Browser · front channel",
      "Your server · server-side",
      "Your server · protected API request",
    ]);
    expect(text.split("Your server · server-side")).toHaveLength(2);

    expect(scope.getByRole("link", { name: "Profile API" })).toHaveAttribute(
      "href",
      "/console/docs/profile-api",
    );
    expect(scope.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "href",
      "/console/docs#flow",
    );
  });

  it("keeps the client_secret and the access token on the server side", () => {
    for (const step of CODE_TO_TOKEN_TRANSITION) {
      const text = `${step.title} ${step.detail}`;
      if (step.actor === "browser") {
        expect(text).not.toContain("client_secret");
        expect(step.artifact).not.toBe("access_token");
      }
      if (text.includes("client_secret")) {
        expect(step.actor).toBe("server");
        expect(step.phase).toMatch(/server-side/);
      }
    }
    const apiRequest = CODE_TO_TOKEN_TRANSITION.at(-1)!;
    expect(apiRequest.phase).toMatch(/protected API request/);
    expect(apiRequest.detail).toContain("Bearer <ACCESS_TOKEN>");
    expect(apiRequest.detail).not.toContain("<AUTHORIZATION_CODE>");

    expect(
      CREDENTIAL_LIFECYCLE.find((row) => row.value === "client_secret")?.serverOnly,
    ).toBe(true);
  });

  it("authenticates Profile API requests with the access token, not the code", () => {
    const main = renderArea("profile-api");
    const text = main.textContent ?? "";

    expect(text).toContain("Authorization: Bearer <ACCESS_TOKEN>");
    expect(text).not.toContain("<AUTHORIZATION_CODE>");
    expect(text).toContain("not the authorization code from the callback");
    expect(
      within(main).getByRole("link", { name: "token exchange" }),
    ).toHaveAttribute("href", "/console/docs/token-exchange");
  });

  it("keeps the full nine-step sequence on the Overview only", () => {
    const overview = renderArea("");
    expect(listItems(overview.querySelector("#flow")!)).toHaveLength(9);
  });
});

// Cohort B refinement B2: the path from a rejected profile read back to access.
describe("Developer Docs — B2 revocation recovery path", () => {
  const RECOVERY = "/console/docs/errors#recovery";

  it("explains revoked access on Errors and links to its cause and its restart", () => {
    const main = renderArea("errors");
    const recovery = main.querySelector("#recovery")!;
    expect(
      within(recovery as HTMLElement).getByRole("heading", {
        level: 3,
        name: "Recovering from revoked or expired access",
      }),
    ).toBeInTheDocument();

    // Exact names: the sequence navigation also links "Previous: Grants & Revocation".
    expect(
      within(main).getByRole("link", { name: "Grants & Revocation" }),
    ).toHaveAttribute("href", "/console/docs/grants");
    expect(
      within(main).getByRole("link", { name: "authorization request" }),
    ).toHaveAttribute("href", "/console/docs/authorization");

    const items = listItems(recovery);
    expect(items).toHaveLength(REVOCATION_RECOVERY.length);
    expectInOrder(items.join("\n"), [
      "revokes the Grant",
      "401 Access token has been revoked",
      "no refresh token",
      "authorizes your application again",
      "new authorization code",
      "new access token",
      "Profile reads resume",
    ]);
  });

  it("states on Grants & Revocation that a new user authorization is required", () => {
    const main = renderArea("grants");
    const text = main.textContent ?? "";

    expect(text).toContain("401 Access token has been revoked");
    expect(text).toContain("Re-authorization is required; nothing else restores access.");
    expect(text).toContain("must approve your application again");
    expect(
      within(main).getByRole("link", { name: "recovery sequence in the Error reference" }),
    ).toHaveAttribute("href", RECOVERY);
    expect(
      within(main).getByRole("link", { name: "authorization request" }),
    ).toHaveAttribute("href", "/console/docs/authorization");
  });

  it("points a rejected profile read at the recovery sequence", () => {
    const main = renderArea("profile-api");
    expect(
      within(main).getByRole("link", {
        name: "recovering from revoked or expired access",
      }),
    ).toHaveAttribute("href", RECOVERY);
  });

  it("only restores access through values issued by a new approval", () => {
    const again = REVOCATION_RECOVERY.findIndex((step) =>
      step.title.includes("authorizes your application again"),
    );
    expect(again).toBeGreaterThan(0);
    for (const step of REVOCATION_RECOVERY.slice(again + 1)) {
      expect(step.artifact).toMatch(/^new /);
    }
  });

  it("never presents refreshing, retrying or reusing old access as recovery", () => {
    const text = ["profile-api", "grants", "errors"]
      .map((slug) => {
        const { textContent } = renderArea(slug);
        return textContent ?? "";
      })
      .join("\n");

    const mentions = text
      .split(/[.;\n]/)
      .filter((sentence) => /\b(refresh(ed)?|retry|retrying|reuse[d]?)\b/i.test(sentence));
    expect(mentions.length).toBeGreaterThan(0);
    for (const sentence of mentions) {
      expect(sentence).toMatch(/\b(no|not|never|cannot|nothing)\b/i);
    }
  });

  // The docs quote the API's messages verbatim; pin them to the source so a
  // backend wording change fails here instead of leaving the docs stale.
  it("quotes the rejection messages the API backend actually returns", () => {
    const backend = (file: string) =>
      readFileSync(resolve(__dirname, "../../../../../api-backend/src", file), "utf8");
    const bearer = backend("middleware/requireBearerToken.ts");
    const oauth = backend("modules/oauth/oauth.service.ts");
    const grants = backend("modules/grants/grants.service.ts");

    for (const message of [
      "Invalid access token",
      "Access token has been revoked",
      "Access token has expired",
    ]) {
      expect(bearer).toContain(`"${message}"`);
    }
    expect(oauth).toContain('"Authorization code has already been used"');
    // Revocation revokes the Grant's tokens in the same transaction.
    expect(grants).toMatch(/tx\.accessToken\.updateMany/);
  });
});
