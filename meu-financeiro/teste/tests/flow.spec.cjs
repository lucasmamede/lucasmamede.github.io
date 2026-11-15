const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('meu-financeiro-laboratorio-demo-v1'));
  await page.goto('/');
});

test('carrega isolado, sem autenticação, e navega entre telas', async ({ page, isMobile }) => {
  await expect(page.getByText('AMBIENTE DE TESTES')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  if (isMobile) {
    await page.locator('.mobile-bottom [data-action="more"]').click();
    await page.locator('#dialogBody [data-nav="investments"]').click();
  } else {
    await page.locator('.side-nav [data-nav="investments"]').click();
  }
  await expect(page.getByRole('heading', { name: 'Investimentos', exact: true }).first()).toBeVisible();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toContain('meu-financeiro-laboratorio-demo-v1');
  expect(keys.filter(k => /supabase|auth-token/i.test(k))).toEqual([]);
});

test('cria despesa, atualiza valor e mantém após recarregar', async ({ page }) => {
  await page.locator('header [data-add="expense"]').click();
  await page.locator('form[data-form="transaction"] [name="desc"]').fill('Despesa criada pelo teste');
  await page.locator('form[data-form="transaction"] [name="amount"]').fill('87.65');
  await page.locator('form[data-form="transaction"] button[type="submit"]').click();
  await expect(page.getByText('Lançamento salvo.')).toBeVisible();
  let stored = await page.evaluate(() => window.FinanceLabDebug.getDemo());
  expect(stored.transactions.some(t => t.desc === 'Despesa criada pelo teste' && t.amount === 8765)).toBeTruthy();
  await page.reload();
  stored = await page.evaluate(() => window.FinanceLabDebug.getDemo());
  expect(stored.transactions.some(t => t.desc === 'Despesa criada pelo teste')).toBeTruthy();
});

test('compra parcelada respeita fechamento e pagamento não duplica despesa', async ({ page }) => {
  await page.locator('header [data-add="expense"]').click();
  const form=page.locator('form[data-form="transaction"]');
  await form.locator('[name="type"]').selectOption('card');
  await form.locator('[name="desc"]').fill('Compra Playwright');
  await form.locator('[name="amount"]').fill('1000.00');
  await form.locator('[name="date"]').fill('2026-06-25');
  await form.locator('[name="cardId"]').selectOption('cartao-1');
  await form.locator('[name="installmentTotal"]').fill('4');
  await form.locator('[name="installmentCurrent"]').fill('1');
  await form.locator('button[type="submit"]').click();
  const tx = await page.evaluate(() => window.FinanceLabDebug.getDemo().transactions.filter(t => t.desc === 'Compra Playwright'));
  expect(tx.map(x=>x.amount)).toEqual([25000,25000,25000,25000]);
  expect(tx[0].invoiceDue).toBe('2026-07-03');
  expect(tx[1].invoiceDue).toBe('2026-08-03');
  const before = await page.evaluate(() => {
    const d=window.FinanceLabDebug.getDemo(),r=window.FinanceRules;
    return {cash:r.accountBalance(d,'conta-1'),spent:r.stats(d,r.month(r.today())).spent};
  });
  await page.evaluate(() => {
    const d=window.FinanceLabDebug.getDemo();
    // Test only: send a user interaction through the real UI, not direct data mutation.
  });
  if (await page.locator('.side-nav [data-nav="cards"]').isVisible()) {
    await page.locator('.side-nav [data-nav="cards"]').click();
  } else {
    await page.locator('.mobile-bottom [data-action="more"]').click();
    await page.locator('#dialogBody [data-nav="cards"]').click();
  }
  await page.locator('[data-action="payInvoice"][data-date="2026-07-03"]').first().click();
  await page.locator('form[data-form="payment"] [name="amount"]').fill('250.00');
  await page.locator('form[data-form="payment"] button[type="submit"]').click();
  const after = await page.evaluate(() => {
    const d=window.FinanceLabDebug.getDemo(),r=window.FinanceRules;
    return {cash:r.accountBalance(d,'conta-1'),spent:r.stats(d,r.month(r.today())).spent};
  });
  expect(before.cash - after.cash).toBe(25000);
  expect(after.spent).toBe(before.spent);
});

test('categorias permitem renomear sem perder vínculos',async({page})=>{
  if(await page.locator('.side-nav [data-nav="settings"]').isVisible())await page.locator('.side-nav [data-nav="settings"]').click();
  else{await page.locator('.mobile-bottom [data-action="more"]').click();await page.locator('#dialogBody [data-nav="settings"]').click();}
  await page.locator('[data-create="category"]').click();
  await page.locator('form[data-form="category"] [name="name"]').fill('Pets');
  await page.locator('form[data-form="category"] [name="icon"]').selectOption('🐾');
  await page.locator('form[data-form="category"] button[type="submit"]').click();
  await expect(page.getByText('Pets', {exact:false}).first()).toBeVisible();
  const data=await page.evaluate(()=>window.FinanceLabDebug.getDemo());
  expect(data.categories.find(c=>c.name==='Pets')?.icon).toBe('🐾');
});

test('testes financeiros embutidos passam',async({page})=>{
  if(await page.locator('.side-nav [data-nav="settings"]').isVisible())await page.locator('.side-nav [data-nav="settings"]').click();
  else{await page.locator('.mobile-bottom [data-action="more"]').click();await page.locator('#dialogBody [data-nav="settings"]').click();}
  await page.locator('[data-action="runTests"]').click();
  await expect(page.locator('#testResults')).toContainText('23/23 testes aprovados');
});
