import { test, expect, type Page } from "@playwright/test";

/**
 * The admin area checks the session against the backend, which isn't running
 * in e2e, so every admin API call is mocked here. The questions are made-up
 * samples, not real logged data.
 */
async function mockAdminApi(page: Page, requestedWindows: string[]) {
  await page.route("**/api/v1/admin/**", async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

    if (url.pathname.endsWith("/admin/session")) {
      return json({ success: true, data: { authenticated: true } });
    }
    if (url.pathname.endsWith("/admin/csrf")) {
      return json({ success: true, data: { csrfToken: "e2e-token" } });
    }
    if (url.pathname.endsWith("/admin/unanswered-queries")) {
      requestedWindows.push(url.searchParams.get("days") ?? "");
      return json({
        success: true,
        data: {
          window_days: Number(url.searchParams.get("days")),
          limit: 500,
          summary: { total: 14, unique_messages: 3, website: 12, whatsapp: 2 },
          groups: [
            { message: "sample spot round question", count: 7, channels: ["website"], first_seen: "2026-09-01T10:00:00Z", last_seen: "2026-11-20T10:00:00Z" },
            { message: "sample direct second year question", count: 5, channels: ["website", "whatsapp"], first_seen: "2026-09-05T10:00:00Z", last_seen: "2026-11-18T10:00:00Z" },
            { message: "sample medical college question", count: 2, channels: ["website"], first_seen: "2026-09-08T10:00:00Z", last_seen: "2026-10-02T10:00:00Z" },
          ],
        },
      });
    }
    return json({ success: true, data: [] });
  });
}

test("admin unanswered-questions page lists the backlog most-asked first", async ({ page }) => {
  const requestedWindows: string[] = [];
  await mockAdminApi(page, requestedWindows);

  await page.goto("/admin/unanswered");

  await expect(page.getByRole("heading", { name: "Unanswered Questions" })).toBeVisible();
  await expect(page.getByText("Distinct questions")).toBeVisible();

  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("sample spot round question");
  await expect(rows.first()).toContainText("7");

  await page.getByLabel("Search questions").fill("medical");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("sample medical college question");

  await page.getByRole("button", { name: "30 days" }).click();
  await expect.poll(() => requestedWindows.at(-1)).toBe("30");
  expect(requestedWindows[0]).toBe("90");

  await expect(page.getByRole("link", { name: "Unanswered" })).toBeVisible();
});
