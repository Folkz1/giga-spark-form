/**
 * E2E Tests — DataCrazy Config (Configurações)
 *
 * Testa o fluxo completo ponta a ponta:
 * 1. Login no app
 * 2. Navegar para /configuracoes
 * 3. Configurar conexão com API real (produção)
 * 4. CRUD de clientes (criar, editar, excluir)
 * 5. Configurar pixels Meta e Google
 * 6. Configurar mapeamentos de estágios e campos
 * 7. Validar persistência (reload)
 * 8. Validar integração real com a API DataCrazy
 */
import { test, expect, type Page } from "@playwright/test";

const API_URL = "https://datacrazy-api.jz9bd8.easypanel.host";
const MASTER_KEY = "dc-master-alan-2026";
const TEST_CLIENT_NAME = `E2E-Test-${Date.now()}`;

// Helper: login
async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#usuario", "giga");
  await page.fill("#senha", "giga2024");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/", { timeout: 10_000 });
}

// Helper: navigate to config
async function goToConfig(page: Page) {
  await page.goto("/configuracoes");
  await page.waitForLoadState("networkidle");
}

// Helper: fill connection
async function fillConnection(page: Page) {
  await page.fill('input[placeholder*="https://datacrazy"]', API_URL);
  await page.fill('input[placeholder*="dc-master"]', MASTER_KEY);
  await page.click('button:has-text("Testar")');
  await expect(page.locator("text=Conectado")).toBeVisible({ timeout: 15_000 });
}

