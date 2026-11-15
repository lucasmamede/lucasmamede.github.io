window.FinanceLabTests = (function FinanceLabTests(R,Seed,Engine){
"use strict";
const cases=[];
function test(name,fn){
 try{const ok=fn();cases.push({name,ok:ok!==false,error:ok===false?"Condição não atendida":""});}
 catch(e){cases.push({name,ok:false,error:e.message||String(e)});}
}
function eq(a,b){if(a!==b)throw Error("Esperado "+JSON.stringify(b)+", obtido "+JSON.stringify(a));}
function truth(x,msg="Condição não atendida"){if(!x)throw Error(msg);}
function fresh(){let val=null;const mem={getItem:()=>val,setItem:(k,v)=>{val=v;}};return Engine(R,Seed,mem);}
const newCat=e=>e.db.categories[0].id;
test("Fechamento 27/06: compra 25/06 vence 03/07",()=>eq(R.invoiceDue("2026-06-25",27,3),"2026-07-03"));
test("Compra após fechamento 28/06 vence 03/08",()=>eq(R.invoiceDue("2026-06-28",27,3),"2026-08-03"));
test("Mês curto: fechamento 31 em fevereiro",()=>eq(R.invoiceDue("2027-02-28",31,3),"2027-03-03"));
test("Parcelamento de R$ 1.000 em 4 de R$ 250",()=>{const p=R.installments(100000,4);eq(p.length,4);truth(p.every(x=>x.cents===25000));});
test("Centavos: 100 centavos em 3 parcelas",()=>{const p=R.installments(100,3);eq(p.reduce((s,x)=>s+x.cents,0),100);eq(p.length,3);});
test("Parcela atual inicia sem duplicar anteriores",()=>{const p=R.installments(40000,4,3);eq(p.length,2);eq(p[0].number,3);});
test("Lançamento de receita aumenta saldo da conta",()=>{const e=fresh(),id=e.db.accounts[0].id,before=R.accountBalance(e.db,id);e.tx({type:"income",desc:"Receita teste",date:R.today(),amount:"150.00",accountId:id});eq(R.accountBalance(e.db,id)-before,15000);});
test("Despesa à vista reduz saldo da conta",()=>{const e=fresh(),id=e.db.accounts[0].id,before=R.accountBalance(e.db,id);e.tx({type:"expense",desc:"Despesa teste",date:R.today(),amount:"79.99",accountId:id});eq(before-R.accountBalance(e.db,id),7999);});
test("Transferência entre contas não altera saldo consolidado",()=>{const e=fresh(),a=e.db.accounts[0].id,b=e.db.accounts[1].id,before=e.db.accounts.reduce((s,x)=>s+R.accountBalance(e.db,x.id),0);e.tx({type:"transfer",desc:"Transferência teste",date:R.today(),amount:"250.00",accountId:a,toAccountId:b});const after=e.db.accounts.reduce((s,x)=>s+R.accountBalance(e.db,x.id),0);eq(after,before);});
test("Cartão parcelado gera faturas e não reduz caixa antes de pagar",()=>{const e=fresh(),acc=e.db.accounts[0].id,c=e.db.cards[0].id,bal=R.accountBalance(e.db,acc);const created=e.tx({type:"card",desc:"Compra teste",date:"2026-06-25",amount:"1000.00",categoryId:newCat(e),cardId:c,installmentTotal:4,installmentCurrent:1});eq(created.length,4);eq(created[0].invoiceDue,"2026-07-03");eq(created[1].invoiceDue,"2026-08-03");eq(R.accountBalance(e.db,acc),bal);});
test("Pagamento de fatura reduz caixa sem despesa duplicada",()=>{
 const e=fresh(),acc=e.db.accounts[0].id,c=e.db.cards[0].id;
 const created=e.tx({type:"card",desc:"Compra teste",date:"2026-06-25",amount:"1000.00",categoryId:newCat(e),cardId:c,installmentTotal:4,installmentCurrent:1});
 const due=created[0].invoiceDue,before=R.accountBalance(e.db,acc),spent=R.stats(e.db,R.month(R.today())).spent;
 e.payment({cardId:c,dueDate:due,accountId:acc,date:R.today(),amount:"250.00"});
 eq(before-R.accountBalance(e.db,acc),25000);eq(R.stats(e.db,R.month(R.today())).spent,spent);eq(R.invoice(e.db,c,due).pending,0);
});
test("Pagamento parcial impede valor superior à fatura",()=>{
 const e=fresh(),acc=e.db.accounts[0].id,c=e.db.cards[0].id;
 const [t]=e.tx({type:"card",desc:"Compra teste",date:"2026-06-25",amount:"300.00",cardId:c});
 let failed=false;try{e.payment({cardId:c,dueDate:t.invoiceDue,date:R.today(),accountId:acc,amount:"301.00"});}catch(_){failed=true;}truth(failed,"Pagamento maior deveria ser recusado");
});
test("Conta recorrente cria 12 vencimentos distintos",()=>{
 const e=fresh(),initial=e.db.bills.length;
 e.bill({name:"Nova conta",amount:"120.00",dueDate:"2026-12-10",recurrence:"Mensal",accountId:e.db.accounts[0].id,categoryId:newCat(e)});
 const rows=e.db.bills.slice(initial);eq(rows.length,12);eq(new Set(rows.map(x=>x.dueDate)).size,12);
});
test("Pagar uma ocorrência não paga as próximas",()=>{
 const e=fresh(),initial=e.db.bills.length;
 e.bill({name:"Nova conta",amount:"120.00",dueDate:"2026-12-10",recurrence:"Mensal",accountId:e.db.accounts[0].id});
 const rows=e.db.bills.slice(initial);e.toggleBill(rows[0].id);truth(!!rows[0].paidAt);eq(rows[1].paidAt,null);
});
test("Editar uma ocorrência preserva as demais",()=>{
 const e=fresh(),initial=e.db.bills.length;
 e.bill({name:"Internet",amount:"100.00",dueDate:"2026-12-10",recurrence:"Mensal",accountId:e.db.accounts[0].id});
 const rows=e.db.bills.slice(initial);
 e.bill({name:"Internet nova",amount:"120.00",dueDate:rows[1].dueDate,recurrence:"Mensal",accountId:e.db.accounts[0].id},rows[1].id,"one");
 eq(rows[0].amount,10000);eq(rows[1].amount,12000);eq(rows[2].amount,10000);
});
test("Assinatura só vira despesa quando cobrança é registrada",()=>{
 const e=fresh(),sub=e.db.subscriptions[0],month=R.month(sub.nextDate),before=R.stats(e.db,month).spent,prevDate=sub.nextDate;
 e.chargeSubscription(sub.id);eq(R.stats(e.db,month).spent-before,sub.amount);truth(sub.nextDate!==prevDate);
});
test("Renomeação de categoria preserva ligação histórica",()=>{
 const e=fresh(),c=e.db.categories[0],tx=e.db.transactions.find(t=>t.categoryId===c.id);
 e.category({name:"Categoria reformulada",kind:c.kind,color:c.color},c.id);
 eq(e.db.transactions.find(t=>t.id===tx.id).categoryId,c.id);eq(e.db.categories.find(x=>x.id===c.id).name,"Categoria reformulada");
});
test("Desativar categoria não remove o histórico",()=>{
 const e=fresh(),c=e.db.categories[0],count=e.db.transactions.length;
 e.archiveCategory(c.id);truth(c.archived);eq(e.db.transactions.length,count);
});
test("Aporte futuro não aparece no patrimônio anterior",()=>{
 const e=fresh(),inv=e.db.investments[0].id,today=R.today(),future=R.addMonths(today,2),before=R.position(e.db,inv,today,0).capital;
 e.tx({type:"investment",desc:"Aporte programado",date:future,amount:"1111.00",accountId:e.db.accounts[0].id,investmentId:inv});
 eq(R.position(e.db,inv,today,0).capital,before);eq(R.position(e.db,inv,R.addDays(future,1),0).capital,before+111100);
});
test("Aporte é saída de caixa, mas não gasto de consumo",()=>{
 const e=fresh(),acc=e.db.accounts[0].id,inv=e.db.investments[0].id,now=R.today(),before=R.accountBalance(e.db,acc),expense=R.stats(e.db,R.month(now)).spent;
 e.tx({type:"investment",desc:"Novo aporte",date:now,amount:"120.00",accountId:acc,investmentId:inv});
 eq(before-R.accountBalance(e.db,acc),12000);eq(R.stats(e.db,R.month(now)).spent,expense);
});
test("Resgate não pode ultrapassar carteira",()=>{
 const e=fresh();let failed=false;
 try{e.tx({type:"rescue",desc:"Resgate impossível",amount:"999999999.00",date:R.today(),accountId:e.db.accounts[0].id,investmentId:e.db.investments[0].id});}catch(_){failed=true;}truth(failed);
});
test("Importação inválida não substitui dados de demonstração",()=>{
 const e=fresh(),before=e.db.transactions.length;let failed=false;try{e.load({abc:"invalido"});}catch(_){failed=true;}truth(failed);eq(e.db.transactions.length,before);
});
test("Reinício restaura os dados fictícios da demonstração",()=>{
 const e=fresh(),before=e.db.accounts.length;e.account({name:"Temp",bank:"Teste",opening:"20.00",color:"#abcdef"});eq(e.db.accounts.length,before+1);e.reset();eq(e.db.accounts.length,before);
});
return cases;
});
