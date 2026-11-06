import { expect, test } from "@playwright/test";
import fs from "node:fs";

test("requirement -> AI test pack -> edit -> traceability -> exports", async ({ page }) => {
  await page.goto("/#/analyzer");

  // Requirement submission
  await page.getByRole("button", { name: "Load sample" }).click();
  await page.getByRole("button", { name: "Analyze Requirement" }).click();
  await expect(page.getByRole("region", { name: "Requirement analysis" })).toContainText("BR-001");
  await page.getByRole("button", { name: /Generate AI Test Pack/ }).click();

  // AI generation workflow + navigation
  await expect(page).toHaveURL(/#\/testpack/);
  await expect(page.getByTestId("row-TC-FUN-001")).toBeVisible();
  for (const tab of ["Positive", "Negative", "Boundary", "Role & Permission", "Integration", "Data Combination", "Regression"]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${tab}`) })).toBeVisible();
  }

  // Search and filter
  await page.getByLabel("Search test cases").fill("negative scenario 1");
  await expect(page.getByTestId("row-TC-NEG-001")).toBeVisible();
  await expect(page.getByTestId("row-TC-POS-001")).toHaveCount(0);
  await page.getByLabel("Search test cases").fill("");
  await page.getByRole("button", { name: /^Negative/ }).click();
  await expect(page.getByTestId("row-TC-POS-001")).toHaveCount(0);

  // Editing
  await page.getByLabel("Edit TC-NEG-001").click();
  await page.getByLabel("Scenario").fill("Edited negative scenario");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Edited negative scenario")).toBeVisible();
  await expect(page.getByTestId("row-TC-NEG-001")).toContainText("EDITED");

  // Traceability
  await page.getByRole("button", { name: "Traceability Matrix" }).click();
  await expect(page.getByText("Not covered")).toBeVisible();
  await expect(page.getByText("BR-002").first()).toBeVisible();

  // Execution then validated coverage
  await page.getByRole("button", { name: "Test Execution" }).click();
  await page.getByLabel("Status TC-NEG-001").selectOption("Pass");
  await expect(page.getByLabel("Status TC-NEG-001")).toHaveValue("Pass");

  // Exports
  await page.getByRole("button", { name: "Reports & Export" }).click();
  for (const [fmt, ext] of [["XLSX", "xlsx"], ["CSV", "csv"]]) {
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: `Export ${fmt}` }).click()]);
    expect(dl.suggestedFilename()).toMatch(new RegExp(`\.${ext}$`));
    const path = await dl.path();
    expect(fs.statSync(path).size).toBeGreaterThan(200);
    if (ext === "xlsx") expect(fs.readFileSync(path).subarray(0, 2).toString()).toBe("PK");
  }
});
