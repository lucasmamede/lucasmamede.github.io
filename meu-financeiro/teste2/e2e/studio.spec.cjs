const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.removeItem('meu-financeiro-teste2-demo-v1'));
  await page.reload();
});

async function go(page, name, isMobile) {
  if (isMobile && !['home','activity','agenda'].includes(name)) {
    await page.locator('.mobile-nav [data-action="mobileMore"]').click();
    await page.locator('#sheetBody [data-page="' + name + '"]').click();
  } else if (isMobile) {
    await page.locator('.mobile-nav [data-page="' + name + '"]').click();
  } else {
    if (['accounts','subscriptions','settings'].includes(name)) {
      await page.locator('#moreButton').click();
      await page.locator('#moreMenu [data-page="' + name + '"]').click();
    } else {
      await page.locator('.desktop-nav [data-page="' + name + '"]').click();
    }
  }
}

test('nova proposta abre em ambiente isolado e navega', async ({ page, isMobile }) => {
  await expect(page.getByText('SEGUNDA PROPOSTA')).toBeVisible();
  await expect(page.locator('main h1')).toHaveText('Seu dinheiro, em ordem.');
  await go(page,'investments',isMobile);
  await expect(page.locator('main h1')).toHaveText('Seu patrimônio crescendo.');
  await go(page,'settings',isMobile);
  await expect(page.locator('main h1')).toHaveText('Seu app, suas escolhas.');
  const data = await page.evaluate(() => Object.keys(localStorage));
  expect(data).toContain('meu-financeiro-teste2-demo-v1');
  expect(data.filter(v => /supabase|auth-token/i.test(v))).toEqual([]);
});

test('cria despesa e conserva os dados depois de recarregar', async ({ page }) => {
  await page.locator('.header-add').click();
  await page.locator('#sheetBody [data-act="selectTxType"][data-type="expense"]').click();
  const form=page.locator('form[data-form="transaction"]');
  await form.locator('[name="desc"]').fill('Despesa criada no Estúdio');
  await form.locator('[name="amount"]').fill('83.70');
  await form.locator('button[type="submit"]').click();
  let current=await page.evaluate(() => window.FinanceStudioDebug.getData());
  expect(current.transactions.some(t=>t.desc==='Despesa criada no Estúdio'&&t.amount===8370)).toBeTruthy();
  await page.reload();
  current=await page.evaluate(() => window.FinanceStudioDebug.getData());
  expect(current.transactions.some(t=>t.desc==='Despesa criada no Estúdio')).toBeTruthy();
});

test('compra parcelada e pagamento não duplicam gasto', async ({ page, isMobile }) => {
  await page.locator('.header-add').click();
  await page.locator('#sheetBody [data-act="selectTxType"][data-type="card"]').click();
  const form=page.locator('form[data-form="transaction"]');
  await form.locator('[name="desc"]').fill('Compra controlada');
  await form.locator('[name="date"]').fill('2026-06-25');
  await form.locator('[name="amount"]').fill('1000.00');
  await form.locator('[name="cardId"]').selectOption('cartao-1');
  await form.locator('[name="installmentTotal"]').fill('4');
  await form.locator('[name="installmentCurrent"]').fill('1');
  await form.locator('button[type="submit"]').click();
  const rows=await page.evaluate(() => window.FinanceStudioDebug.getData().transactions.filter(t=>t.desc==='Compra controlada'));
  expect(rows.map(x=>x.amount)).toEqual([25000,25000,25000,25000]);
  expect(rows[0].invoiceDue).toBe('2026-07-03');
  expect(rows[1].invoiceDue).toBe('2026-08-03');
  const before=await page.evaluate(()=>{
    const d=window.FinanceStudioDebug.getData(),r=window.FinanceRules;
    return {cash:r.accountBalance(d,'conta-1'),spend:r.stats(d,r.month(r.today())).spent};
  });
  await go(page,'cards',isMobile);
  await page.locator('[data-act="openInvoice"][data-date="2026-07-03"]').first().click();
  await page.locator('#sheetBody [data-act="payInvoice"]').click();
  await page.locator('form[data-form="payment"] [name="amount"]').fill('250.00');
  await page.locator('form[data-form="payment"] button[type="submit"]').click();
  const after=await page.evaluate(()=>{
    const d=window.FinanceStudioDebug.getData(),r=window.FinanceRules;
    return {cash:r.accountBalance(d,'conta-1'),spend:r.stats(d,r.month(r.today())).spent};
  });
  expect(before.cash-after.cash).toBe(25000);
  expect(after.spend).toBe(before.spend);
});

test('contas na agenda podem mudar de situação', async ({ page, isMobile }) => {
  await go(page,'agenda',isMobile);
  const first=page.locator('main [data-act="openBill"]').first();
  await expect(first).toBeVisible();
  const id=await first.getAttribute('data-id');
  await first.click();
  const before=await page.evaluate(id=>window.FinanceStudioDebug.getData().bills.find(b=>b.id===id).paidAt,id);
  await page.locator('#sheetBody [data-act="toggleBill"]').click();
  const after=await page.evaluate(id=>window.FinanceStudioDebug.getData().bills.find(b=>b.id===id).paidAt,id);
  expect(Boolean(before)).not.toBe(Boolean(after));
});

test('cadastra categoria com ícone e alterna tema', async ({ page, isMobile }) => {
  await go(page,'settings',isMobile);
  await page.locator('main [data-create="category"]').click();
  const form=page.locator('form[data-form="category"]');
  await form.locator('[name="name"]').fill('Pets');
  await form.locator('[name="icon"]').selectOption('🐾');
  await form.locator('button[type="submit"]').click();
  const data=await page.evaluate(()=>window.FinanceStudioDebug.getData());
  expect(data.categories.find(c=>c.name==='Pets')?.icon).toBe('🐾');
  await page.locator('main [data-act="themeLight"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

test('23 testes financeiros internos passam', async ({ page, isMobile }) => {
  await go(page,'settings',isMobile);
  await page.locator('main [data-act="runUnitTests"]').click();
  await expect(page.locator('#unitOutput')).toContainText('23/23 testes financeiros aprovados');
});