// ═══════════════════════════════════════════════
// Test 1: API Health — Backend is alive
// ═══════════════════════════════════════════════
test.describe("API Backend", () => {
  test("health check responds OK", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.google_ga4).toBe(true);
  });

  test("clients endpoint requires auth", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/clients`);
    expect(res.status()).toBe(422); // missing header
  });

  test("clients endpoint works with master key", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/clients`, {
      headers: { "X-API-Key": MASTER_KEY },
    });
    expect(res.ok()).toBeTruthy();
    const clients = await res.json();
    expect(Array.isArray(clients)).toBeTruthy();
  });

  test("config endpoint rejects master key", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/config`, {
      headers: { "X-API-Key": MASTER_KEY },
    });
    expect(res.status()).toBe(400);
  });
});

// ═══════════════════════════════════════════════
// Test 2: Login + Navigation
// ═══════════════════════════════════════════════
test.describe("Login & Navigation", () => {
  test("login and see dashboard", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: /Giga.*Aceleradora/ })).toBeVisible();
  });

  test("dashboard has Tracking API card", async ({ page }) => {
    await login(page);
    await expect(page.locator("text=Tracking API")).toBeVisible();
    await expect(page.locator("text=Configurações")).toBeVisible();
  });

  test("navigate to /configuracoes", async ({ page }) => {
    await login(page);
    await page.click("text=Configurações");
    await expect(page).toHaveURL("/configuracoes");
    await expect(page.locator("text=Conexão com a API DataCrazy")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════
// Test 3: Connection Panel
// ═══════════════════════════════════════════════
test.describe("Connection Panel", () => {
  test("test connection with valid credentials", async ({ page }) => {
    await login(page);
    await goToConfig(page);
    await fillConnection(page);
    // Should show client list section
    await expect(page.getByRole("heading", { name: /Clientes/ })).toBeVisible();
  });

  test("test connection with invalid key fails", async ({ page }) => {
    await login(page);
    await goToConfig(page);
    await page.fill('input[placeholder*="https://datacrazy"]', API_URL);
    await page.fill('input[placeholder*="dc-master"]', "wrong-key");
    await page.click('button:has-text("Testar")');
    // Should show error toast (Sonner toast)
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════
// Test 4: CRUD Clientes — Full Lifecycle
// ═══════════════════════════════════════════════
test.describe.serial("Client CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToConfig(page);
    await fillConnection(page);
  });

  test("create a new client", async ({ page }) => {
    await page.click('button:has-text("Novo Cliente")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Tab Geral
    await page.fill('input[placeholder*="São Paulo"]', TEST_CLIENT_NAME);
    await page.fill('input[placeholder*="dc_eyJ"]', "dc_test_token_e2e");

    // Save
    await page.click('button:has-text("Criar Cliente")');
    await expect(page.locator(`text=${TEST_CLIENT_NAME}`)).toBeVisible({ timeout: 10_000 });
  });

  test("edit client — add Meta pixel", async ({ page }) => {
    // Find and click edit on our test client
    const clientCard = page.locator(`text=${TEST_CLIENT_NAME}`).first();
    await expect(clientCard).toBeVisible({ timeout: 10_000 });

    // Click edit button - find the card containing our client name, then the pencil button
    const card = page.locator(`[class*="card"]`).filter({ hasText: TEST_CLIENT_NAME });
    await card.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Go to Pixels tab
    await page.getByRole("tab", { name: "Pixels" }).click();
    await expect(page.locator("text=Pixels Meta (CAPI)")).toBeVisible();

    // Add Meta pixel - click Adicionar next to "Pixels Meta (CAPI)"
    const metaSection = page.locator("text=Pixels Meta (CAPI)").locator("..").locator("..");
    await metaSection.locator('button:has-text("Adicionar")').click();

    // Fill pixel data
    await page.fill('input[placeholder*="Pixel ID"]', "999888777666");
    await page.fill('input[placeholder*="Access Token"]', "EAAKtest_access_token_e2e");

    // Save
    await page.click('button:has-text("Salvar")');
    await expect(page.locator("text=Cliente atualizado")).toBeVisible({ timeout: 10_000 });

    // Wait for dialog to close and verify badge
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });
    const clientRow = page.locator(`[class*="card"]`).filter({ hasText: TEST_CLIENT_NAME });
    await expect(clientRow.locator("text=Meta: 1")).toBeVisible({ timeout: 5_000 });
  });

  test("edit client — add Google GA4 pixel", async ({ page }) => {
    const clientCard = page.locator(`text=${TEST_CLIENT_NAME}`).first();
    await expect(clientCard).toBeVisible({ timeout: 10_000 });
    const card = page.locator(`[class*="card"]`).filter({ hasText: TEST_CLIENT_NAME });
    await card.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).click();

    // Go to Pixels tab
    await page.getByRole("tab", { name: "Pixels" }).click();

    // Add Google pixel
    const googleSection = page.locator("text=Pixels Google (GA4)").locator("..").locator("..");
    await googleSection.locator('button:has-text("Adicionar")').click();

    await page.fill('input[placeholder*="Measurement ID"]', "G-E2ETEST123");
    await page.fill('input[placeholder*="API Secret"]', "e2e_test_secret");

    await page.click('button:has-text("Salvar")');
    await expect(page.locator("text=Cliente atualizado")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });
    const clientRow2 = page.locator(`[class*="card"]`).filter({ hasText: TEST_CLIENT_NAME });
    await expect(clientRow2.locator("text=GA4: 1")).toBeVisible({ timeout: 5_000 });
  });

  test("edit client — configure stage mapping", async ({ page }) => {
    const clientCard = page.locator(`text=${TEST_CLIENT_NAME}`).first();
    await expect(clientCard).toBeVisible({ timeout: 10_000 });
    const card = page.locator(`[class*="card"]`).filter({ hasText: TEST_CLIENT_NAME });
    await card.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).click();

    // Go to Estágios tab
    await page.getByRole("tab", { name: /Est/ }).click();
    await expect(page.locator("text=Mapeamento de Estágios")).toBeVisible();

    // Add stage mapping — default event is "Lead", just fill stage name
    await page.click('button:has-text("Adicionar")');
    await page.fill('input[placeholder*="Nome do est"]', "Qualificado");
    // "Lead" is already selected as default, just save
    await page.click('button:has-text("Salvar")');
    await expect(page.locator("text=Cliente atualizado")).toBeVisible({ timeout: 10_000 });
  });

  test("edit client — configure field mapping", async ({ page }) => {
    const clientCard = page.locator(`text=${TEST_CLIENT_NAME}`).first();
    await expect(clientCard).toBeVisible({ timeout: 10_000 });
    const card = page.locator(`[class*="card"]`).filter({ hasText: TEST_CLIENT_NAME });
    await card.locator('button').filter({ has: page.locator('svg.lucide-pencil') }).click();

    // Go to Campos tab
    await page.getByRole("tab", { name: "Campos" }).click();
    await expect(page.locator("text=Mapeamento de Campos")).toBeVisible();

    // Add field mapping
    await page.click('button:has-text("Adicionar")');
    await page.fill('input[placeholder*="Path no CRM"]', "address.city");

    await page.click('button:has-text("Salvar")');
    await expect(page.locator("text=Cliente atualizado")).toBeVisible({ timeout: 10_000 });
  });

  test("expand client card shows details", async ({ page }) => {
    const clientCard = page.locator(`text=${TEST_CLIENT_NAME}`).first();
    await expect(clientCard).toBeVisible({ timeout: 10_000 });
    await clientCard.click();

    // Expanded section
    await expect(page.locator("text=API Key:")).toBeVisible();
    await expect(page.locator("text=Eventos:")).toBeVisible();
    await expect(page.locator("text=Pixels Meta:")).toBeVisible();
    await expect(page.locator("text=999888777666")).toBeVisible();
    await expect(page.locator("text=G-E2ETEST123")).toBeVisible();
  });

  test("verify client persisted in API", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/clients`, {
      headers: { "X-API-Key": MASTER_KEY },
    });
    const clients = await res.json();
    const testClient = clients.find((c: any) => c.name === TEST_CLIENT_NAME);
    expect(testClient).toBeTruthy();
    expect(testClient.pixels.length).toBeGreaterThanOrEqual(1);
    expect(testClient.pixels[0].pixel_id).toBe("999888777666");
    expect(testClient.google_pixels.length).toBeGreaterThanOrEqual(1);
    expect(testClient.google_pixels[0].measurement_id).toBe("G-E2ETEST123");
    expect(testClient.crm_credentials.datacrazy_token).toBe("dc_test_token_e2e");
    expect(testClient.crm_credentials.stage_map).toBeTruthy();
    expect(testClient.active).toBe(true);
    expect(testClient.api_key).toBeTruthy();
  });

  test("config endpoint works with client API key", async ({ request }) => {
    // Get client key
    const listRes = await request.get(`${API_URL}/api/clients`, {
      headers: { "X-API-Key": MASTER_KEY },
    });
    const clients = await listRes.json();
    const testClient = clients.find((c: any) => c.name === TEST_CLIENT_NAME);
    expect(testClient).toBeTruthy();

    // Use client key to access config
    const configRes = await request.get(`${API_URL}/api/config`, {
      headers: { "X-API-Key": testClient.api_key },
    });
    expect(configRes.ok()).toBeTruthy();
    const config = await configRes.json();
    expect(config.name).toBe(TEST_CLIENT_NAME);
    expect(config.pixels.length).toBeGreaterThanOrEqual(1);
    expect(config.events_enabled).toContain("Purchase");
    expect(config.events_enabled).toContain("Lead");
  });

  test("delete test client (cleanup)", async ({ page, request }) => {
    // Clean up via API directly (more reliable than UI confirm dialog)
    const res = await request.get(`${API_URL}/api/clients`, {
      headers: { "X-API-Key": MASTER_KEY },
    });
    const clients = await res.json();
    const testClient = clients.find((c: any) => c.name === TEST_CLIENT_NAME);
    expect(testClient).toBeTruthy();

    await request.delete(`${API_URL}/api/clients/${testClient.id}`, {
      headers: { "X-API-Key": MASTER_KEY },
    });

    // Verify deleted
    const res2 = await request.get(`${API_URL}/api/clients`, {
      headers: { "X-API-Key": MASTER_KEY },
    });
    const clients2 = await res2.json();
    expect(clients2.find((c: any) => c.name === TEST_CLIENT_NAME)).toBeFalsy();
  });
});

