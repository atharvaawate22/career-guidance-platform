import { expect, test } from "@playwright/test";

test("home page renders and navigation to predictor works", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Navigate Your Engineering Future" })
  ).toBeVisible();

  await page.getByRole("link", { name: "Predictor", exact: true }).click();

  await expect(page).toHaveURL(/\/predictor$/);
  await expect(
    page.getByRole("heading", { name: "College Predictor", exact: true })
  ).toBeVisible();
});

// Booking is behind the BOOKINGS_ENABLED flag (frontend/src/lib/features.ts),
// which is currently off — /book shows a "paused" notice instead of the form.
// Checking whichever state is actually live keeps this passing across flips
// of that flag instead of hard-coding the on-state it never runs against.
test("booking page reflects current booking availability", async ({
  page,
}) => {
  await page.goto("/book");

  const paused = page.getByRole("heading", {
    name: "Booking sessions are temporarily paused",
  });

  if (await paused.isVisible().catch(() => false)) {
    await expect(
      page.getByRole("link", { name: "Try the Predictor" })
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("heading", { name: "Book a Session" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("Enter your full name")).toBeVisible();
    await expect(page.getByPlaceholder("your.email@gmail.com")).toBeVisible();
    await expect(page.getByPlaceholder("9876543210")).toBeVisible();
  }
});
