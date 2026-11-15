window.FinanceLabViews = (function FinanceLabViews(R){
"use strict";
const h=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=R.fmt,dt=s=>s?new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(R.date(s)):"—";
const byId=(a,id)=>a.find(x=>x.id===id);
const cName=(db,id)=>byId(db.categories,id)?.name||"Sem categoria";
const acct=(db,id)=>byId(db.accounts,id)?.name||"Conta não selecionada";
const card=(db,id)=>byId(db.cards,id)?.name||"Cartão não selecionado";
const type={income:"Receita",expense:"Despesa",card:"Cartão",transfer:"Transferência",investment:"Aporte",rescue:"Resgate"};
const ic={income:"↗",expense:"↘",card:"▰",transfer:"⇄",investment:"◈",rescue:"↖",bill:"⌂",subscription:"⟳"};
const klass={income:"green",expense:"red",card:"red",transfer:"cyan",investment:"amber",rescue:"green"};
const empty=message=>`<div class="empty">${h(message)}</div>`;
const intro=(title,desc,actions="")=>`<div class="page-intro"><div><h2>${h(title)}</h2><p>${h(desc)}</p></div><div class="flex">${actions}</div></div>`;
const period=(m)=>`<div class="period-bar"><div><span class="eyebrow">COMPETÊNCIA SELECIONADA</span><strong>${h(R.monthLabel(m))}</strong></div><div class="period-controls"><button class="icon-button" data-action="prevMonth" title="Mês anterior">‹</button><input class="control" aria-label="Escolher mês" id="periodPicker" type="month" value="${h(m)}"><button class="icon-button" data-action="nextMonth" title="Próximo mês">›</button><button class="soft-btn" data-action="nowMonth">Hoje</button></div></div>`;
const kpi=(label,amount,icon,hint,color="",extra="")=>`<article class="kpi ${extra}"><div class="kicon">${icon}</div><small>${h(label)}</small><strong class="${color}">${amount}</strong><span class="hint">${h(hint)}</span></article>`;
const mini=(title,value)=>`<div class="stat-line"><small>${h(title)}</small><strong>${value}</strong></div>`;
const label=(v)=>String(v||"").replace(/^\w/,m=>m.toUpperCase());
const cardTotals=(db,c)=>R.invoices(db,c.id);
const renderBars=(items)=>{if(!items.length)return empty("Sem valores nesta competência.");const max=Math.max(1,...items.map(x=>x.value));return items.slice(0,8).map((x,i)=>`<div class="bar-row"><div class="bar-label"><span>${h(x.name)}</span><strong>${money(x.value)}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(x.value/max*100)}%;background:${["#8170f8","#52cca6","#76b5fa","#ffcb72","#e38cbb","#6fc9c9"][i%6]}"></div></div></div>`).join("");};
const feedRow=(icon,name,small,value,cls="",action="")=>`<div class="feed-row" ${action?`style="cursor:pointer" ${action}`:""}><div class="feed-icon">${h(icon)}</div><div class="feed-main"><strong>${h(name)}</strong><small>${h(small)}</small></div><div class="feed-right"><strong class="${cls}">${value}</strong></div></div>`;
function dashboard(db,s){
 const m=s.month,d=R.stats(db,m),last=R.stats(db,R.month(R.addMonths(m+"-01",-1))),cash=R.total(db.accounts.map(a=>R.accountBalance(db,a.id))),portfolio=R.portfolio(db,R.today(),db.settings.dailyCDIPct);
 const inv=R.total(portfolio.map(i=>i.estimated)),categories=R.categories(db,m);
 const upcoming=[
 ...db.bills.filter(x=>!x.paidAt&&x.dueDate>=R.today()).map(x=>({id:x.id,date:x.dueDate,name:x.name,amount:x.amount,kind:"bill"})),
 ...db.subscriptions.filter(x=>x.status==="Ativa"&&x.nextDate>=R.today()).map(x=>({id:x.id,date:x.nextDate,name:x.name,amount:x.amount,kind:"subscription"})),
 ...db.cards.flatMap(c=>cardTotals(db,c).filter(x=>x.pending>0&&x.dueDate>=R.today()).map(x=>({id:c.id,date:x.dueDate,name:"Fatura "+c.name,amount:x.pending,kind:"invoice"})))
 ].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);
 const months=Array.from({length:6},(_,i)=>R.month(R.addMonths(m+"-01",i-5))),monthly=months.map(month=>R.stats(db,month)),max=Math.max(1,...monthly.flatMap(x=>[x.income,x.spent]));
 const chart=`<div class="line-chart">${monthly.map((p,i)=>`<div class="col"><div class="col-bars"><div class="bar rev" style="height:${Math.max(3,Math.round(p.income/max*130))}px" title="Receitas ${money(p.income)}"></div><div class="bar spend" style="height:${Math.max(3,Math.round(p.spent/max*130))}px" title="Despesas ${money(p.spent)}"></div></div><label>${h(months[i].slice(5))}/${h(months[i].slice(2,4))}</label></div>`).join("")}</div><div class="legend"><span>Receitas</span><span>Despesas</span></div>`;
 const compare=last.spent>0?((d.spent/last.spent-1)*100).toFixed(1)+"%":null;
 const recent=db.transactions.filter(t=>R.month(t.date)===m).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 return period(m)+`<div class="grid-4 mb">
 ${kpi("Resultado do mês",money(d.result),"⇄","Receitas − despesas de consumo",d.result>=0?"green":"red","highlight")}
 ${kpi("Receitas do mês",money(d.income),"↗","Lançamentos por competência","green")}
 ${kpi("Gastos do mês",money(d.spent),"↘",compare?compare+" em relação ao mês anterior":"Inclui parcelas e contas","red")}
 ${kpi("Saldo de caixa atual",money(cash),"▤","Dinheiro nas contas, sem investimentos","cyan")}
 </div>
 <div class="grid-3 mb">
 ${kpi("Faturas do mês",money(d.dueInvoices),"▰","Pelo vencimento; não é gasto extra","amber")}
 ${kpi("Investimentos",money(inv),"◈","Saldo projetado, não confirmado","")}
 ${kpi("Aportes do mês",money(d.contrib),"↗","Saída do caixa, não é consumo","")}
 </div>
 <div class="insight-box"><span class="icon">✧</span><div><small>ANÁLISE DA COMPETÊNCIA</small><strong>${categories.length?`Maior categoria: ${h(categories[0].name)} (${money(categories[0].value)}).`:"Cadastre movimentações para visualizar tendências."} ${compare?`Gastos ${Number(compare)>0?"subiram":"caíram"} ${Math.abs(Number(compare)).toFixed(1)}% em relação ao mês anterior.`:""}</strong></div></div>
 <div class="dashboard-bottom mb"><section class="panel"><div class="panel-head"><div><small class="eyebrow">EVOLUÇÃO</small><h3>Receitas e despesas</h3></div><span class="pill">6 meses</span></div>${chart}</section>
 <section class="panel"><div class="panel-head"><div><small class="eyebrow">DISTRIBUIÇÃO</small><h3>Gastos por categoria</h3></div><button class="ghost-btn" data-nav="movements">Detalhar →</button></div>${renderBars(categories)}</section></div>
 <div class="dashboard-bottom"><section class="panel"><div class="panel-head"><div><small class="eyebrow">ACOMPANHAMENTO</small><h3>Próximos compromissos</h3></div><button class="ghost-btn" data-nav="calendar">Calendário →</button></div><div class="feed">${upcoming.length?upcoming.map(x=>feedRow(ic[x.kind],x.name,dt(x.date),money(x.amount),"amber",`data-detail="${x.kind}" data-id="${h(x.id)}" data-date="${h(x.date)}"`)).join(""):empty("Nenhum vencimento próximo.")}</div></section>
 <section class="panel"><div class="panel-head"><div><small class="eyebrow">MOVIMENTAÇÃO</small><h3>Últimos lançamentos</h3></div><button class="ghost-btn" data-nav="movements">Ver todos →</button></div><div class="feed">${recent.length?recent.map(t=>feedRow(ic[t.type],t.desc,dt(t.date)+" · "+(type[t.type]||""),money(t.amount),klass[t.type]||"",`data-detail="transaction" data-id="${h(t.id)}"`)).join(""):empty("Nenhuma movimentação nesta competência.")}</div></section></div>`;
}
function movementRows(db,s){
 const text=String(s.search||"").toLocaleLowerCase("pt-BR").trim(),which=s.filterType||"all",cat=s.filterCategory||"all";
 const tx=db.transactions.filter(t=>R.month(t.date)===s.month&&(which==="all"||which===t.type)&&(cat==="all"||t.categoryId===cat)&&(!text||(t.desc+" "+cName(db,t.categoryId)).toLocaleLowerCase("pt-BR").includes(text)));
 const bills=(which==="all"||which==="bill")?db.bills.filter(b=>R.month(b.dueDate)===s.month&&(cat==="all"||b.categoryId===cat)&&(!text||(b.name+" "+cName(db,b.categoryId)).toLowerCase().includes(text))).map(b=>({...b,type:"bill",desc:b.name,date:b.dueDate})):[];
 const rows=[...tx,...bills].sort((a,b)=>b.date.localeCompare(a.date)||String(a.desc).localeCompare(String(b.desc)));
 if(!rows.length)return empty("Nenhum lançamento encontrado para esses filtros.");
 return `<div class="table-wrap"><table class="data-table"><thead><tr><th><input type="checkbox" data-select-all aria-label="Selecionar lançamentos"></th><th>Descrição</th><th>Data</th><th>Tipo</th><th>Categoria</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${t.type==="bill"?"":`<input type="checkbox" data-select-tx="${h(t.id)}" ${s.selected.has(t.id)?"checked":""} aria-label="Selecionar lançamento">`}</td><td><div class="table-name"><strong>${h(t.desc)}</strong><small>${t.type==="bill"?(t.paidAt?"Pago":"Pendente"):t.type==="card"?`${card(db,t.cardId)} · ${t.installmentNo||1}/${t.installmentTotal||1}`:t.type==="transfer"?`Para ${acct(db,t.toAccountId)}`:acct(db,t.accountId)}</small></div></td><td>${dt(t.date)}</td><td><span class="pill ${t.type==="income"||t.type==="rescue"?"success":t.type==="bill"&&!t.paidAt?"warning":""}">${h(type[t.type]||"Conta")}</span></td><td>${h(cName(db,t.categoryId))}</td><td class="${klass[t.type]||"amber"}"><strong>${money(t.amount)}</strong></td><td><div class="row-actions"><button class="ghost-btn" data-detail="${t.type==="bill"?"bill":"transaction"}" data-id="${h(t.id)}">Abrir</button><button class="ghost-btn" data-edit="${t.type==="bill"?"bill":"transaction"}" data-id="${h(t.id)}">Editar</button></div></td></tr>`).join("")}</tbody></table></div>`;
}
function movements(db,s){
 const st=R.stats(db,s.month);
 return intro("Lançamentos do mês","Edite, pesquise, categorizar em lote e confira a competência sem duplicidades.",`<button class="primary-btn" data-add="expense">＋ Adicionar</button>`)+period(s.month)+`<div class="grid-4 mb">
 ${kpi("Receitas",money(st.income),"↗","Entradas registradas","green")}
 ${kpi("Despesas e cartão",money(st.expenseTx),"↘","Valor de consumo por parcela","red")}
 ${kpi("Contas previstas",money(st.billCost),"⌂","Pelo vencimento","amber")}
 ${kpi("Aportes",money(st.contrib),"◈","Transferidos a investimentos")}
 </div>
 <section class="panel"><div class="toolbar"><div class="field search"><label for="movementSearch">Buscar</label><input id="movementSearch" placeholder="Descrição ou categoria..." value="${h(s.search||"")}"></div>
 <div class="field"><label for="kindFilter">Tipo</label><select id="kindFilter">${[["all","Todos"],["income","Receitas"],["expense","Despesas"],["card","Cartão"],["bill","Contas"],["transfer","Transferências"],["investment","Aportes"],["rescue","Resgates"]].map(x=>`<option value="${x[0]}" ${x[0]===s.filterType?"selected":""}>${x[1]}</option>`).join("")}</select></div>
 <div class="field"><label for="categoryFilter">Categoria</label><select id="categoryFilter"><option value="all">Todas</option>${db.categories.map(c=>`<option value="${h(c.id)}" ${s.filterCategory===c.id?"selected":""}>${h(c.name)}</option>`).join("")}</select></div></div>
 <div id="bulkActions" class="flex mb">${s.selected.size?`<span class="pill purple">${s.selected.size} selecionado(s)</span><button class="soft-btn" data-action="bulkCategory">Mudar categoria</button><button class="ghost-btn" data-action="clearSelection">Limpar seleção</button>`:`<span class="note">Marque registros na primeira coluna para aplicar categorias em lote.</span>`}</div>
 <div id="movementRows">${movementRows(db,s)}</div></section>`;
}
function accounts(db,s){
 const today=R.today(),balance=R.total(db.accounts.map(a=>R.accountBalance(db,a.id,today)));
 const a=db.accounts.find(x=>x.id===s.selectedAccount)||db.accounts[0];
 const operations=db.transactions.filter(t=>t.accountId===a?.id||t.toAccountId===a?.id).sort((x,y)=>y.date.localeCompare(x.date)).slice(0,12);
 return intro("Suas contas","Acompanhe o saldo real demonstrativo, transferências e movimentações de cada conta.",`<button class="primary-btn" data-create="account">＋ Nova conta</button>`)+
 `<div class="grid-2 mb">${kpi("Saldo consolidado",money(balance),"▤","Saldo das contas, após pagamentos registrados","cyan")}${kpi("Total de contas",String(db.accounts.length),"⇄","Instituições e carteiras cadastradas")}</div>
 <div class="card-grid mb">${db.accounts.map(x=>`<article class="account-card" style="border-top:3px solid ${/^#[0-9a-f]{6}$/i.test(x.color)?x.color:"#8474ff"}"><div class="card-head"><div><strong>${h(x.name)}</strong><small>${h(x.bank)}</small></div><div class="mini-actions"><button data-edit="account" data-id="${h(x.id)}" aria-label="Editar conta">✎</button></div></div><div class="amount">${money(R.accountBalance(db,x.id,today))}</div><div class="bottom"><span>Saldo atualizado</span><button class="ghost-btn" data-action="selectAccount" data-id="${h(x.id)}">Detalhes →</button></div></article>`).join("")}</div>
 <div class="panel"><div class="panel-head"><div><small class="eyebrow">EXTRATO</small><h3>${h(a?.name||"Conta")}</h3></div><button class="soft-btn" data-add="transfer">⇄ Transferir</button></div>
 <div class="feed">${operations.length?operations.map(t=>feedRow(ic[t.type]||"⇄",t.desc,dt(t.date)+" · "+(type[t.type]||""),money(t.amount),klass[t.type],`data-detail="transaction" data-id="${h(t.id)}"`)).join(""):empty("Nenhuma movimentação registrada nesta conta.")}</div>
 <p class="note mt">Saldo = saldo inicial + receitas − saídas efetivas. Compras no cartão só saem do caixa quando a fatura é paga.</p></div>`;
}
function cards(db,s){
 const c=byId(db.cards,s.selectedCard)||db.cards[0];
 const invoiceRows=c?cardTotals(db,c):[];
 const used=c?R.total(invoiceRows.map(x=>x.pending)):0;
 const upcoming=invoiceRows.filter(x=>x.pending>0).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 return intro("Seus cartões","Faturas, limites e parcelas: pagar uma fatura reduz o caixa, não duplica a despesa.",`<button class="primary-btn" data-create="card">＋ Novo cartão</button>`)+
 `<div class="card-grid mb">${db.cards.map(x=>{const invoices=cardTotals(db,x),amount=R.total(invoices.map(i=>i.pending));return `<article class="finance-card" style="border-top:3px solid ${/^#[0-9a-f]{6}$/i.test(x.color)?x.color:"#8170ff"}"><div class="card-head"><div><strong>${h(x.name)}</strong><small>${h(x.bank)}</small></div><div class="mini-actions"><button data-edit="card" data-id="${h(x.id)}" aria-label="Editar cartão">✎</button></div></div><div class="amount">${money(amount)}</div><div class="bottom"><span>Utilizado · Limite ${money(x.limit)}</span><button class="ghost-btn" data-action="selectCard" data-id="${h(x.id)}">Faturas →</button></div><div class="progress-track mt"><div class="progress-fill" style="width:${Math.min(100,Math.max(0,amount/x.limit*100))}%"></div></div></article>`;}).join("")}</div>
 ${c?`<div class="grid-3 mb">${kpi("Limite total",money(c.limit),"▰",c.name)}${kpi("Em aberto",money(used),"↘","Todas as faturas pendentes","amber")}${kpi("Limite disponível",money(c.limit-used),"↗","Estimativa do limite livre","green")}</div>
 <section class="panel"><div class="panel-head"><div><small class="eyebrow">FATURAS — ${h(c.name.toUpperCase())}</small><h3>Fechamento dia ${c.closingDay} · Vencimento dia ${c.dueDay}</h3></div><button class="soft-btn" data-add="card">＋ Compra no cartão</button></div>
 ${invoiceRows.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Vencimento</th><th>Compras/parcelas</th><th>Pago</th><th>Em aberto</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${invoiceRows.map(i=>`<tr><td>${dt(i.dueDate)}</td><td>${money(i.charges)}</td><td class="green">${money(i.paid)}</td><td><strong>${money(i.pending)}</strong></td><td><span class="pill ${i.pending<=0?"success":i.dueDate<R.today()?"danger":"warning"}">${i.pending<=0?"Quitada":i.dueDate<R.today()?"Atrasada":"A pagar"}</span></td><td><button class="ghost-btn" data-detail="invoice" data-id="${h(c.id)}" data-date="${h(i.dueDate)}">Detalhes</button>${i.pending>0?` <button class="soft-btn" data-action="payInvoice" data-id="${h(c.id)}" data-date="${h(i.dueDate)}">Pagar</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:empty("Nenhuma fatura lançada para este cartão.")}
 <p class="note mt">As compras são contabilizadas nas competências das parcelas; os pagamentos são transferências de caixa. Nenhuma compra é somada novamente ao consumo ao pagar.</p></section>`:empty("Cadastre um cartão para começar.")}`;
}
function calendarEvents(db,m){
 const events=[];
 for(const b of db.bills.filter(x=>R.month(x.dueDate)===m))events.push({day:b.dueDate,label:b.name,amount:b.amount,kind:b.paidAt?"paid":b.dueDate<R.today()?"overdue":"bill",detail:"bill",id:b.id,date:b.dueDate});
 for(const sub of db.subscriptions.filter(x=>x.status==="Ativa"&&R.month(x.nextDate)===m))events.push({day:sub.nextDate,label:sub.name,amount:sub.amount,kind:"subscription",detail:"subscription",id:sub.id,date:sub.nextDate});
 for(const c of db.cards)for(const inv of cardTotals(db,c).filter(x=>R.month(x.dueDate)===m&&x.pending>0))events.push({day:inv.dueDate,label:"Fatura "+c.name,amount:inv.pending,kind:"invoice",detail:"invoice",id:c.id,date:inv.dueDate});
 for(const t of db.transactions.filter(x=>R.month(x.date)===m))events.push({day:t.date,label:t.desc,amount:t.amount,kind:t.type==="income"?"paid":"",detail:"transaction",id:t.id,date:t.date});
 return events.sort((a,b)=>a.day.localeCompare(b.day)||a.label.localeCompare(b.label));
}
function calendar(db,s){
 const m=s.month,first=R.date(m+"-01"),offset=first.getDay(),days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate(),events=calendarEvents(db,m),cells=[];
 for(let i=0;i<Math.ceil((offset+days)/7)*7;i++){
 const n=i-offset+1,inside=n>=1&&n<=days,date=inside?R.safeDate(first.getFullYear(),first.getMonth()+1,n):"";
 const daily=events.filter(x=>x.day===date);
 cells.push(`<div class="calendar-day ${!inside?"outside":date===R.today()?"today":""}"><span class="day-number">${inside?n:""}</span>${daily.slice(0,3).map(x=>`<button class="calendar-event ${x.kind}" title="${h(x.label)} ${money(x.amount)}" data-detail="${h(x.detail)}" data-id="${h(x.id)}" data-date="${h(x.date)}">${h(x.label)} ${money(x.amount)}</button>`).join("")}${daily.length>3?`<div class="tiny muted">+${daily.length-3} evento(s)</div>`:""}</div>`);
 }
 return intro("Calendário financeiro","Pague contas, confira faturas e edite registros diretamente pelos eventos.",`<button class="primary-btn" data-create="bill">＋ Nova conta a pagar</button>`)+period(m)+
 `<div class="panel mb"><div class="flex mb"><span class="pill success">● Pago</span><span class="pill warning">● Pendente</span><span class="pill danger">● Atrasado</span><span class="pill purple">● Fatura</span><span class="pill">● Assinatura</span></div>
 <div class="calendar-weekday">${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=>`<div>${d}</div>`).join("")}</div><div class="calendar-days">${cells.join("")}</div></div>
 <section class="panel cal-mobile-list"><div class="panel-head"><h3>Eventos do mês</h3><span class="pill">${events.length}</span></div><div class="feed">${events.length?events.map(x=>feedRow("▦",x.label,dt(x.day),money(x.amount),"",`data-detail="${h(x.detail)}" data-id="${h(x.id)}" data-date="${h(x.date)}"`)).join(""):empty("Sem eventos.")}</div></section>`;
}
function subMonthly(s){const f={Semanal:52/12,Mensal:1,Bimestral:.5,Trimestral:1/3,Semestral:1/6,Anual:1/12};return s.amount*(f[s.recurrence]??1);}
function subscriptions(db){
 const active=db.subscriptions.filter(s=>s.status==="Ativa"),monthly=Math.round(R.total(active.map(subMonthly)));
 return intro("Assinaturas","Serviços recorrentes e cobranças planejadas, sem lançar gasto antes da confirmação.",`<button class="primary-btn" data-create="subscription">＋ Nova assinatura</button>`)+
 `<div class="grid-3 mb">${kpi("Custo mensal equivalente",money(monthly),"⟳","Assinaturas ativas","amber")}${kpi("Projeção anual",money(monthly*12),"▦","Caso nada mude")}${kpi("Assinaturas ativas",String(active.length),"◈","Serviços cadastrados","green")}</div>
 <section class="panel"><div class="panel-head"><h3>Seus serviços</h3><span class="pill">${db.subscriptions.length} cadastrados</span></div>
 <div class="table-wrap"><table class="data-table"><thead><tr><th>Serviço</th><th>Cobrança</th><th>Próxima data</th><th>Origem</th><th>Status</th><th>Ações</th></tr></thead><tbody>${db.subscriptions.map(s=>`<tr><td><div class="table-name"><strong>${h(s.name)}</strong><small>${h(s.recurrence)}</small></div></td><td>${money(s.amount)}</td><td>${dt(s.nextDate)}</td><td>${h(s.cardId?card(db,s.cardId):acct(db,s.accountId))}</td><td><span class="pill ${s.status==="Ativa"?"success":s.status==="Pausada"?"warning":"danger"}">${h(s.status)}</span></td><td><div class="row-actions"><button class="ghost-btn" data-edit="subscription" data-id="${h(s.id)}">Editar</button><button class="ghost-btn" data-action="toggleSubscription" data-id="${h(s.id)}">${s.status==="Ativa"?"Pausar":"Ativar"}</button>${s.status==="Ativa"?`<button class="soft-btn" data-action="chargeSubscription" data-id="${h(s.id)}">Registrar cobrança</button>`:""}</div></td></tr>`).join("")}</tbody></table></div>
 <p class="note mt">Cobranças previstas não entram como despesa realizada até serem registradas. Ao registrar, a próxima data é atualizada automaticamente.</p></section>`;
}
function investments(db,s){
 const date=s.positionDate||R.today(),portfolio=R.portfolio(db,date,db.settings.dailyCDIPct);
 const capital=R.total(portfolio.map(p=>p.capital)),estimated=R.total(portfolio.map(p=>p.estimated)),result=estimated-capital;
 const plan=R.total(db.investments.map(i=>i.monthlyPlan||0)),daily=Number(db.settings.dailyCDIPct)||0.043;
 const horizon=Number(s.projectionYears||5),pct=Number(s.projectionPct??100),aporte=Math.round(Number(s.projectionContribution??plan/100)*100);
 const series=R.projection(estimated,aporte,daily,pct,horizon);
 const max=Math.max(1,...series.map(x=>x.value)),chart=series.length?`<div class="line-chart">${series.map(x=>`<div class="col"><div class="col-bars"><div class="bar rev" style="height:${Math.max(3,Math.round(x.value/max*130))}px" title="${money(x.value)}"></div></div><label>${x.year}º ano</label></div>`).join("")}</div>`:"";
 const source=db.settings.CDIDate?`CDI diário em ${db.settings.CDIDate} · Banco Central`:"CDI ilustrativo, ainda não consultado no Banco Central";
 return intro("Carteira de investimentos","Posição por data, aportes futuros e simulação estimada com percentual do CDI.",`<button class="primary-btn" data-create="investment">＋ Novo investimento</button>`)+
 `<div class="grid-4 mb">${kpi("Patrimônio estimado",money(estimated),"◈","Não equivale a saldo confirmado")}${kpi("Capital aplicado",money(capital),"↗","Aportes até a data selecionada")}${kpi("Rendimento estimado",money(result),"≈","Modelo simplificado, antes de impostos",result>=0?"green":"red")}${kpi("Aportes planejados",money(plan),"▦","Valor mensal cadastrado")}</div>
 <div class="panel mb"><div class="panel-head"><div><small class="eyebrow">POSIÇÃO NO TEMPO</small><h3>Data de referência</h3></div><div class="flex"><input class="control" type="date" id="positionDate" value="${h(date)}" style="width:auto"><button class="soft-btn" data-action="updateCdi">Atualizar CDI</button></div></div><p class="note">Taxa diária utilizada: ${daily.toFixed(4)}% · ${h(source)}. Projeção considera dias úteis, sem IR, IOF ou tarifas; não representa extrato bancário.</p></div>
 <div class="card-grid mb">${portfolio.map(i=>`<article class="account-card"><div class="card-head"><div><strong>${h(i.name)}</strong><small>${h(i.institution)} · ${i.cdiPercent}% do CDI</small></div><div class="mini-actions"><button data-edit="investment" data-id="${h(i.id)}" aria-label="Editar investimento">✎</button></div></div><div class="amount">${money(i.estimated)}</div><div class="bottom"><span>Aplicado: ${money(i.capital)}</span><span class="${i.result>=0?"green":"red"}">${money(i.result)}</span></div><div class="flex mt"><button class="soft-btn" data-add="investment" data-id="${h(i.id)}">＋ Aportar</button><button class="ghost-btn" data-add="rescue" data-id="${h(i.id)}">Resgatar</button></div></article>`).join("")}</div>
 <section class="panel"><div class="panel-head"><div><small class="eyebrow">SIMULADOR</small><h3>Quanto sua carteira pode crescer?</h3></div><span class="pill purple">Estimativa</span></div>
 <div class="grid-3 mb"><div class="field"><label>Aporte por mês (R$)</label><input id="projectionContribution" type="number" min="0" step=".01" value="${Math.max(0,Number(s.projectionContribution??plan/100))}"></div><div class="field"><label>% do CDI</label><input id="projectionPct" type="number" min="0" max="500" value="${pct}"></div><div class="field"><label>Período (anos)</label><select id="projectionYears">${[1,3,5,10].map(x=>`<option value="${x}" ${x===horizon?"selected":""}>${x} ${x===1?"ano":"anos"}</option>`).join("")}</select></div></div>
 <div id="projectionChart">${chart}</div><div class="grid-3 mt">${series.length?`${mini("Posição inicial",money(estimated))}${mini("Aportes projetados",money(aporte*horizon*12))}${mini("Patrimônio simulado",money(series[series.length-1].value))}`:""}</div>
 <p class="note mt">CDI futuro é hipotético e constante; resultados não são garantidos. Aportes programados existentes só entram na posição a partir da data lançada.</p></section>`;
}
function settings(db){
 return intro("Configurações","Organize categorias e experimente o laboratório com segurança.","")+
 `<div class="grid-2"><section class="panel"><div class="panel-head"><div><small class="eyebrow">PERSONALIZAÇÃO</small><h3>Minhas categorias</h3></div><button class="primary-btn" data-create="category">＋ Nova categoria</button></div>
 <div class="feed">${db.categories.length?db.categories.slice().sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")).map(c=>`<div class="category-row"><span class="dot" style="background:${/^#[0-9a-f]{6}$/i.test(c.color)?c.color:"#8170ff"}"></span><div class="detail"><strong>${h(c.name)} ${c.archived?"(inativa)":""}</strong><small>${c.kind==="income"?"Receita":c.kind==="investment"?"Investimento":"Despesa"}</small></div><button class="ghost-btn" data-edit="category" data-id="${h(c.id)}">Editar</button><button class="ghost-btn" data-action="archiveCategory" data-id="${h(c.id)}">${c.archived?"Reativar":"Desativar"}</button></div>`).join(""):empty("Nenhuma categoria")}</div></section>
 <div class="feed"><section class="panel"><div class="panel-head"><div><small class="eyebrow">SEGURANÇA</small><h3>Ambiente isolado</h3></div><span class="pill success">Local</span></div><p class="muted">Nenhuma requisição para sua base Supabase e nenhum login. Dados fictícios armazenados exclusivamente neste navegador por uma chave própria.</p><div class="hint-panel">Produção: <a href="../" target="_blank" rel="noopener noreferrer">abrir aplicação original ↗</a><br>Laboratório: somente nesta pasta <code>/teste/</code></div></section>
 <section class="panel"><div class="panel-head"><h3>Backup demonstrativo</h3></div><p class="muted">Exporte ou importe apenas registros da demonstração, sem afetar o banco real.</p><div class="flex"><button class="soft-btn" data-action="export">↓ Exportar JSON</button><label class="soft-btn" style="cursor:pointer">↑ Importar JSON<input id="importDemo" type="file" accept=".json,application/json" style="display:none"></label></div></section>
 <section class="panel"><div class="panel-head"><h3>Testes e restauração</h3></div><p class="muted">Execute os testes das regras financeiras ou restaure os exemplos originais.</p><div class="flex"><button class="soft-btn" data-action="runTests">✓ Executar testes</button><button class="danger-btn" data-action="reset">↻ Reiniciar demonstração</button></div><div id="testResults" class="mt"></div></section>
 </div></div>`;
}
return {h,money,dt,cName,acct,card,type,ic,klass,empty,period,feedRow,movementRows,dashboard,movements,accounts,cards,calendar,subscriptions,investments,settings};
});
