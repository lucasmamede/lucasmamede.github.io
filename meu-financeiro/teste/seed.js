window.FinanceDemoSeed = (function FinanceDemoSeed(R) {
 const m=R.today().slice(0,7)+"-01",d=(off,day)=>R.safeDate(Number(R.addMonths(m,off).slice(0,4)),Number(R.addMonths(m,off).slice(5,7)),day);
 const categories=[
 ["Alimentação","expense","#f39762"],["Mercado","expense","#9ad57b"],["Moradia","expense","#70befa"],["Transporte","expense","#c3a3fa"],["Saúde","expense","#f57d91"],["Educação","expense","#92a8f9"],["Lazer","expense","#f5b86b"],["Compras","expense","#da8dff"],["Assinaturas","expense","#65b9c3"],["Salário","income","#56dcaa"],["Freelance","income","#7aebc7"],["Outros","expense","#9fabc2"]
 ].map((x,i)=>({id:"cat-"+i,name:x[0],kind:x[1],color:x[2],archived:false}));
 const cat=name=>categories.find(c=>c.name===name).id;
 const accounts=[{id:"conta-1",name:"Conta principal",bank:"Banco demonstrativo",opening:1600000,color:"#7769f8"},{id:"conta-2",name:"Reserva diária",bank:"Conta digital",opening:250000,color:"#4baddb"},{id:"conta-3",name:"Carteira",bank:"Dinheiro",opening:60000,color:"#39d6a1"}];
 const cards=[{id:"cartao-1",name:"Cartão Platinum",bank:"Banco demonstrativo",limit:1200000,closingDay:27,dueDay:3,color:"#7769f8"},{id:"cartao-2",name:"Cartão Virtual",bank:"Conta digital",limit:500000,closingDay:10,dueDay:18,color:"#399ac2"}];
 const transactions=[];
 const add=(type,desc,amount,date,categoryId,accountId="conta-1",other={})=>transactions.push({id:R.unique(),type,desc,amount,categoryId,date,accountId,...other});
 [-2,-1,0].forEach(off=>{
   add("income","Salário",950000,d(off,5),cat("Salário"));
   add("income","Trabalho extra",off===0?310000:150000,d(off,10),cat("Freelance"));
   add("expense","Supermercado",off===0?86542:74860,d(off,9),cat("Mercado"));
   add("expense","Combustível",off===0?24000:20500,d(off,13),cat("Transporte"));
   add("expense","Restaurante",off===0?18990:12590,d(off,16),cat("Alimentação"));
   add("expense","Cinema e passeio",off===0?10500:8900,d(off,20),cat("Lazer"));
 });
 add("expense","Farmácia",7800,d(0,11),cat("Saúde"));
 add("expense","Livraria",9500,d(0,14),cat("Educação"));
 add("transfer","Transferência para reserva",70000,d(-1,21),null,"conta-1",{toAccountId:"conta-2"});
 function purchase(desc,amount,purchaseDate,cardId,n=1,current=1,categoryName="Compras"){
   const c=cards.find(x=>x.id===cardId),full=R.installments(amount,n,current),grp=R.unique();
   for(const part of full){const idx=part.number-current;const date=R.addMonths(purchaseDate,idx);add("card",desc,part.cents,date,cat(categoryName),null,{cardId,invoiceDue:R.invoiceDue(date,c.closingDay,c.dueDay),installmentNo:part.number,installmentTotal:n,groupId:grp,purchaseDate});}
 }
 purchase("Notebook",240000,d(-1,25),"cartao-1",4,1,"Compras");
 purchase("Fone bluetooth",45990,d(0,7),"cartao-2",1,1,"Compras");
 purchase("Mercado no cartão",22000,d(0,12),"cartao-1",1,1,"Mercado");
 const bills=[];const billSeries=[
 ["Aluguel",270000,10,"Moradia"],["Condomínio",83000,15,"Moradia"],["Energia elétrica",26800,19,"Moradia"],["Internet residencial",12990,22,"Moradia"],["Plano de saúde",52000,25,"Saúde"]
 ];
 for(const [name,amount,day,categoryName] of billSeries){const seriesId=R.unique();
   for(let off=-2;off<=5;off++){const dueDate=d(off,day),paidAt=off<0?R.addDays(dueDate,-1):null;bills.push({id:R.unique(),seriesId,seriesIndex:off+2,name,amount,dueDate,recurrence:"Mensal",categoryId:cat(categoryName),accountId:"conta-1",paidAt});}
 }
 bills.push({id:R.unique(),seriesId:null,seriesIndex:0,name:"IPVA (exemplo)",amount:195000,dueDate:d(1,25),recurrence:"Nenhuma",categoryId:cat("Transporte"),accountId:"conta-1",paidAt:null});
 const subscriptions=[
 {id:"sub-1",name:"Streaming de filmes",amount:4990,nextDate:d(0,23),recurrence:"Mensal",categoryId:cat("Assinaturas"),cardId:"cartao-2",accountId:null,status:"Ativa"},
 {id:"sub-2",name:"Música",amount:2190,nextDate:d(0,26),recurrence:"Mensal",categoryId:cat("Assinaturas"),cardId:"cartao-1",accountId:null,status:"Ativa"},
 {id:"sub-3",name:"Nuvem",amount:3490,nextDate:d(0,12),recurrence:"Mensal",categoryId:cat("Assinaturas"),cardId:null,accountId:"conta-1",status:"Ativa"},
 {id:"sub-4",name:"Academia",amount:15990,nextDate:d(1,3),recurrence:"Mensal",categoryId:cat("Saúde"),cardId:null,accountId:"conta-1",status:"Ativa"}
 ];
 const investments=[
 {id:"inv-1",name:"Tesouro Selic",institution:"Corretora Demo",opening:1250000,startDate:d(-3,1),cdiPercent:100,monthlyPlan:80000,risk:"Baixo"},
 {id:"inv-2",name:"CDB liquidez diária",institution:"Banco Demo",opening:800000,startDate:d(-3,1),cdiPercent:110,monthlyPlan:45000,risk:"Baixo"}
 ];
 add("investment","Aporte Tesouro Selic",150000,d(-1,4),cat("Outros"),"conta-1",{investmentId:"inv-1"});
 add("investment","Aporte Tesouro Selic",80000,d(0,18),cat("Outros"),"conta-1",{investmentId:"inv-1"});
 add("investment","Aporte futuro programado",125000,d(1,18),cat("Outros"),"conta-1",{investmentId:"inv-2"});
 const invoicePayments=[];
 const prev=R.invoices({transactions,cards,invoicePayments},cards[0].id).find(x=>x.dueDate<d(0,1)&&x.charges>0);
 if(prev)invoicePayments.push({id:R.unique(),cardId:cards[0].id,dueDate:prev.dueDate,date:prev.dueDate,amount:prev.charges,accountId:"conta-1"});
 return {version:1,createdAt:R.today(),categories,accounts,cards,transactions,bills,subscriptions,investments,invoicePayments,settings:{dailyCDIPct:0.043,CDIDate:null,cdiSource:"Referência didática; não é cotação confirmada",month:R.month(R.today())}};
});
