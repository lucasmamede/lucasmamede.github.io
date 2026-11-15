window.FinanceLabEngine = (function FinanceLabEngine(R,Seed,store){
 "use strict";
 store=store||localStorage;
 const KEY="meu-financeiro-teste2-demo-v1";
 const arrays=["accounts","cards","categories","transactions","bills","subscriptions","investments","invoicePayments"];
 function valid(d){return !!(d&&d.version===1&&arrays.every(k=>Array.isArray(d[k]))&&d.settings&&typeof d.settings==="object");}
 let db;
 try{const stored=store.getItem(KEY);db=stored?JSON.parse(stored):Seed(R);if(!valid(db))db=Seed(R);}catch(_){db=Seed(R);}
 function persist(){store.setItem(KEY,JSON.stringify(db));return db;}
 function reset(){db=Seed(R);persist();return db;}
 function load(value){if(!valid(value))throw Error("Arquivo não é um backup do Laboratório.");db=JSON.parse(JSON.stringify(value));persist();}
 persist();
 const required=(v,label)=>{const s=String(v||"").trim();if(!s)throw Error("Informe "+label+".");return s};
 const positive=(v)=>{const n=R.toCents(v);if(n<=0)throw Error("O valor deve ser maior que zero.");return n;};
 const belongs=(table,id)=>{const item=db[table].find(x=>x.id===id);if(!item)throw Error("Registro não encontrado: "+table);return item;};
 const takeDate=(d)=>R.iso(R.date(required(d,"a data")));
 function tx(input,editingId=null){
  const type=required(input.type,"o tipo"),allow=["income","expense","card","transfer","investment","rescue"];
  if(!allow.includes(type))throw Error("Tipo não permitido");
  const desc=required(input.desc,"a descrição"),date=takeDate(input.date),amount=positive(input.amount);
  let accountId=null,cardId=null,toAccountId=null,investmentId=null;
  if(type==="card"){cardId=required(input.cardId,"o cartão");belongs("cards",cardId);}
  else {accountId=required(input.accountId,"a conta");belongs("accounts",accountId);}
  if(type==="transfer"){toAccountId=required(input.toAccountId,"a conta de destino");belongs("accounts",toAccountId);if(toAccountId===accountId)throw Error("Escolha duas contas diferentes.");}
  if(["investment","rescue"].includes(type)){investmentId=required(input.investmentId,"o investimento");belongs("investments",investmentId);}
  if(type==="rescue"){const available=R.position(db,investmentId,date,Number(db.settings.dailyCDIPct)).estimated;if(available<amount)throw Error("Resgate acima do valor disponível estimado.");}
  const categoryId=input.categoryId&&db.categories.some(c=>c.id===input.categoryId)?input.categoryId:null;
  if(editingId){
   const old=belongs("transactions",editingId);
   if(old.type==="card"&&db.invoicePayments.some(p=>p.cardId===old.cardId&&p.dueDate===old.invoiceDue))throw Error("Esta parcela já tem pagamento registrado; reverta o pagamento antes de editar.");
   const updated={...old,type,desc,date,amount,categoryId,accountId,cardId,toAccountId,investmentId};
   if(type==="card"){const c=belongs("cards",cardId);updated.invoiceDue=R.invoiceDue(date,c.closingDay,c.dueDay);}
   else{delete updated.invoiceDue;delete updated.installmentNo;delete updated.installmentTotal;delete updated.groupId;delete updated.purchaseDate;}
   Object.assign(old,updated);persist();return [old];
  }
  if(type==="card"){
   const n=Number(input.installmentTotal||1),current=Number(input.installmentCurrent||1),c=belongs("cards",cardId),groupId=R.unique();
   const portions=R.installments(amount,n,current);
   const rows=portions.map(p=>{const step=p.number-current,day=R.addMonths(date,step);
     return {id:R.unique(),type,desc,amount:p.cents,date:day,purchaseDate:date,categoryId,accountId:null,cardId,invoiceDue:R.invoiceDue(day,c.closingDay,c.dueDay),installmentNo:p.number,installmentTotal:n,groupId,createdAt:R.today()};});
   db.transactions.push(...rows);persist();return rows;
  }
  const row={id:R.unique(),type,desc,date,amount,categoryId,accountId,cardId,toAccountId,investmentId,createdAt:R.today()};
  db.transactions.push(row);persist();return [row];
 }
 function deleteTx(id,scope="one"){
  const row=belongs("transactions",id);
  let ids=[id];
  if(row.groupId&&scope!=="one"){const group=db.transactions.filter(t=>t.groupId===row.groupId);ids=group.filter(t=>scope==="all"||t.installmentNo>=row.installmentNo).map(t=>t.id);}
  const affected=db.transactions.filter(t=>ids.includes(t.id)&&t.type==="card");
  if(affected.some(t=>db.invoicePayments.some(p=>p.cardId===t.cardId&&p.dueDate===t.invoiceDue)))throw Error("Há pagamento vinculado. Reverter o pagamento antes de excluir.");
  db.transactions=db.transactions.filter(t=>!ids.includes(t.id));persist();return ids.length;
 }
 function bulk(ids,categoryId){if(!db.categories.some(c=>c.id===categoryId))throw Error("Categoria inválida.");let n=0;for(const t of db.transactions){if(ids.includes(t.id)){t.categoryId=categoryId;n++;}}persist();return n;}
 function duplicate(id){const t=belongs("transactions",id);if(t.type==="card")return tx({type:"card",desc:t.desc,date:t.date,amount:(t.amount/100).toFixed(2),categoryId:t.categoryId,cardId:t.cardId,installmentTotal:1,installmentCurrent:1});return tx({...t,amount:(t.amount/100).toFixed(2)});}
 function bill(input,id=null,scope="one"){
  const name=required(input.name,"o nome da conta"),amount=positive(input.amount),dueDate=takeDate(input.dueDate);
  const recurrence=["Nenhuma","Semanal","Mensal","Bimestral","Trimestral","Semestral","Anual"].includes(input.recurrence)?input.recurrence:"Nenhuma";
  const categoryId=db.categories.some(x=>x.id===input.categoryId)?input.categoryId:null;
  const accountId=db.accounts.some(x=>x.id===input.accountId)?input.accountId:db.accounts[0]?.id;
  if(id){
   const row=belongs("bills",id);
   const group=row.seriesId?db.bills.filter(b=>b.seriesId===row.seriesId):[row];
   const apply=group.filter(b=>scope==="all"||(scope==="future"&&b.seriesIndex>=row.seriesIndex)||b.id===row.id);
   for(const b of apply){const delta=b.seriesIndex-row.seriesIndex;
     const dateNew=delta===0?dueDate:R.recurring(dueDate,recurrence,delta);
     Object.assign(b,{name,amount,dueDate:dateNew,categoryId,accountId});
     if(scope==="one")break;
   }
   persist();return apply.length;
  }
  const seriesId=recurrence==="Nenhuma"?null:R.unique(),size=recurrence==="Nenhuma"?1:recurrence==="Semanal"?26:12;
  for(let i=0;i<size;i++)db.bills.push({id:R.unique(),seriesId,seriesIndex:i,name,amount,dueDate:R.recurring(dueDate,recurrence,i),recurrence,categoryId,accountId,paidAt:null});
  persist();return size;
 }
 function toggleBill(id){const b=belongs("bills",id);b.paidAt=b.paidAt?null:R.today();persist();return b;}
 function deleteBill(id,scope="one"){
  const b=belongs("bills",id);const targets=db.bills.filter(x=>x.id===id||(b.seriesId&&x.seriesId===b.seriesId&&(scope==="all"||(scope==="future"&&x.seriesIndex>=b.seriesIndex))));
  db.bills=db.bills.filter(x=>!targets.some(y=>y.id===x.id));persist();return targets.length;
 }
 function subscription(input,id=null){
  const name=required(input.name,"a assinatura"),amount=positive(input.amount),nextDate=takeDate(input.nextDate);
  const recurrence=["Semanal","Mensal","Bimestral","Trimestral","Semestral","Anual"].includes(input.recurrence)?input.recurrence:"Mensal";
  const categoryId=db.categories.some(c=>c.id===input.categoryId)?input.categoryId:null;
  const cardId=input.cardId&&db.cards.some(c=>c.id===input.cardId)?input.cardId:null;
  const accountId=cardId?null:(db.accounts.some(a=>a.id===input.accountId)?input.accountId:db.accounts[0]?.id);
  const status=["Ativa","Pausada","Cancelada"].includes(input.status)?input.status:"Ativa";
  const data={name,amount,nextDate,recurrence,categoryId,cardId,accountId,status};
  if(id)Object.assign(belongs("subscriptions",id),data);else db.subscriptions.push({id:R.unique(),...data});
  persist();
 }
 function statusSubscription(id){const x=belongs("subscriptions",id);x.status=x.status==="Ativa"?"Pausada":"Ativa";persist();}
 function chargeSubscription(id){
  const x=belongs("subscriptions",id);if(x.status!=="Ativa")throw Error("Assinatura não está ativa.");
  const date=x.nextDate;
  if(x.cardId){const card=belongs("cards",x.cardId);db.transactions.push({id:R.unique(),type:"card",desc:"Assinatura: "+x.name,amount:x.amount,date,purchaseDate:date,categoryId:x.categoryId,accountId:null,cardId:x.cardId,invoiceDue:R.invoiceDue(date,card.closingDay,card.dueDay),installmentNo:1,installmentTotal:1});}
  else db.transactions.push({id:R.unique(),type:"expense",desc:"Assinatura: "+x.name,amount:x.amount,date,categoryId:x.categoryId,accountId:x.accountId});
  x.nextDate=R.recurring(x.nextDate,x.recurrence,1);persist();return x;
 }
 function removeSubscription(id){db.subscriptions=db.subscriptions.filter(x=>x.id!==id);persist();}
 function card(input,id=null){
  const name=required(input.name,"o cartão"),bank=required(input.bank,"a instituição"),limit=positive(input.limit);
  const closingDay=Number(input.closingDay),dueDay=Number(input.dueDay);
  R.invoiceDue(R.today(),closingDay,dueDay);
  const color=/^#[0-9a-f]{6}$/i.test(input.color)?input.color:"#8170ff";
  const data={name,bank,limit,closingDay,dueDay,color};
  if(id){const target=belongs("cards",id);Object.assign(target,data);
    // Recalculate invoices only for unpaid installments. Paid invoices retain their original due date.
    for(const t of db.transactions.filter(t=>t.type==="card"&&t.cardId===id)){
      if(!db.invoicePayments.some(p=>p.cardId===id&&p.dueDate===t.invoiceDue))t.invoiceDue=R.invoiceDue(t.date,closingDay,dueDay);
    }
  }else db.cards.push({id:R.unique(),...data});
  persist();
 }
 function removeCard(id){if(db.transactions.some(t=>t.cardId===id)||db.subscriptions.some(s=>s.cardId===id)||db.invoicePayments.some(p=>p.cardId===id))throw Error("Cartão possui movimentações. Remova os vínculos antes de excluir.");db.cards=db.cards.filter(x=>x.id!==id);persist();}
 function account(input,id=null){
  const name=required(input.name,"a conta"),bank=required(input.bank,"a instituição"),opening=R.toCents(input.opening),color=/^#[0-9a-f]{6}$/i.test(input.color)?input.color:"#70aef0";
  if(id)Object.assign(belongs("accounts",id),{name,bank,opening,color});else db.accounts.push({id:R.unique(),name,bank,opening,color});
  persist();
 }
 function removeAccount(id){if(db.accounts.length===1)throw Error("Mantenha pelo menos uma conta.");if(db.transactions.some(t=>t.accountId===id||t.toAccountId===id)||db.bills.some(b=>b.accountId===id)||db.subscriptions.some(s=>s.accountId===id)||db.invoicePayments.some(p=>p.accountId===id))throw Error("Conta possui vínculos. Não é seguro excluí-la.");db.accounts=db.accounts.filter(x=>x.id!==id);persist();}
 function investment(input,id=null){
  const name=required(input.name,"o investimento"),institution=required(input.institution,"a instituição"),startDate=takeDate(input.startDate),opening=R.toCents(input.opening),monthlyPlan=R.toCents(input.monthlyPlan||"0");
  const cdiPercent=Number(input.cdiPercent);
  if(!Number.isFinite(cdiPercent)||cdiPercent<0||cdiPercent>500)throw Error("% do CDI deve estar entre 0 e 500.");
  if(opening<0||monthlyPlan<0)throw Error("Os valores não podem ser negativos.");
  const data={name,institution,startDate,opening,monthlyPlan,cdiPercent,risk:String(input.risk||"Baixo")};
  if(id)Object.assign(belongs("investments",id),data);else db.investments.push({id:R.unique(),...data});
  persist();
 }
 function removeInvestment(id){if(db.transactions.some(t=>t.investmentId===id))throw Error("Este investimento tem aportes ou resgates registrados.");db.investments=db.investments.filter(x=>x.id!==id);persist();}
 function category(input,id=null){
  const name=required(input.name,"a categoria"),kind=["expense","income","investment"].includes(input.kind)?input.kind:"expense",color=/^#[0-9a-f]{6}$/i.test(input.color)?input.color:"#8170ff";
  if(db.categories.some(c=>c.name.toLowerCase()===name.toLowerCase()&&c.id!==id))throw Error("Essa categoria já existe.");
  const icon=String(input.icon||"🏷️").slice(0,8);const data={name,kind,color,icon,archived:false};
  if(id)Object.assign(belongs("categories",id),data);else db.categories.push({id:R.unique(),...data});
  persist();
 }
 function archiveCategory(id){const x=belongs("categories",id);x.archived=!x.archived;persist();}
 function payment(input){
  const cardId=required(input.cardId,"o cartão"),dueDate=takeDate(input.dueDate),accountId=required(input.accountId,"a conta"),date=takeDate(input.date),amount=positive(input.amount);
  belongs("cards",cardId);belongs("accounts",accountId);
  if(date<R.addMonths(dueDate,-12))throw Error("Data de pagamento incomum. Confira.");
  const invoice=R.invoice(db,cardId,dueDate);if(amount>invoice.pending)throw Error("Pagamento supera o saldo da fatura.");
  db.invoicePayments.push({id:R.unique(),cardId,dueDate,accountId,date,amount});
  persist();
 }
 function cancelPayment(id){db.invoicePayments=db.invoicePayments.filter(p=>p.id!==id);persist();}
 function exportData(){return JSON.stringify(db,null,2);}
 return {get db(){return db;},persist,reset,load,tx,deleteTx,bulk,duplicate,bill,toggleBill,deleteBill,subscription,statusSubscription,chargeSubscription,removeSubscription,card,removeCard,account,removeAccount,investment,removeInvestment,category,archiveCategory,payment,cancelPayment,exportData};
});