// ═══════════════════════════════════════════════
// Test 5: Events enabled toggle
// ═══════════════════════════════════════════════
test.describe("Events Configuration", () => {
  const EVT_CLIENT = `E2E-Events-${Date.now()}`;

  test("create client with custom events and verify", async ({ page, request }) => {
    await login(page);
    await goToConfig(page);
    await fillConnection(page);

    // Create client
    await page.click('button:has-text("Novo Cliente")');
    await page.fill('input[placeholder*="Clínica"]', EVT_CLIENT);

    // Toggle off Purchase, keep Lead, add ViewContent
    const purchaseBadge = page.locator(`div:has-text("Eventos Habilitados") >> text=Purchase`).first();
    await purchaseBadge.click(); // Toggle off

    const viewContentBadge = page.locator(`div:has-text("Eventos Habilitados") >> text=ViewContent`).first();
    await viewContentBadge.click(); // Toggle on

    await page.click('button:has-text("Criar Cliente")');
    await expect(page.locator(`text=${EVT_CLIENT}`)).toBeVisible({ timeout: 10_000 });

    // Verify via API
    const res = await request.get(`${API_URL}/api/clients`, {
      headers: { "X-API-Key": MASTER_KEY },
    });
    const clients = await res.json();
    const client = clients.find((c: any) => c.name === EVT_CLIENT);
    expect(client).toBeTruthy();
    expect(client.events_enabled).not.toContain("Purchase");
    expect(client.events_enabled).toContain("Lead");
    expect(client.events_enabled).toContain("ViewContent");

    // Cleanup
    await request.delete(`${API_URL}/api/clients/${client.id}`, {
      headers: { "X-API-Key": MASTER_KEY },
    });
  });
});
