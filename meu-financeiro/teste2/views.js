window.FinanceStudioViews = (function FinanceStudioViews(R){
"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=R.fmt;
const date=s=>{if(!s)return"—";try{return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(R.date(s));}catch{return esc(s);}};
const name=(d,id)=>d?.find(x=>x.id===id)?.name||"Não informado";
const cat=(db,id)=>name(db.categories,id)==="Não informado"?"Sem categoria":name(db.categories,id);
const account=(db,id)=>name(db.accounts,id);
const card=(db,id)=>name(db.cards,id);
const kindNames={income:"Receita",expense:"Despesa",card:"Compra no cartão",transfer:"Transferência",investment:"Aporte",rescue:"Resgate"};
const kindIcons={income:"↗",expense:"↙",card:"▣",transfer:"⇄",investment:"↗",rescue:"↙"};
const kindColors={income:"green",expense:"red",card:"red",transfer:"blue",investment:"yellow",rescue:"green"};
const empty=s=>`<div class="empty">${esc(s)}</div>`;
const dayOfMonth=(s)=>Number(String(s).slice(8,10));
const currencyInput=c=>(Number(c||0)/100).toFixed(2);
const monthControls=(m)=>`<div class="period-select"><button data-act="prevMonth" title="Mês anterior">‹</button><input id="activeMonth" type="month" aria-label="Competência" value="${esc(m)}"><button data-act="nextMonth" title="Próximo mês">›</button></div>`;
const heading=(title,subtitle,actions="",eyebrow="SEU CONTROLE FINANCEIRO")=>`<div class="view-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:""}</div><div class="view-actions">${actions}</div></div>`;
const section=(title,subtitle,link="")=>`<div class="section-title"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:""}</div>${link}</div>`;
const labelButton=(label,page)=>`<button type="button" class="text-link" data-page="${page}">${esc(label)} →</button>`;
const typeGlyph=(t)=>kindIcons[t]||"•";
const listEntry=(icon,desc,sub,value,cls,action,button="↗")=>`<div class="entry"><div class="entry-icon ${cls||""}">${icon}</div><div class="entry-label"><b>${esc(desc)}</b><small>${esc(sub)}</small></div><div class="entry-amount ${cls==="red"?"negative":cls==="green"?"positive":""}"><b>${value}</b></div>${action?`<button class="flat-action" type="button" ${action}>${esc(button)}</button>`:""}</div>`;
const periodRows=(db,m)=>{
 const arr=[];
 for(const t of db.transactions.filter(t=>R.month(t.date)===m))arr.push({...t,_kind:"tx",_date:t.date});
 for(const b of db.bills.filter(b=>R.month(b.dueDate)===m))arr.push({...b,_kind:"bill",_date:b.dueDate});
 return arr.sort((a,b)=>b._date.localeCompare(a._date));
};
function nextCommitments(db){
 const rows=[];
 for(const b of db.bills.filter(x=>!x.paidAt))rows.push({id:b.id,date:b.dueDate,amount:b.amount,desc:b.name,type:"bill",status:b.dueDate<R.today()?"late":"pending",sub:"Conta a pagar"});
 for(const c of db.cards)for(const i of R.invoices(db,c.id).filter(x=>x.pending>0))rows.push({id:c.id,date:i.dueDate,amount:i.pending,desc:"Fatura • "+c.name,type:"invoice",status:i.dueDate<R.today()?"late":"pending",sub:"Cartão de crédito"});
 for(const s of db.subscriptions.filter(x=>x.status==="Ativa"))rows.push({id:s.id,date:s.nextDate,amount:s.amount,desc:s.name,type:"subscription",status:"forecast",sub:"Assinatura prevista"});
 return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.desc.localeCompare(b.desc));
}
function nextVisible(db,count=6){const now=R.today();return nextCommitments(db).filter(x=>x.date>=R.addMonths(now,-1)&&x.date<=R.addMonths(now,2)).slice(0,count);}
function home(db,s){
 const m=s.month,stats=R.stats(db,m),today=R.today();
 const cash=R.total(db.accounts.map(a=>R.accountBalance(db,a.id,today)));
 const patr=R.total(R.portfolio(db,today,db.settings.dailyCDIPct).map(i=>i.estimated));
 const cost=R.categories(db,m),next=nextVisible(db,6);
 const last=R.stats(db,R.month(R.addMonths(m+"-01",-1)));
 const change=last.spent>0?Math.round((stats.spent-last.spent)/last.spent*100):null;
 const ratio=stats.income>0?Math.max(0,Math.min(100,Math.round((stats.income-stats.spent)/stats.income*100))):0;
 return heading("Seu dinheiro, em ordem.","Uma visão rápida do que importa — sem excesso de informações.",monthControls(m),"VISÃO GERAL")+
 `<section class="stage">
 <div class="balance-hero">
  <div class="hero-eyebrow">DISPONÍVEL NAS SUAS CONTAS HOJE</div>
  <div class="hero-value">${money(cash)}</div>
  <div class="hero-caption">Saldo das contas, considerando pagamentos e transferências registradas.</div>
  <div class="hero-actions"><button class="hero-button" data-create="transaction">＋ Novo lançamento</button><button class="hero-button secondary" data-page="accounts">Ver minhas contas ↗</button></div>
  <div class="hero-foot">Seu dinheiro em primeiro lugar</div>
 </div>
 <aside class="overview-side">
   <div class="eyebrow">RESUMO DA COMPETÊNCIA</div><h3>${esc(R.monthLabel(m))}</h3>
   <div class="health-indicator"><div class="health-ring" style="--percent:${ratio}%"><div class="health-ring-inner">${ratio}%</div></div><div class="health-info"><strong>${ratio>=35?"Mês com boa folga":ratio>0?"Mês com pouca folga":"Atenção ao orçamento"}</strong><small>Parcela da receita que sobra após os gastos previstos nesta competência.</small></div></div>
   <hr class="mini-separator">
   <div class="metric-row"><span>Resultado do mês</span><strong class="${stats.result>=0?"positive":"negative"}">${money(stats.result)}</strong></div>
   <div class="metric-row"><span>Patrimônio investido*</span><strong>${money(patr)}</strong></div>
   <div class="metric-row"><span>Faturas com vencimento</span><strong>${money(stats.dueInvoices)}</strong></div>
   <div class="metric-row"><span>Compromissos previstos</span><strong>${next.length}</strong></div>
   <p style="color:var(--ink-3);font-size:10px;margin-top:18px">*Estimativa didática, não saldo bancário confirmado.</p>
 </aside></section>
 <div class="metrics-strip">
 <div class="metric-block"><div class="metric-top"><span class="metric-icon">↗</span> Receitas</div><strong class="metric-value positive">${money(stats.income)}</strong><div class="metric-hint">Entradas da competência</div></div>
 <div class="metric-block"><div class="metric-top"><span class="metric-icon">↙</span> Gastos</div><strong class="metric-value negative">${money(stats.spent)}</strong><div class="metric-hint">${change===null?"Consumo e contas previstas":`${change>=0?"+":""}${change}% em relação ao mês anterior`}</div></div>
 <div class="metric-block"><div class="metric-top"><span class="metric-icon">↗</span> Investido neste mês</div><strong class="metric-value">${money(stats.contrib)}</strong><div class="metric-hint">Aporte, não é consumo</div></div>
 </div>
 <div class="split">
  <section class="surface">${section("Próximos pagamentos","O que está perto de vencer.",labelButton("Ver agenda","agenda"))}<div class="stack">${next.length?next.map(x=>listEntry(x.type==="invoice"?"▣":x.type==="bill"?"◫":"⟳",x.desc,`${date(x.date)} · ${x.sub}`,money(x.amount),x.status==="late"?"red":x.type==="invoice"?"yellow":"",`data-act="${x.type==="invoice"?"openInvoice":x.type==="bill"?"openBill":"openSubscription"}" data-id="${esc(x.id)}" data-date="${esc(x.date)}"`)).join(""):empty("Não há compromissos próximos.")}</div></section>
  <section class="surface">${section("Para onde foi o dinheiro","Despesas por categoria em "+R.monthLabel(m),labelButton("Ver lançamentos","activity"))}<div class="category-bars">${cost.length?cost.slice(0,6).map((c,i)=>`<div><div class="bar-row-head"><span>${esc(c.name)}</span><strong>${money(c.value)}</strong></div><div class="bar-bg"><div class="bar-fg" style="width:${Math.min(100,Math.round(c.value/Math.max(1,cost[0].value)*100))}%;background:${["#bdf379","#84bf9c","#ecc782","#95c7d2","#c3b5df","#eea7a8"][i%6]}"></div></div></div>`).join(""):empty("Nenhum gasto nesta competência.")}</div></section>
 </div>
 <div class="split">
  <section class="surface">${section("Últimas movimentações","Registros da competência selecionada.",labelButton("Ver tudo","activity"))}<div class="stack">${periodRows(db,m).slice(0,5).map(t=>t._kind==="bill"?listEntry("◫",t.name,`${date(t.dueDate)} · ${t.paidAt?"Paga":"Pendente"}`,money(t.amount),t.paidAt?"green":"yellow",`data-act="openBill" data-id="${esc(t.id)}"`):listEntry(typeGlyph(t.type),t.desc,`${date(t.date)} · ${kindNames[t.type]||"Lançamento"}`,money(t.amount),kindColors[t.type],`data-act="openTxDetail" data-id="${esc(t.id)}"`)).join("")||empty("Sem registros no período.")}</div></section>
  <section class="surface">${section("Saldos por conta","Dinheiro em cada conta.",labelButton("Abrir contas","accounts"))}${db.accounts.map(a=>`<div class="metric-row" style="padding:13px 0;border-bottom:1px solid var(--line)"><span>${esc(a.name)}</span><strong>${money(R.accountBalance(db,a.id,today))}</strong></div>`).join("")}<button class="btn-outline" data-create="transaction" data-type="transfer" style="margin-top:22px">⇄ Transferir entre contas</button></section>
 </div>`;
}
function activityRows(db,s){
 const m=s.month,filter=s.kindFilter||"all",q=String(s.search||"").toLocaleLowerCase("pt-BR").trim();
 const rows=db.transactions.filter(t=>R.month(t.date)===m&&(filter==="all"||filter===t.type)&&(!q||(t.desc+" "+cat(db,t.categoryId)).toLocaleLowerCase("pt-BR").includes(q)))
 .sort((a,b)=>b.date.localeCompare(a.date));
 if(!rows.length)return empty("Nenhum lançamento encontrado com esses filtros.");
 return `<div class="table-scroller"><table class="ledger-table"><thead><tr><th><input id="selectAll" type="checkbox" class="table-checkbox" aria-label="Selecionar todos"></th><th>Descrição</th><th>Data</th><th>Categoria</th><th>Tipo</th><th style="text-align:right">Valor</th><th style="text-align:right">Ações</th></tr></thead><tbody>
 ${rows.map(t=>`<tr><td><input class="table-checkbox" type="checkbox" data-select="${esc(t.id)}" ${s.selected?.has(t.id)?"checked":""} aria-label="Selecionar ${esc(t.desc)}"></td>
 <td class="description"><b>${esc(t.desc)}</b><small>${t.type==="card"?`${esc(card(db,t.cardId))} · ${t.installmentNo||1}/${t.installmentTotal||1}`:t.type==="transfer"?`Para ${esc(account(db,t.toAccountId))}`:t.type==="investment"||t.type==="rescue"?esc(name(db.investments,t.investmentId)):esc(account(db,t.accountId))}</small></td>
 <td>${date(t.date)}</td><td>${esc(cat(db,t.categoryId))}</td><td><span class="badge ${t.type==="income"||t.type==="rescue"?"ok":t.type==="expense"||t.type==="card"?"late":""}">${esc(kindNames[t.type]||t.type)}</span></td>
 <td class="amount ${t.type==="income"||t.type==="rescue"?"positive":t.type==="expense"||t.type==="card"?"negative":""}">${money(t.amount)}</td>
 <td class="actions"><button data-act="openTxDetail" data-id="${esc(t.id)}">Detalhes ↗</button></td></tr>`).join("")}</tbody></table></div>`;
}
function activity(db,s){
 const m=s.month,a=R.stats(db,m);
 const tabs=[["all","Todos"],["expense","Despesas"],["income","Receitas"],["card","Compras no cartão"],["investment","Aportes"],["transfer","Transferências"],["rescue","Resgates"]];
 return heading("Cada movimento, bem organizado.","Encontre, edite e classifique seus registros em poucos cliques.",`${monthControls(m)}<button class="btn-primary" data-create="transaction">＋ Adicionar</button>`,"LANÇAMENTOS")+
 `<div class="summary-grid"><div class="summary-tile"><small>Entradas do mês</small><strong class="positive">${money(a.income)}</strong><span class="delta">Receitas registradas</span></div><div class="summary-tile"><small>Despesas lançadas</small><strong class="negative">${money(a.expenseTx)}</strong><span class="delta">Inclui compras parceladas</span></div><div class="summary-tile"><small>Aportes</small><strong>${money(a.contrib)}</strong><span class="delta">Não são despesas</span></div></div>
 <section class="surface">
  <div class="toolbar"><input class="search-control" id="searchActivity" placeholder="Pesquisar uma descrição ou categoria..." value="${esc(s.search||"")}" aria-label="Buscar lançamentos"><button class="btn-outline" data-act="bulkCategory" ${s.selected?.size?"":"disabled"} id="bulkButton">Alterar categoria (${s.selected?.size||0})</button></div>
  <div class="chips">${tabs.map(([k,v])=>`<button class="chip ${s.kindFilter===k?"selected":""}" data-act="filterType" data-type="${k}">${v}</button>`).join("")}</div>
  <div id="activityRows">${activityRows(db,s)}</div>
 </section>`;
}
function agendaItems(db,s){
 const m=s.month,out=[];
 for(const b of db.bills.filter(b=>R.month(b.dueDate)===m))out.push({date:b.dueDate,title:b.name,amount:b.amount,type:"bill",id:b.id,status:b.paidAt?"paid":b.dueDate<R.today()?"late":"due"});
 for(const c of db.cards)for(const f of R.invoices(db,c.id).filter(f=>R.month(f.dueDate)===m&&f.charges>0))out.push({date:f.dueDate,title:"Fatura "+c.name,amount:f.pending,type:"invoice",id:c.id,status:f.pending<=0?"paid":f.dueDate<R.today()?"late":"due"});
 for(const sub of db.subscriptions.filter(x=>x.status==="Ativa"&&R.month(x.nextDate)===m))out.push({date:sub.nextDate,title:sub.name,amount:sub.amount,type:"subscription",id:sub.id,status:"forecast"});
 for(const t of db.transactions.filter(x=>R.month(x.date)===m&&["expense","income","investment"].includes(x.type)))out.push({date:t.date,title:t.desc,amount:t.amount,type:"transaction",id:t.id,status:t.type==="income"?"paid":"forecast"});
 return out.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
function agenda(db,s){
 const m=s.month,first=R.date(m+"-01"),offset=first.getDay(),total=new Date(first.getFullYear(),first.getMonth()+1,0).getDate(),all=agendaItems(db,s),cells=[];
 for(let i=0;i<Math.ceil((offset+total)/7)*7;i++){
   const day=i-offset+1,inMonth=day>=1&&day<=total,
   iso=inMonth?R.safeDate(first.getFullYear(),first.getMonth()+1,day):"",
   list=all.filter(x=>x.date===iso);
   cells.push(`<button class="day ${!inMonth?"outside":""} ${iso===R.today()?"today":""} ${s.selectedDay===iso?"active":""}" data-act="selectDay" data-date="${iso}" ${!inMonth?"disabled":""}><span class="day-number">${inMonth?day:""}</span><span class="day-dots">${list.slice(0,4).map(x=>`<i class="${x.status==="late"?"red":x.type==="invoice"?"blue":x.status==="paid"?"":"amber"}"></i>`).join("")}</span>${list.length?`<small class="day-total">${list.length} evento${list.length===1?"":"s"}</small>`:""}</button>`);
 }
 const selected=all.filter(x=>!s.selectedDay||x.date===s.selectedDay);
 return heading("Tudo no dia certo.","Vencimentos, faturas e assinaturas em uma agenda prática.",`${monthControls(m)}<button class="btn-primary" data-create="bill">＋ Nova conta</button>`,"AGENDA FINANCEIRA")+
 `<div class="summary-grid"><div class="summary-tile"><small>Contas pendentes</small><strong>${db.bills.filter(b=>R.month(b.dueDate)===m&&!b.paidAt).length}</strong><span class="delta">Nesta competência</span></div><div class="summary-tile"><small>Faturas no mês</small><strong>${money(R.stats(db,m).dueInvoices)}</strong><span class="delta">Por vencimento</span></div><div class="summary-tile"><small>Eventos registrados</small><strong>${all.length}</strong><span class="delta">Inclui previsões</span></div></div>
 <div class="calendar-layout">
 <section class="surface">${section(R.monthLabel(m),"Selecione uma data para ver os compromissos.")}<div class="calendar">${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(x=>`<div class="weekday">${x}</div>`).join("")}${cells.join("")}</div><div class="hint-right" style="margin-top:15px"><span class="badge ok">● Pago</span><span class="badge warn">● Pendente</span><span class="badge late">● Atrasado</span><button class="btn-quiet" data-act="clearDay">Todos os dias</button></div></section>
 <section class="surface">${section(s.selectedDay?"Compromissos de "+date(s.selectedDay):"Compromissos do mês","Clique em um item para editar ou marcar como pago.")}<div class="stack">
 ${selected.length?selected.map(x=>listEntry(x.type==="invoice"?"▣":x.type==="bill"?"◫":x.type==="subscription"?"⟳":"↗",x.title,`${date(x.date)} · ${x.status==="paid"?"Pago":x.status==="late"?"Atrasado":x.status==="forecast"?"Previsto":"Pendente"}`,money(x.amount),x.status==="paid"?"green":x.status==="late"?"red":"yellow",`data-act="${x.type==="bill"?"openBill":x.type==="invoice"?"openInvoice":x.type==="subscription"?"openSubscription":"openTxDetail"}" data-id="${esc(x.id)}" data-date="${esc(x.date)}"`)).join(""):empty("Não há eventos nesse dia.")}
 </div></section></div>`;
}
function cards(db,s){
 const c=db.cards.find(c=>c.id===s.cardId)||db.cards[0];
 if(!c)return heading("Cartões","Acompanhe seus cartões.","<button class='btn-primary' data-create='card'>＋ Novo cartão</button>")+empty("Adicione um cartão para começar.");
 const invoices=R.invoices(db,c.id),pending=R.total(invoices.map(x=>x.pending));
 const upcoming=invoices.filter(x=>x.pending>0).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 return heading("Cartões sem complicação.","Entenda suas faturas, parcelas e limite disponível.",`<button class="btn-outline" data-create="card">＋ Novo cartão</button><button class="btn-primary" data-create="transaction" data-type="card">＋ Nova compra</button>`,"CRÉDITO")+
 `<div class="card-tabs">${db.cards.map(x=>`<button data-act="selectCard" data-id="${esc(x.id)}" class="${x.id===c.id?"selected":""}">${esc(x.name)}</button>`).join("")}</div>
 <div class="credit-grid">
 <div><div class="credit-visual"><div><div class="brand-dot">↗</div><b>${esc(c.bank)}</b></div><div><div class="number">•••• &nbsp; •••• &nbsp; •••• &nbsp; ${c.id==="cartao-1"?"2026":"0001"}</div><div class="credit-foot"><span>${esc(c.name)}</span><span>FINANCEIRO · DEMO</span></div></div></div>
 <div class="surface"><div class="surface-header"><div><h3>Resumo do cartão</h3><p>Fechamento dia ${c.closingDay}, vencimento dia ${c.dueDay}</p></div><button class="text-link" data-act="editCard" data-id="${esc(c.id)}">Editar</button></div>
 <div class="metric-row"><span>Limite total</span><strong>${money(c.limit)}</strong></div><div class="metric-row"><span>Utilizado em faturas abertas</span><strong>${money(pending)}</strong></div><div class="metric-row"><span>Limite disponível estimado</span><strong class="positive">${money(c.limit-pending)}</strong></div><div class="progress-line"><div style="width:${Math.min(100,Math.max(0,pending/Math.max(1,c.limit)*100))}%"></div></div>
 <hr class="mini-separator"><p style="font-size:12px;color:var(--ink-2)">Próximo vencimento</p><h3 style="font-size:23px;margin-top:7px">${upcoming.length?date(upcoming[0].dueDate):"Nenhuma fatura aberta"}</h3></div></div>
 <section class="surface" style="margin-top:23px">${section("Suas faturas","Compras contabilizadas no consumo; pagamento afeta apenas o caixa.")}<div class="stack">${invoices.length?invoices.map(i=>`<div class="invoice-row"><div><b>Vencimento ${date(i.dueDate)}</b><small>Compras: ${money(i.charges)} · Pago: ${money(i.paid)}</small></div><div class="value ${i.pending?"":"positive"}">${money(i.pending)}<small style="display:block;color:var(--ink-3);font-size:10px">em aberto</small></div><button data-act="openInvoice" data-id="${esc(c.id)}" data-date="${esc(i.dueDate)}">Ver fatura ↗</button></div>`).join(""):empty("Nenhuma fatura para este cartão.")}</div></section>`;
}
function accounts(db,s){
 const total=R.total(db.accounts.map(x=>R.accountBalance(db,x.id))),today=R.today(),pending=db.bills.filter(b=>!b.paidAt).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
 return heading("Contas e compromissos.","Dinheiro nas contas e o que ainda precisa ser pago.",`<button class="btn-outline" data-create="account">＋ Nova conta</button><button class="btn-primary" data-create="transaction" data-type="transfer">⇄ Transferir</button>`,"SUAS CONTAS")+
 `<div class="summary-grid"><div class="summary-tile"><small>Saldo consolidado</small><strong>${money(total)}</strong><span class="delta">Atualizado com pagamentos</span></div><div class="summary-tile"><small>Contas cadastradas</small><strong>${db.accounts.length}</strong><span class="delta">Bancos e carteiras</span></div><div class="summary-tile"><small>Contas a pagar</small><strong class="warning">${pending.length}</strong><span class="delta">Inclui futuras recorrências</span></div></div>
 <div class="accounts-grid">${db.accounts.map(a=>`<div class="account-item"><div class="title-line"><div class="bank-symbol" style="color:${/^#[a-f0-9]{6}$/i.test(a.color)?a.color:"var(--lime)"}">▣</div><button class="btn-quiet" data-act="editAccount" data-id="${esc(a.id)}">Editar ↗</button></div><div><small>${esc(a.bank)}</small><div class="title-line"><b>${esc(a.name)}</b></div></div><strong>${money(R.accountBalance(db,a.id,today))}</strong></div>`).join("")}</div>
 <section class="surface">${section("Contas a pagar","Clique para quitar ou alterar uma ocorrência.",`<button class="btn-outline" data-create="bill">＋ Criar conta</button>`)}
 <div class="stack">${pending.slice(0,30).map(b=>listEntry("◫",b.name,`${date(b.dueDate)} · ${esc(cat(db,b.categoryId))}`,money(b.amount),b.dueDate<R.today()?"red":"yellow",`data-act="openBill" data-id="${esc(b.id)}"`)).join("")||empty("Tudo em dia!")}</div></section>`;
}
function subscriptions(db){
 const active=db.subscriptions.filter(x=>x.status==="Ativa"),f={Semanal:52/12,Mensal:1,Bimestral:.5,Trimestral:1/3,Semestral:1/6,Anual:1/12},monthly=Math.round(R.total(active.map(s=>s.amount*(f[s.recurrence]??1))));
 return heading("Assinaturas sob controle.","Previsões separadas das cobranças que já foram registradas.",`<button class="btn-primary" data-create="subscription">＋ Nova assinatura</button>`,"SERVIÇOS RECORRENTES")+
 `<div class="summary-grid"><div class="summary-tile"><small>Equivalente mensal</small><strong>${money(monthly)}</strong><span class="delta">Soma de assinaturas ativas</span></div><div class="summary-tile"><small>Custo anual previsto</small><strong>${money(monthly*12)}</strong><span class="delta">Se nada mudar</span></div><div class="summary-tile"><small>Serviços ativos</small><strong>${active.length}</strong><span class="delta">Cobranças recorrentes</span></div></div>
 <div class="sub-items">${db.subscriptions.map(s=>`<div class="sub-item"><div class="sub-icon">⟳</div><div><b>${esc(s.name)}</b><small>${date(s.nextDate)} · ${esc(s.cardId?card(db,s.cardId):account(db,s.accountId))}</small><span class="badge ${s.status==="Ativa"?"ok":"warn"}" style="margin-top:8px">${esc(s.status)}</span></div><div class="money">${money(s.amount)}<div><button class="btn-quiet" data-act="openSubscription" data-id="${esc(s.id)}">Detalhes ↗</button></div></div></div>`).join("")}</div>`;
}
function investments(db,s){
 const on=s.positionDate||R.today(),daily=Number(db.settings.dailyCDIPct)||.043,positions=R.portfolio(db,on,daily);
 const capital=R.total(positions.map(i=>i.capital)),estimated=R.total(positions.map(i=>i.estimated)),returnV=estimated-capital;
 const monthly=R.total(positions.map(i=>i.monthlyPlan||0));
 const aporte=Number(s.simMonthly??monthly/100),pct=Number(s.simPct??100),years=Number(s.simYears||5);
 const series=R.projection(estimated,Math.round(aporte*100),daily,pct,years);
 const max=Math.max(1,...series.map(x=>x.value));
 const bars=series.map(x=>`<div class="pcol"><div class="pillbar" style="height:${Math.max(6,Math.round(x.value/max*145))}px"></div><small>${x.year} ano${x.year===1?"":"s"}</small></div>`).join("");
 const badge=db.settings.CDIDate?"BCB • "+db.settings.CDIDate:"CDI ilustrativo";
 return heading("Seu patrimônio crescendo.","Separação clara entre capital, aportes realizados e rendimentos estimados.",`<button class="btn-outline" data-create="investment">＋ Investimento</button>`,"INVESTIMENTOS")+
 `<div class="investment-hero"><div><div class="tag">VALOR ESTIMADO DA CARTEIRA</div><div class="big-number">${money(estimated)}</div><p>Aplicado ${money(capital)} · Rendimento ${money(returnV)} · Data ${date(on)}</p><div class="actions"><button data-create="transaction" data-type="investment">＋ Fazer aporte</button><button data-create="transaction" data-type="rescue">↙ Resgatar</button></div></div><div class="mini-chart">${[23,38,30,50,49,58,61,76,71,89,83,99].map(n=>`<div style="height:${n}%"></div>`).join("")}</div></div>
 <div class="summary-grid"><div class="summary-tile"><small>Capital investido</small><strong>${money(capital)}</strong><span class="delta">Sem aportes futuros</span></div><div class="summary-tile"><small>Rendimento estimado</small><strong class="${returnV>=0?"positive":"negative"}">${money(returnV)}</strong><span class="delta">Antes de impostos/tarifas</span></div><div class="summary-tile"><small>Plano mensal de aportes</small><strong>${money(monthly)}</strong><span class="delta">Informado nos investimentos</span></div></div>
 <div class="split"><section class="surface">${section("Sua carteira","Projeção com juros diários estimados.",`<button class="btn-quiet" data-act="refreshCDI">↻ Atualizar CDI</button>`)}
 <div class="field" style="max-width:190px;margin-bottom:18px"><label for="positionDate">Posição em</label><input type="date" id="positionDate" value="${esc(on)}"></div>
 ${positions.map(i=>`<div class="investment-line"><div class="entry-icon green">↗</div><div><b>${esc(i.name)}</b><small>${esc(i.institution)} · ${i.cdiPercent}% CDI · Aplicado ${money(i.capital)}</small></div><div class="end">${money(i.estimated)}<small class="positive" style="display:block">${money(i.result)}</small></div><button data-act="editInvestment" data-id="${esc(i.id)}">↗</button></div>`).join("")}
 <p style="font-size:11px;color:var(--ink-3);margin-top:16px">${esc(badge)} · Taxa diária ${(daily).toFixed(4)}% — valores estimados e não garantidos.</p></section>
 <section class="surface">${section("Planeje os próximos anos","Simulação com aportes mensais e CDI constante.")}
 <div class="form-grid" style="margin-bottom:9px"><div class="field"><label>Aporte mensal (R$)</label><input id="simMonthly" type="number" min="0" step=".01" value="${esc(aporte)}"></div><div class="field"><label>% do CDI</label><input id="simPct" type="number" min="0" max="500" value="${esc(pct)}"></div><div class="field"><label>Tempo</label><select id="simYears">${[1,3,5,10].map(x=>`<option value="${x}" ${x===years?"selected":""}>${x} ano${x===1?"":"s"}</option>`).join("")}</select></div><div class="field"><label>Resultado projetado</label><div style="padding:10px 0;font-weight:800">${series.length?money(series[series.length-1].value):money(estimated)}</div></div></div>
 <div class="projection-bars" id="simChart">${bars}</div>
 <p style="font-size:11px;color:var(--ink-3);margin-top:14px">Cenário hipotético. Não é uma previsão de taxa de CDI futura.</p></section></div>`;
}
function settings(db){
 return heading("Seu app, suas escolhas.","Categorias, aparência, demonstração e testes.",`<button class="btn-primary" data-create="category">＋ Criar categoria</button>`,"CONFIGURAÇÕES")+
 `<div class="settings-grid"><section class="surface">${section("Categorias","Crie, edite ou desative sem apagar registros.")}<div class="stack">${db.categories.slice().sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")).map(c=>`<div class="category-item"><div class="color" style="background:${/^#[a-f0-9]{6}$/i.test(c.color)?c.color:"#a8b5a7"}40">${esc(c.icon||"◈")}</div><b>${esc(c.name)} ${c.archived?"(inativa)":""}</b><small>${c.kind==="income"?"Receita":c.kind==="investment"?"Investimento":"Despesa"}</small><button data-act="editCategory" data-id="${esc(c.id)}">Editar</button><button data-act="archiveCategory" data-id="${esc(c.id)}">${c.archived?"Reativar":"Desativar"}</button></div>`).join("")}</div></section>
 <div style="display:grid;gap:18px"><section class="surface">${section("Tema de aparência","O mesmo layout em duas experiências.")}<div class="view-actions"><button class="btn-outline" data-act="themeDark">◐ Escuro</button><button class="btn-outline" data-act="themeLight">☀ Claro</button></div></section>
 <section class="surface">${section("Ambiente seguro","Esta versão não está conectada ao Supabase.")}<p style="font-size:12px;color:var(--ink-2);line-height:1.75">Os dados desta página são inteiramente fictícios e ficam no navegador, separados da primeira demonstração e do aplicativo real.</p><p style="margin-top:15px;font-size:11px"><a href="../" target="_blank" rel="noopener noreferrer">Abrir meu aplicativo original ↗</a></p></section>
 <section class="surface">${section("Backup da demonstração","Exportação e importação apenas dos exemplos locais.")}<div class="view-actions"><button class="btn-outline" data-act="exportDemo">↓ Exportar JSON</button><label class="btn-outline" style="cursor:pointer">↑ Importar JSON<input type="file" id="importDemo" accept="application/json,.json" style="display:none"></label></div></section>
 <section class="surface">${section("Reiniciar e testar","A produção não será modificada.")}<div class="view-actions"><button class="btn-outline" data-act="runUnitTests">✓ Executar 23 testes</button><button class="btn-danger" data-act="resetDemo">↻ Reiniciar exemplos</button></div><div id="unitOutput" style="margin-top:15px"></div></section>
 </div></div>`;
}
return {esc,money,date,cat,account,card,name,kindNames,kindIcons,kindColors,empty,heading,monthControls,listEntry,nextCommitments,activityRows,home,activity,agenda,cards,accounts,subscriptions,investments,settings};
})();
