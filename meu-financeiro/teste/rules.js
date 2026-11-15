window.FinanceRules = (function FinanceRules() {
"use strict";
const pad=x=>String(x).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const date=s=>{const p=String(s||"").split("-").map(Number);if(p.length!==3||p.some(x=>!Number.isFinite(x)))throw Error("Data inválida");const d=new Date(p[0],p[1]-1,p[2]);if(iso(d)!==String(s))throw Error("Data inválida");return d};
const safeDate=(y,m,day)=>{const d=new Date(y,m,0);return iso(new Date(y,m-1,Math.min(Math.max(1,Number(day)),d.getDate())))};
const addMonths=(s,n)=>{const d=date(s),z=d.getFullYear()*12+d.getMonth()+Number(n),year=Math.floor(z/12),mon=z%12+1;return safeDate(year,mon,d.getDate())};
const addDays=(s,n)=>{const d=date(s);d.setDate(d.getDate()+Number(n));return iso(d)};
const month=s=>String(s||"").slice(0,7);
const monthLabel=s=>{const [y,m]=s.split("-").map(Number);return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))};
const toCents=raw=>{let s=String(raw??"").trim().replace(/[R$\s]/g,"");if(!s)throw Error("Informe o valor.");if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");if(!/^-?\d+(\.\d{1,2})?$/.test(s))throw Error("Valor monetário inválido.");const n=Math.round(Number(s)*100);if(!Number.isSafeInteger(n))throw Error("Valor muito grande.");return n};
const fmt=c=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(c||0)/100);
const recurring=(s,kind,idx)=>{const k=String(kind||"Nenhuma");const p={Mensal:1,Bimestral:2,Trimestral:3,Semestral:6,Anual:12};if(k==="Semanal")return addDays(s,idx*7);return p[k]?addMonths(s,p[k]*idx):s};
const invoiceDue=(p,closing,due)=>{
const c=Number(closing),v=Number(due);if(!Number.isInteger(c)||c<1||c>31||!Number.isInteger(v)||v<1||v>31)throw Error("Fechamento e vencimento devem estar entre 1 e 31.");
const d=date(p),closingDay=safeDate(d.getFullYear(),d.getMonth()+1,c);
const closeCycle=p<=closingDay?closingDay:addMonths(closingDay,1);
const next=v<=c?addMonths(closeCycle,1):closeCycle;
const x=date(next);return safeDate(x.getFullYear(),x.getMonth()+1,v);
};
const installments=(valueCents,n,current=1)=>{
const count=Number(n),start=Number(current),total=Number(valueCents);
if(!Number.isSafeInteger(total)||total<=0)throw Error("Valor inválido.");
if(!Number.isInteger(count)||count<1||count>120)throw Error("Número de parcelas inválido.");
if(!Number.isInteger(start)||start<1||start>count)throw Error("Parcela atual inválida.");
const base=Math.round(total/count),result=Array(count).fill(base);result[count-1]+=total-base*count;
return result.map((c,i)=>({number:i+1,cents:c})).filter(x=>x.number>=start);
};
const total=arr=>arr.reduce((v,x)=>v+Number(x||0),0);
const paidInvoice=(db,cardId,dueDate)=>total((db.invoicePayments||[]).filter(p=>p.cardId===cardId&&p.dueDate===dueDate).map(p=>p.amount));
const invoice=(db,cardId,dueDate)=>{const charges=total(db.transactions.filter(t=>t.type==="card"&&t.cardId===cardId&&t.invoiceDue===dueDate).map(t=>t.amount));const paid=paidInvoice(db,cardId,dueDate);return {cardId,dueDate,charges,paid,pending:Math.max(0,charges-paid)}};
const invoices=(db,cardId)=>[...new Set(db.transactions.filter(t=>t.type==="card"&&t.cardId===cardId).map(t=>t.invoiceDue).filter(Boolean))].sort().map(d=>invoice(db,cardId,d));
const accountBalance=(db,id,asOf=today())=>{
const acc=db.accounts.find(a=>a.id===id);if(!acc)return 0;let result=Number(acc.opening||0);
for(const t of db.transactions||[]){if(t.date>asOf)continue;if(t.type==="income"&&t.accountId===id)result+=t.amount;
if(t.type==="expense"&&t.accountId===id)result-=t.amount;
if(t.type==="investment"&&t.accountId===id)result-=t.amount;
if(t.type==="rescue"&&t.accountId===id)result+=t.amount;
if(t.type==="transfer"){if(t.accountId===id)result-=t.amount;if(t.toAccountId===id)result+=t.amount;}}
for(const bill of db.bills||[])if(bill.paidAt&&bill.paidAt<=asOf&&bill.accountId===id)result-=bill.amount;
for(const payment of db.invoicePayments||[])if(payment.date<=asOf&&payment.accountId===id)result-=payment.amount;
return result;
};
const stats=(db,m)=>{
const t=db.transactions.filter(x=>month(x.date)===m);
const income=total(t.filter(x=>x.type==="income").map(x=>x.amount));
const expenseTx=total(t.filter(x=>["expense","card"].includes(x.type)).map(x=>x.amount));
const billCost=total(db.bills.filter(b=>month(b.dueDate)===m).map(b=>b.amount));
const spent=expenseTx+billCost,contrib=total(t.filter(x=>x.type==="investment").map(x=>x.amount));
const rescued=total(t.filter(x=>x.type==="rescue").map(x=>x.amount));
const dueInvoices=total((db.cards||[]).flatMap(c=>invoices(db,c.id)).filter(i=>month(i.dueDate)===m).map(i=>i.charges));
const paidInvoices=total((db.invoicePayments||[]).filter(p=>month(p.date)===m).map(p=>p.amount));
const billsPaid=total((db.bills||[]).filter(b=>b.paidAt&&month(b.paidAt)===m).map(b=>b.amount));
const outgoingCash=total(t.filter(x=>["expense","investment"].includes(x.type)).map(x=>x.amount))+paidInvoices+billsPaid;
return {income,spent,expenseTx,billCost,result:income-spent,contrib,rescued,dueInvoices,paidInvoices,billsPaid,netCash:income+rescued-outgoingCash};
};
const categories=(db,m)=>{
const byId=new Map(db.categories.map(x=>[x.id,x.name]));const map=new Map();
for(const t of db.transactions.filter(x=>month(x.date)===m&&["expense","card"].includes(x.type))){const k=byId.get(t.categoryId)||"Sem categoria";map.set(k,(map.get(k)||0)+t.amount);}
for(const b of db.bills.filter(x=>month(x.dueDate)===m)){const k=byId.get(b.categoryId)||"Sem categoria";map.set(k,(map.get(k)||0)+b.amount);}
return [...map].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
};
const businessDays=(a,b)=>{if(b<=a)return 0;let n=0;const d=date(a),end=date(b);while(d<end){d.setDate(d.getDate()+1);if(d.getDay()!==0&&d.getDay()!==6)n++;}return n;};
const position=(db,investmentId,on=today(),dailyCdiPct=0.043)=>{
const inv=db.investments.find(x=>x.id===investmentId);if(!inv||inv.startDate>on)return {capital:0,estimated:0,result:0};
const r=Math.max(0,Number(dailyCdiPct)||0)/100*Math.max(0,Number(inv.cdiPercent)||100)/100;
let capital=Number(inv.opening||0),estimated=capital,last=inv.startDate;
const events=db.transactions.filter(t=>t.investmentId===investmentId&&["investment","rescue"].includes(t.type)&&t.date<=on&&t.date>=inv.startDate).sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
for(const event of events){estimated=Math.round(estimated*Math.pow(1+r,businessDays(last,event.date)));if(event.type==="investment"){estimated+=event.amount;capital+=event.amount;}else{estimated=Math.max(0,estimated-event.amount);capital=Math.max(0,capital-event.amount);}last=event.date;}
estimated=Math.round(estimated*Math.pow(1+r,businessDays(last,on)));
return {capital,estimated,result:estimated-capital};
};
const portfolio=(db,on=today(),dailyCdiPct=0.043)=>db.investments.map(i=>({...i,...position(db,i.id,on,dailyCdiPct)}));
const projection=(openingCents,monthlyCents,dailyPct,percentCDI,years)=>{
let v=Number(openingCents);const rate=Math.pow(1+(Number(dailyPct)/100)*(Number(percentCDI)/100),252/12)-1;
const timeline=[];for(let n=1;n<=years*12;n++){v=Math.round(v*(1+rate))+Number(monthlyCents);if(n%12===0)timeline.push({year:n/12,value:v});}return timeline;
};
const unique=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"demo-"+Math.random().toString(36).slice(2)+Date.now();
return {today,date,iso,month,monthLabel,safeDate,addDays,addMonths,recurring,toCents,fmt,invoiceDue,installments,total,invoice,invoices,accountBalance,stats,categories,businessDays,position,portfolio,projection,unique};
})();
