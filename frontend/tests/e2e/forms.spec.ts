import { expect, test } from "@playwright/test";

test.describe("Predictor form", () => {
  test("displays Safe/Target/Dream sections after submitting with mocked API", async ({
    page,
  }) => {
    // Intercept the predict API call and return a mock response
    await page.route("**/api/predict", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            safe: [
              {
                id: "1",
                college_code: "C001",
                college_name: "Safe College",
                branch: "Computer Engineering",
                category: "OPEN",
                gender: null,
                college_status: null,
                stage: "I",
                cutoff_rank: 12000,
                cutoff_percentile: 93.5,
                year: 2025,
              },
            ],
            target: [
              {
                id: "2",
                college_code: "C002",
                college_name: "Target College",
                branch: "Information Technology",
                category: "OPEN",
                gender: null,
                college_status: null,
                stage: "I",
                cutoff_rank: 10000,
                cutoff_percentile: 94.2,
                year: 2025,
              },
            ],
            dream: [
              {
                id: "3",
                college_code: "C003",
                college_name: "Dream College",
                branch: "AI & Data Science",
                category: "OPEN",
                gender: null,
                college_status: null,
                stage: "I",
                cutoff_rank: 7000,
                cutoff_percentile: 96.5,
                year: 2025,
              },
            ],
            meta: {
              inputMode: "rank",
              effectiveRank: 10000,
            },
          },
        }),
      });
    });

    await page.goto("/predictor");

    await expect(
      page.getByRole("heading", { name: "College Predictor" })
    ).toBeVisible();

    // Fill the rank field
    const rankInput = page.getByPlaceholder(/enter your rank/i);
    await rankInput.fill("10000");

    // Submit the form
    await page.getByRole("button", { name: /predict/i }).click();

    // Verify Safe/Target/Dream sections appear
    await expect(page.getByText("Safe Colleges")).toBeVisible();
    await expect(page.getByText("Target Colleges")).toBeVisible();
    await expect(page.getByText("Dream Colleges")).toBeVisible();

    // Verify a college name from each section appears
    await expect(page.getByText("Safe College")).toBeVisible();
    await expect(page.getByText("Target College")).toBeVisible();
    await expect(page.getByText("Dream College")).toBeVisible();
  });
});

test.describe("Booking form", () => {
  test("shows success message after submitting with mocked API", async ({
    page,
  }) => {
    // Intercept the bookings API call
    await page.route("**/api/bookings", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Booking created successfully",
            data: {
              booking_id: "mock-booking-id",
              meet_link: "https://meet.google.com/mock-link",
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    // Intercept the slots API call
    await page.route("**/api/bookings/slots*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, booked: [] }),
      });
    });

    await page.goto("/book");

    await expect(
      page.getByRole("heading", { name: "Book a Session" })
    ).toBeVisible();

    // Fill required fields
    await page.getByPlaceholder("Enter your full name").fill("Test Student");
    await page.getByPlaceholder("your.email@gmail.com").fill("test@example.com");
    await page.getByPlaceholder("9876543210").fill("9876543210");
    await page.getByPlaceholder(/percentile/i).fill("95");

    // Select a date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill(dateStr);
    }

    // Submit the form
    await page.getByRole("button", { name: /book/i }).click();

    // Wait for and verify success message
    await expect(
      page.getByText(/consultation has been scheduled successfully/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
