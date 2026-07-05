import { test, expect } from "@playwright/test";

test.describe("Fluxos públicos e guarda de rotas", () => {
  test("landing carrega com a marca e o CTA de cadastro", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /criar minha conta/i }),
    ).toBeVisible();
  });

  test("login mostra o formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#senha")).toBeVisible();
    await expect(page.getByRole("button", { name: /^entrar$/i })).toBeVisible();
  });

  test("cadastro mostra os campos principais", async ({ page }) => {
    await page.goto("/cadastro");
    await expect(page.getByText(/criar minha conta/i).first()).toBeVisible();
    await expect(page.locator("#cpf")).toBeVisible();
    await expect(page.locator("#rg")).toBeVisible();
    await expect(page.locator("#chave_pix")).toBeVisible();
  });

  test("área do colaborador exige login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("painel admin exige login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
