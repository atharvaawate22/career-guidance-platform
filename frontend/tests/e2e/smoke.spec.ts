import { expect, test } from "@playwright/test";

test("home page renders and navigation to predictor works", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "MHT-CET Career Hub" })
  ).toBeVisible();

  await page.getByRole("link", { name: "Predict College" }).click();

  await expect(page).toHaveURL(/\/predictor$/);
  await expect(
    page.getByRole("heading", { name: "College Predictor" })
  ).toBeVisible();
});

test("booking page loads core form fields", async ({ page }) => {
  await page.goto("/book");

  await expect(
    page.getByRole("heading", { name: "Book a Session" })
  ).toBeVisible();
  await expect(page.getByPlaceholder("Enter your full name")).toBeVisible();
  await expect(page.getByPlaceholder("your.email@gmail.com")).toBeVisible();
  await expect(page.getByPlaceholder("9876543210")).toBeVisible();
});
