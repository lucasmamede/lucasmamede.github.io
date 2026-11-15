(function FinanceStudioApp(){
"use strict";
const R=window.FinanceRules, V=window.FinanceStudioViews(R), E=window.FinanceLabEngine(R,window.FinanceDemoSeed);
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s)), h=V.esc;
const state={page:"home",month:R.month(R.today()),kindFilter:"all",search:"",selected:new Set(),selectedDay:"",cardId:E.db.cards[0]?.id,positionDate:R.today(),simMonthly:null,simPct:100,simYears:5};
const pages={home:"Início",activity:"Lançamentos",agenda:"Agenda",cards:"Cartões",investments:"Investimentos",accounts:"Contas",subscriptions:"Assinaturas",settings:"Configurações"};
const THEME_KEY="meu-financeiro-teste2-theme";
try{document.documentElement.dataset.theme=localStorage.getItem(THEME_KEY)==="light"?"light":"dark";}catch(_){document.documentElement.dataset.theme="dark";}
function applyTheme(v){
 document.documentElement.dataset.theme=v;
 $("#themeGlyph").textContent=v==="light"?"☾":"☀";
 try{localStorage.setItem(THEME_KEY,v);}catch(_){}
}
applyTheme(document.documentElement.dataset.theme);
function toast(message){
 const el=$("#toast");el.textContent=String(message);el.classList.add("visible");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("visible"),3200);
}
function render(){
 const map={home:V.home,activity:V.activity,agenda:V.agenda,cards:V.cards,accounts:V.accounts,subscriptions:V.subscriptions,investments:V.investments,settings:V.settings};
 const fn=map[state.page]||map.home;
 try{$("#main").innerHTML=fn(E.db,state);}
 catch(e){console.error(e);$("#main").innerHTML=`<div class="surface"><h2>Não foi possível carregar a tela.</h2><p class="error">${h(e.message)}</p></div>`;}
 $$("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
 document.title=pages[state.page]+" | Meu Financeiro — Teste 2";
}
function go(page){
 if(!pages[page])return;state.page=page;state.selected.clear();state.selectedDay="";closeSheet();
 $("#moreMenu").classList.add("hidden");$("#moreButton").setAttribute("aria-expanded","false");
 render();window.scrollTo({top:0,behavior:"smooth"});
}
function sheet(title,inner,kicker="MEU FINANCEIRO · TESTE 2"){
 $("#sheetTitle").textContent=title;$("#sheetEyebrow").textContent=kicker;$("#sheetBody").innerHTML=inner;
 $("#sheetBackdrop").classList.remove("hidden");document.body.classList.add("sheet-open");
 const input=$("#sheetBody input:not([type=hidden]),#sheetBody select");if(input)setTimeout(()=>input.focus(),80);
}
function closeSheet(){$("#sheetBackdrop").classList.add("hidden");document.body.classList.remove("sheet-open");$("#sheetBody").innerHTML="";}
function chooseAdd(){
 sheet("O que deseja registrar?",`<div style="margin-bottom:20px;color:var(--ink-2);font-size:12px">Um lançamento rápido com apenas os campos necessários.</div>
 ${[
 ["expense","↙","Despesa","Compra ou saída do dia a dia"],
 ["income","↗","Receita","Salário, trabalho ou entrada"],
 ["card","▣","Compra no cartão","Com fatura e parcelas corretas"],
 ["transfer","⇄","Transferência","Entre duas contas"],
 ["investment","↗","Aporte","Transferir caixa para investimentos"],
 ["rescue","↙","Resgate","Trazer dinheiro da carteira"]
 ].map(([kind,icon,title,subtitle])=>`<button class="quick-choice" data-act="selectTxType" data-type="${kind}"><span>${icon}</span><div><strong>${title}</strong><small>${subtitle}</small></div><span style="margin-left:auto">↗</span></button>`).join("")}`,"NOVO LANÇAMENTO");
}
const amt=c=>(Number(c||0)/100).toFixed(2);
const field=(name,label,value="",type="text",attrs="")=>`<div class="field"><label for="f_${h(name)}">${h(label)}</label><input id="f_${h(name)}" name="${h(name)}" type="${h(type)}" value="${h(value)}" ${attrs}></div>`;
const select=(name,label,options,attrs="")=>`<div class="field"><label for="f_${h(name)}">${h(label)}</label><select id="f_${h(name)}" name="${h(name)}" ${attrs}>${options}</select></div>`;
const options=(arr,selected,emptyLabel="Selecione")=>`<option value="">${h(emptyLabel)}</option>${arr.map(x=>`<option value="${h(x.id)}" ${x.id===selected?"selected":""}>${h(x.name)}</option>`).join("")}`;
const categoryOpts=(selected)=>options(E.db.categories.filter(c=>!c.archived||c.id===selected),selected,"Sem categoria");
const accOpts=(selected)=>options(E.db.accounts,selected,"Escolha uma conta");
const cardOpts=(selected)=>options(E.db.cards,selected,"Escolha um cartão");
const invOpts=(selected)=>options(E.db.investments,selected,"Escolha um investimento");
const endForm=(label="Salvar alterações")=>`<div class="form-actions"><button type="button" class="btn-quiet" data-act="close">Cancelar</button><button class="btn-primary" type="submit">${h(label)}</button></div><p id="formError" class="error wide" role="alert"></p>`;
const recurrenceOpts=(selected,includeNone=true)=>[...(includeNone?["Nenhuma"]:[]),"Semanal","Mensal","Bimestral","Trimestral","Semestral","Anual"].map(x=>`<option value="${x}" ${x===selected?"selected":""}>${x}</option>`).join("");
function transactionForm(type="expense",id=null,investmentId=null){
 const old=id?E.db.transactions.find(t=>t.id===id):null;if(id&&!old)return toast("Lançamento não encontrado.");
 type=old?.type||type;
 if(!["expense","income","card","transfer","investment","rescue"].includes(type))type="expense";
 const obj={type,desc:old?.desc||"",amount:old?amt(old.amount):"",date:old?.date||R.today(),accountId:old?.accountId||E.db.accounts[0]?.id,cardId:old?.cardId||E.db.cards[0]?.id,toAccountId:old?.toAccountId||E.db.accounts[1]?.id,investmentId:old?.investmentId||investmentId||E.db.investments[0]?.id,categoryId:old?.categoryId||"",installmentTotal:old?.installmentTotal||1,installmentCurrent:old?.installmentNo||1};
 const kinds={income:"Nova receita",expense:"Nova despesa",card:"Nova compra no cartão",transfer:"Nova transferência",investment:"Novo aporte",rescue:"Novo resgate"};
 sheet(id?"Editar lançamento":kinds[type],`<form class="form-grid" data-form="transaction" data-id="${h(id||"")}">
 ${select("type","Tipo de movimento",Object.entries(kinds).map(([v,label])=>`<option value="${v}" ${v===type?"selected":""}>${h(label.replace("Nova ","").replace("Novo ",""))}</option>`).join(""),id?"disabled":"")}
 ${field("desc","Descrição",obj.desc,"text",'required maxlength="100" placeholder="Ex.: Mercado da semana"')}
 ${field("amount","Valor (R$)",obj.amount,"number",'required min="0.01" step="0.01"')}
 ${field("date","Data",obj.date,"date","required")}
 <div class="field" data-if="category"><label for="f_categoryId">Categoria</label><select id="f_categoryId" name="categoryId">${categoryOpts(obj.categoryId)}</select><button type="button" class="btn-quiet" data-act="quickCategory" style="align-self:flex-start;padding:4px 0">＋ Criar categoria</button></div>
 <div class="field" data-if="account">${select("accountId","Conta de origem",accOpts(obj.accountId))}</div>
 <div class="field" data-if="card">${select("cardId","Cartão",cardOpts(obj.cardId))}</div>
 <div class="field" data-if="destination">${select("toAccountId","Conta de destino",accOpts(obj.toAccountId))}</div>
 <div class="field" data-if="investment">${select("investmentId","Investimento",invOpts(obj.investmentId))}</div>
 <div class="field" data-if="newcard">${field("installmentTotal","Número de parcelas",obj.installmentTotal,"number",'min="1" max="120"')}</div>
 <div class="field" data-if="newcard">${field("installmentCurrent","Parcela atual",obj.installmentCurrent,"number",'min="1" max="120"')}</div>
 <div class="helper wide" id="txHint"></div>${endForm(id?"Salvar lançamento":"Registrar lançamento")}</form>`,"LANÇAMENTOS");
 refreshTransactionFields();
}
function refreshTransactionFields(){
 const f=$("#sheetBody form[data-form='transaction']");if(!f)return;
 const type=f.querySelector('[name="type"]').value,edit=!!f.dataset.id;
 for(const node of f.querySelectorAll("[data-if]")){
 const key=node.dataset.if;
 const show=key==="category"||key==="account"&&type!=="card"||key==="card"&&type==="card"||key==="destination"&&type==="transfer"||key==="investment"&&["investment","rescue"].includes(type)||key==="newcard"&&type==="card"&&!edit;
 node.classList.toggle("hidden",!show);
 node.querySelectorAll("input,select").forEach(i=>i.disabled=!show);
 }
 const text={income:"Receita aumenta o saldo da conta e o resultado do mês.",expense:"Despesa reduz o saldo da conta e o resultado do mês.",card:"Compras são divididas entre faturas. Pagar a fatura não gera uma segunda despesa.",transfer:"Transferências movimentam duas contas sem afetar o resultado do mês.",investment:"Aportes reduzem o saldo em caixa e aumentam os investimentos. Não são despesas de consumo.",rescue:"Resgates aumentam o saldo em caixa e reduzem a posição investida."};
 $("#txHint").textContent=text[type]||"";
}
function billForm(id=null){
 const b=id?E.db.bills.find(x=>x.id===id):null;
 sheet(b?"Editar compromisso":"Nova conta a pagar",`<form data-form="bill" data-id="${h(id||"")}" class="form-grid">
 ${field("name","Descrição",b?.name||"","text","required")}
 ${field("amount","Valor (R$)",b?amt(b.amount):"","number",'required min="0.01" step="0.01"')}
 ${field("dueDate","Data de vencimento",b?.dueDate||R.addDays(R.today(),5),"date","required")}
 ${select("recurrence","Frequência",recurrenceOpts(b?.recurrence||"Nenhuma"),b?"disabled":"")}
 ${select("accountId","Conta do pagamento",accOpts(b?.accountId||E.db.accounts[0]?.id))}
 ${select("categoryId","Categoria",categoryOpts(b?.categoryId))}
 ${b?.seriesId?select("scope","Aplicar alteração",'<option value="one">Somente esta ocorrência</option><option value="future">Esta e as próximas</option><option value="all">Toda a série</option>'):""}
 <div class="helper wide">O pagamento de uma ocorrência não marca automaticamente as próximas como pagas.</div>${endForm(b?"Salvar mudanças":"Criar conta")}</form>
 ${b?`<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:22px"><button class="btn-outline" data-act="toggleBill" data-id="${h(id)}">${b.paidAt?"Reverter pagamento":"Marcar como paga"}</button><button class="btn-danger" data-act="deleteBill" data-id="${h(id)}">Excluir</button></div>`:""}`,"AGENDA E CONTAS");
}
function accountForm(id=null){
 const a=id?E.db.accounts.find(x=>x.id===id):null;
 sheet(a?"Editar conta":"Nova conta",`<form data-form="account" data-id="${h(id||"")}" class="form-grid">${field("name","Nome da conta",a?.name||"","text","required")}${field("bank","Instituição",a?.bank||"","text","required")}${field("opening","Saldo inicial (R$)",amt(a?.opening||0),"number",'required step="0.01"')}${field("color","Cor da conta",a?.color||"#80bc78","color")}${endForm("Salvar conta")}</form>${a?`<button class="btn-danger" style="margin-top:20px" data-act="deleteAccount" data-id="${h(id)}">Excluir conta sem vínculos</button>`:""}`,"MINHAS CONTAS");
}
function cardForm(id=null){
 const c=id?E.db.cards.find(x=>x.id===id):null;
 sheet(c?"Editar cartão":"Novo cartão",`<form data-form="card" data-id="${h(id||"")}" class="form-grid">${field("name","Nome do cartão",c?.name||"","text","required")}${field("bank","Instituição",c?.bank||"","text","required")}${field("limit","Limite (R$)",amt(c?.limit||0),"number",'required min=".01" step=".01"')}${field("closingDay","Dia de fechamento",c?.closingDay||27,"number",'required min="1" max="31"')}${field("dueDay","Dia do vencimento",c?.dueDay||3,"number",'required min="1" max="31"')}${field("color","Cor",c?.color||"#7fae7c","color")}${endForm("Salvar cartão")}</form>${c?`<button class="btn-danger" style="margin-top:20px" data-act="deleteCard" data-id="${h(id)}">Excluir cartão sem vínculos</button>`:""}`,"CARTÕES");
}
function subscriptionForm(id=null){
 const s=id?E.db.subscriptions.find(x=>x.id===id):null;
 sheet(s?"Editar assinatura":"Nova assinatura",`<form data-form="subscription" data-id="${h(id||"")}" class="form-grid">${field("name","Serviço",s?.name||"","text","required")}${field("amount","Valor (R$)",s?amt(s.amount):"","number",'required min=".01" step=".01"')}${field("nextDate","Próxima cobrança",s?.nextDate||R.today(),"date","required")}${select("recurrence","Periodicidade",recurrenceOpts(s?.recurrence||"Mensal",false))}${select("categoryId","Categoria",categoryOpts(s?.categoryId))}${select("cardId","Cartão (opcional)",cardOpts(s?.cardId),"")}${select("accountId","Conta, se não usar cartão",accOpts(s?.accountId||E.db.accounts[0]?.id))}${select("status","Status",["Ativa","Pausada","Cancelada"].map(x=>`<option value="${x}" ${x===(s?.status||"Ativa")?"selected":""}>${x}</option>`).join(""))}<div class="helper wide">Cobranças previstas ainda não entram no saldo. Registre a cobrança para efetivá-la.</div>${endForm()}</form>${s?`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px"><button class="btn-outline" data-act="chargeSubscription" data-id="${h(id)}">Registrar cobrança</button><button class="btn-danger" data-act="deleteSubscription" data-id="${h(id)}">Excluir assinatura</button></div>`:""}`,"ASSINATURAS");
}
function investmentForm(id=null){
 const x=id?E.db.investments.find(x=>x.id===id):null;
 sheet(x?"Editar investimento":"Novo investimento",`<form class="form-grid" data-form="investment" data-id="${h(id||"")}">${field("name","Nome do investimento",x?.name||"","text","required")}${field("institution","Instituição",x?.institution||"","text","required")}${field("startDate","Data inicial",x?.startDate||R.today(),"date","required")}${field("opening","Capital inicial (R$)",amt(x?.opening||0),"number",'required step=".01" min="0"')}${field("cdiPercent","Rendimento (% CDI)",x?.cdiPercent??100,"number",'required min="0" max="500"')}${field("monthlyPlan","Aporte mensal planejado (R$)",amt(x?.monthlyPlan||0),"number",'required step=".01" min="0"')}<div class="helper wide">Rendimento simulado com CDI diário. O retorno real depende de impostos, tarifas e condições do produto.</div>${endForm()}</form>${x?`<button class="btn-danger" style="margin-top:20px" data-act="deleteInvestment" data-id="${h(id)}">Excluir investimento sem movimentos</button>`:""}`,"INVESTIMENTOS");
}
function categoryForm(id=null){
 const c=id?E.db.categories.find(x=>x.id===id):null;
 sheet(c?"Editar categoria":"Criar categoria",`<form class="form-grid" data-form="category" data-id="${h(id||"")}">${field("name","Nome da categoria",c?.name||"","text",'required maxlength="60"')}${select("kind","Tipo",["expense","income","investment"].map(x=>`<option value="${x}" ${x===(c?.kind||"expense")?"selected":""}>${x==="expense"?"Despesa":x==="income"?"Receita":"Investimento"}</option>`).join(""))}${field("color","Cor",c?.color||"#bdf379","color")}${select("icon","Ícone",["🏷️","🍽️","🛒","🏠","🚗","❤️","🎓","🎮","🛍️","🔁","💵","💼","✈️","🐾"].map(x=>`<option value="${x}" ${x===(c?.icon||"🏷️")?"selected":""}>${x}</option>`).join(""))}<div class="helper wide">Lançamentos vinculados continuam intactos quando você altera o nome de uma categoria.</div>${endForm()}</form>`,"CATEGORIAS");
}
function paymentForm(cardId,dueDate){
 const invoice=R.invoice(E.db,cardId,dueDate),c=E.db.cards.find(x=>x.id===cardId);
 if(!c||invoice.pending<=0)return toast("Fatura sem valor em aberto.");
 sheet("Pagar fatura",`<div class="helper" style="margin-bottom:21px"><b>${h(c.name)}</b> · ${V.date(dueDate)}<br>Valor total: ${R.fmt(invoice.charges)}<br>Já pago: ${R.fmt(invoice.paid)}<br><b>Restante: ${R.fmt(invoice.pending)}</b></div>
 <form class="form-grid" data-form="payment"><input type="hidden" name="cardId" value="${h(cardId)}"><input type="hidden" name="dueDate" value="${h(dueDate)}">${select("accountId","Conta para pagar",accOpts(E.db.accounts[0]?.id))}${field("date","Data do pagamento",R.today(),"date","required")}${field("amount","Valor a pagar (R$)",amt(invoice.pending),"number",'required min=".01" step=".01"')}<div class="helper wide">O pagamento reduz o saldo bancário, mas não será contado como nova despesa.</div>${endForm("Confirmar pagamento")}</form>`,"FATURA DE CARTÃO");
}
function txDetail(id){
 const t=E.db.transactions.find(x=>x.id===id);if(!t)return toast("Lançamento não encontrado.");
 const cls=t.type==="income"?"positive":t.type==="expense"||t.type==="card"?"negative":"";
 const item=[["Data",V.date(t.date)],["Tipo",V.kindNames[t.type]],["Categoria",V.cat(E.db,t.categoryId)],["Conta/Cartão",t.type==="card"?V.card(E.db,t.cardId):V.account(E.db,t.accountId)]];
 sheet(t.desc,`<div class="eyebrow">VALOR REGISTRADO</div><div class="big-number ${cls}" style="font-size:39px;letter-spacing:-.06em;margin:12px 0 24px">${R.fmt(t.amount)}</div>${item.map(([k,v])=>`<div class="metric-row"><span>${h(k)}</span><strong>${h(v)}</strong></div>`).join("")}
 ${t.type==="card"?`<div class="helper" style="margin-top:18px">Parcela ${t.installmentNo||1}/${t.installmentTotal||1} · Fatura com vencimento em ${V.date(t.invoiceDue)}</div>`:""}
 <div class="form-actions" style="margin-top:28px"><button class="btn-danger" data-act="deleteTransaction" data-id="${h(id)}">Excluir</button><button class="btn-outline" data-act="duplicateTransaction" data-id="${h(id)}">Duplicar</button><button class="btn-primary" data-act="editTransaction" data-id="${h(id)}">Editar lançamento</button></div>`,"DETALHES DO LANÇAMENTO");
}
function billDetail(id){
 const b=E.db.bills.find(x=>x.id===id);if(!b)return toast("Conta não encontrada.");
 sheet(b.name,`<div class="eyebrow">${b.paidAt?"PAGAMENTO REGISTRADO":"PENDENTE DE PAGAMENTO"}</div><div class="big-number" style="font-size:38px;margin:10px 0 26px">${R.fmt(b.amount)}</div><div class="metric-row"><span>Vencimento</span><strong>${V.date(b.dueDate)}</strong></div><div class="metric-row"><span>Conta</span><strong>${h(V.account(E.db,b.accountId))}</strong></div><div class="metric-row"><span>Categoria</span><strong>${h(V.cat(E.db,b.categoryId))}</strong></div><div class="metric-row"><span>Recorrência</span><strong>${h(b.recurrence)}</strong></div><div class="form-actions" style="margin-top:28px"><button class="btn-danger" data-act="deleteBill" data-id="${h(id)}">Excluir</button><button class="btn-outline" data-act="editBill" data-id="${h(id)}">Editar</button><button class="btn-primary" data-act="toggleBill" data-id="${h(id)}">${b.paidAt?"Reverter pagamento":"Marcar como paga"}</button></div>`,"COMPROMISSOS");
}
function invoiceDetail(cardId,dueDate){
 const c=E.db.cards.find(x=>x.id===cardId);if(!c)return toast("Cartão não encontrado.");
 const i=R.invoice(E.db,cardId,dueDate),rows=E.db.transactions.filter(t=>t.type==="card"&&t.cardId===cardId&&t.invoiceDue===dueDate),payments=E.db.invoicePayments.filter(p=>p.cardId===cardId&&p.dueDate===dueDate);
 sheet("Fatura · "+c.name,`<div class="eyebrow">VENCIMENTO ${V.date(dueDate)}</div><div class="big-number" style="font-size:37px;letter-spacing:-.065em;margin:11px 0 8px">${R.fmt(i.pending)}</div><div style="color:var(--ink-3);font-size:12px">Em aberto • Total ${R.fmt(i.charges)} • Pago ${R.fmt(i.paid)}</div><hr class="mini-separator">
 <div class="overline">COMPRAS NESTA FATURA</div><div class="stack">${rows.map(t=>V.listEntry("▣",t.desc,`Parcela ${t.installmentNo||1}/${t.installmentTotal||1} · ${V.date(t.date)}`,R.fmt(t.amount),"red",`data-act="openTxDetail" data-id="${h(t.id)}"`)).join("")||V.empty("Nenhuma compra.")}</div>
 ${payments.length?`<hr class="mini-separator"><div class="overline">PAGAMENTOS REALIZADOS</div><div class="stack">${payments.map(p=>`<div class="entry"><div class="entry-label"><b>Pagamento registrado</b><small>${V.date(p.date)} · ${h(V.account(E.db,p.accountId))}</small></div><b class="positive">${R.fmt(p.amount)}</b><button class="btn-quiet" data-act="reversePayment" data-id="${h(p.id)}">Reverter</button></div>`).join("")}</div>`:""}
 <div class="form-actions" style="margin-top:26px">${i.pending>0?`<button class="btn-primary" data-act="payInvoice" data-id="${h(cardId)}" data-date="${h(dueDate)}">Pagar ${R.fmt(i.pending)}</button>`:"<span class='badge ok'>Fatura quitada ✓</span>"}</div>`,"CARTÕES");
}
function subscriptionDetail(id){
 const s=E.db.subscriptions.find(x=>x.id===id);if(!s)return toast("Serviço não encontrado.");
 sheet(s.name,`<div class="eyebrow">ASSINATURA ${h(s.status).toUpperCase()}</div><div class="big-number" style="font-size:38px;margin:12px 0 24px">${R.fmt(s.amount)}</div>
 <div class="metric-row"><span>Próxima cobrança</span><strong>${V.date(s.nextDate)}</strong></div>
 <div class="metric-row"><span>Frequência</span><strong>${h(s.recurrence)}</strong></div>
 <div class="metric-row"><span>Forma de pagamento</span><strong>${h(s.cardId?V.card(E.db,s.cardId):V.account(E.db,s.accountId))}</strong></div>
 <div class="form-actions" style="margin-top:27px"><button class="btn-danger" data-act="deleteSubscription" data-id="${h(id)}">Excluir</button><button class="btn-outline" data-act="toggleSubscription" data-id="${h(id)}">${s.status==="Ativa"?"Pausar":"Ativar"}</button><button class="btn-outline" data-act="editSubscription" data-id="${h(id)}">Editar</button><button class="btn-primary" data-act="chargeSubscription" data-id="${h(id)}" ${s.status!=="Ativa"?"disabled":""}>Registrar cobrança</button></div>`,"ASSINATURA");
}
function bulkForm(){
 if(!state.selected.size)return toast("Selecione lançamentos antes de continuar.");
 sheet("Classificar lançamentos",`<div class="helper" style="margin-bottom:17px">${state.selected.size} lançamentos selecionados. O histórico não será apagado.</div><form class="form-grid" data-form="bulk">${select("categoryId","Nova categoria",categoryOpts(null),"required")}${endForm("Aplicar categoria")}</form>`,"EDIÇÃO EM LOTE");
}
function removeTransaction(id){
 const t=E.db.transactions.find(x=>x.id===id);if(!t)return;let scope="one";
 if(t.groupId&&t.installmentTotal>1){const v=prompt("Excluir parcelamento:\n1 — só esta parcela\n2 — esta e as próximas\n3 — todas as parcelas","1");if(!v)return;scope=v==="2"?"future":v==="3"?"all":"one";}
 if(!confirm("Confirma excluir o lançamento ou as parcelas selecionadas?"))return;
 const n=E.deleteTx(id,scope);state.selected.delete(id);closeSheet();render();toast(n+" registro(s) excluído(s).");
}
function removeBill(id){
 const b=E.db.bills.find(x=>x.id===id);if(!b)return;let scope="one";
 if(b.seriesId){const v=prompt("Excluir recorrência:\n1 — só esta ocorrência\n2 — esta e próximas\n3 — toda a série","1");if(!v)return;scope=v==="2"?"future":v==="3"?"all":"one";}
 if(!confirm("Confirma excluir as ocorrências escolhidas?"))return;
 const n=E.deleteBill(id,scope);closeSheet();render();toast(n+" ocorrência(s) removida(s).");
}
function run(fn){try{return fn();}catch(e){console.error(e);toast(e.message||"Não foi possível concluir.");}}
function click(event){
 const element=event.target.closest("[data-page],[data-create],[data-act],[data-action]");if(!element)return;
 const ds=element.dataset;
 if(ds.page){go(ds.page);return;}
 if(ds.create){
   const kind=ds.create;
   if(kind==="transaction"){if(ds.type)transactionForm(ds.type);else chooseAdd();}
   else ({bill:billForm,account:accountForm,card:cardForm,subscription:subscriptionForm,investment:investmentForm,category:categoryForm}[kind]||(()=>{}))();
   return;
 }
 if(ds.action==="more"||ds.action==="mobileMore"){
   if(ds.action==="more"){
     const menu=$("#moreMenu"),opening=menu.classList.contains("hidden");menu.classList.toggle("hidden",!opening);$("#moreButton").setAttribute("aria-expanded",String(opening));
   }else sheet("Mais opções",`<div style="display:grid;gap:9px">${[["accounts","Minhas contas"],["cards","Cartões"],["investments","Investimentos"],["subscriptions","Assinaturas"],["settings","Configurações"]].map(([k,n])=>`<button type="button" class="quick-choice" data-page="${k}"><span>↗</span><strong>${n}</strong></button>`).join("")}</div>`,"NAVEGAÇÃO");
   return;
 }
 if(ds.action==="theme"){applyTheme(document.documentElement.dataset.theme==="light"?"dark":"light");return;}
 const a=ds.act,id=ds.id,day=ds.date;
 if(!a)return;
 run(()=>{
   if(a==="close"){closeSheet();return;}
   if(a==="prevMonth"||a==="nextMonth"){state.month=R.month(R.addMonths(state.month+"-01",a==="prevMonth"?-1:1));state.selectedDay="";render();return;}
   if(a==="filterType"){state.kindFilter=ds.type;render();return;}
   if(a==="selectDay"){state.selectedDay=state.selectedDay===day?"":day;render();return;}
   if(a==="clearDay"){state.selectedDay="";render();return;}
   if(a==="selectCard"){state.cardId=id;render();return;}
   if(a==="selectTxType"){transactionForm(ds.type);return;}
   if(a==="openTxDetail"){txDetail(id);return;}
   if(a==="openBill"){billDetail(id);return;}
   if(a==="openInvoice"){invoiceDetail(id,day);return;}
   if(a==="openSubscription"){subscriptionDetail(id);return;}
   if(a==="editTransaction"){transactionForm("expense",id);return;}
   if(a==="editBill"){billForm(id);return;}
   if(a==="editCard"){cardForm(id);return;}
   if(a==="editAccount"){accountForm(id);return;}
   if(a==="editCategory"){categoryForm(id);return;}
   if(a==="editSubscription"){subscriptionForm(id);return;}
   if(a==="editInvestment"){investmentForm(id);return;}
   if(a==="payInvoice"){paymentForm(id,day);return;}
   if(a==="bulkCategory"){bulkForm();return;}
   if(a==="quickCategory"){const input=prompt("Nome da categoria:");if(!input)return;const kind=$("#sheetBody [name=type]")?.value==="income"?"income":"expense";E.category({name:input,kind,color:"#bdf379",icon:"🏷️"});const current=E.db.categories[E.db.categories.length-1],select=$("#sheetBody [name=categoryId]");if(select){select.innerHTML=categoryOpts(current.id);select.value=current.id;}toast("Categoria criada sem sair do lançamento.");return;}
   if(a==="toggleBill"){E.toggleBill(id);closeSheet();render();toast("Situação do pagamento atualizada.");return;}
   if(a==="deleteBill"){removeBill(id);return;}
   if(a==="deleteTransaction"){removeTransaction(id);return;}
   if(a==="duplicateTransaction"){E.duplicate(id);closeSheet();render();toast("Lançamento duplicado.");return;}
   if(a==="toggleSubscription"){E.statusSubscription(id);closeSheet();render();toast("Assinatura atualizada.");return;}
   if(a==="chargeSubscription"){if(!confirm("Registrar esta cobrança na demonstração?"))return;E.chargeSubscription(id);closeSheet();render();toast("Cobrança registrada uma vez.");return;}
   if(a==="deleteSubscription"){if(!confirm("Excluir a assinatura? Cobranças já lançadas serão mantidas."))return;E.removeSubscription(id);closeSheet();render();toast("Assinatura removida.");return;}
   if(a==="archiveCategory"){E.archiveCategory(id);render();toast("Categoria alterada sem mexer no histórico.");return;}
   if(a==="deleteAccount"){if(!confirm("Excluir conta sem vínculos?"))return;E.removeAccount(id);closeSheet();render();toast("Conta removida.");return;}
   if(a==="deleteCard"){if(!confirm("Excluir cartão sem vínculos?"))return;E.removeCard(id);closeSheet();render();toast("Cartão removido.");return;}
   if(a==="deleteInvestment"){if(!confirm("Excluir investimento sem movimentações?"))return;E.removeInvestment(id);closeSheet();render();toast("Investimento removido.");return;}
   if(a==="reversePayment"){if(!confirm("Reverter pagamento desta fatura?"))return;E.cancelPayment(id);closeSheet();render();toast("Pagamento revertido.");return;}
   if(a==="themeDark"){applyTheme("dark");return;}
   if(a==="themeLight"){applyTheme("light");return;}
   if(a==="resetDemo"){if(!confirm("Reiniciar APENAS os dados fictícios desta segunda página de teste?"))return;E.reset();state.month=R.month(R.today());state.selected.clear();state.cardId=E.db.cards[0]?.id;closeSheet();go("home");toast("Apenas o Teste 2 foi reiniciado.");return;}
   if(a==="exportDemo"){
     const blob=new Blob([E.exportData()],{type:"application/json"}),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download="meu-financeiro-teste2-demo.json";anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast("Backup demonstrativo exportado.");return;
   }
   if(a==="runUnitTests"){
     const results=window.FinanceLabTests(R,window.FinanceDemoSeed,window.FinanceLabEngine),passed=results.filter(x=>x.ok).length,div=$("#unitOutput");
     div.innerHTML=`<div class="helper"><b>${passed}/${results.length} testes financeiros aprovados.</b><div style="margin-top:7px">${results.filter(x=>!x.ok).map(x=>`<div class="error">${h(x.name)}: ${h(x.error)}</div>`).join("")||"Todas as regras passaram."}</div></div>`;
     toast(passed===results.length?"Testes financeiros aprovados.":"Há testes com falha.");return;
   }
   if(a==="refreshCDI"){fetchCDI();return;}
 });
}
async function fetchCDI(){
 toast("Consultando CDI diário no Banco Central...");
 try{
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);let response;
   try{response=await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json",{signal:ctrl.signal,cache:"no-store"});}
   finally{clearTimeout(timer);}
   if(!response.ok)throw Error("Não foi possível consultar o Banco Central");
   const values=await response.json(),item=Array.isArray(values)?values.at(-1):null,n=Number(String(item?.valor||"").replace(",","."));
   if(!Number.isFinite(n)||n<=0||n>1)throw Error("A taxa retornada não é válida.");
   E.db.settings.dailyCDIPct=n;E.db.settings.CDIDate=item.data;E.persist();render();toast("CDI diário atualizado com o Banco Central.");
 }catch(e){toast("Sem atualização: "+e.message+". Taxa didática preservada.");}
}
function submit(event){
 const form=event.target.closest("form[data-form]");if(!form)return;
 event.preventDefault();
 const mode=form.dataset.form,id=form.dataset.id||null,data=Object.fromEntries(new FormData(form).entries()),submitButton=form.querySelector("button[type=submit]");
 submitButton.disabled=true;
 try{
   if(mode==="transaction"){
     if(id)data.type=E.db.transactions.find(x=>x.id===id)?.type;
     const rows=E.tx(data,id);toast(id?"Lançamento atualizado.":rows.length>1?`${rows.length} parcelas cadastradas.`:"Lançamento criado.");
   }else if(mode==="bill"){
     if(id&&!data.recurrence)data.recurrence=E.db.bills.find(b=>b.id===id)?.recurrence;
     E.bill(data,id,data.scope||"one");toast("Compromisso salvo.");
   }else if(mode==="payment"){E.payment(data);toast("Fatura paga sem duplicar despesa.");}
   else if(mode==="account"){E.account(data,id);toast("Conta salva.");}
   else if(mode==="card"){E.card(data,id);toast("Cartão salvo.");}
   else if(mode==="subscription"){E.subscription(data,id);toast("Assinatura salva.");}
   else if(mode==="investment"){E.investment(data,id);toast("Investimento salvo.");}
   else if(mode==="category"){E.category(data,id);toast("Categoria salva, mantendo o histórico.");}
   else if(mode==="bulk"){const n=E.bulk([...state.selected],data.categoryId);state.selected.clear();toast(n+" lançamentos categorizados.");}
   closeSheet();render();
 }catch(e){const el=form.querySelector("#formError");if(el)el.textContent=e.message;else toast(e.message);console.error(e);submitButton.disabled=false;}
}
function change(event){
 const el=event.target;
 if(el.id==="activeMonth"&&/^\d{4}-\d{2}$/.test(el.value)){state.month=el.value;state.selectedDay="";render();return;}
 if(el.name==="type"&&el.closest("form[data-form='transaction']")){refreshTransactionFields();return;}
 if(el.id==="positionDate"&&el.value){state.positionDate=el.value;render();return;}
 if(["simMonthly","simPct","simYears"].includes(el.id)){
   const m=Number($("#simMonthly")?.value),p=Number($("#simPct")?.value),y=Number($("#simYears")?.value);
   if([m,p,y].every(Number.isFinite)&&m>=0&&p>=0&&p<=500&&y>=1&&y<=10){state.simMonthly=m;state.simPct=p;state.simYears=y;render();}
   return;
 }
 if(el.matches("[data-select]")){
   if(el.checked)state.selected.add(el.dataset.select);else state.selected.delete(el.dataset.select);
   const b=$("#bulkButton");if(b){b.disabled=!state.selected.size;b.textContent=`Alterar categoria (${state.selected.size})`;}return;
 }
 if(el.id==="selectAll"){
   $$("[data-select]").forEach(c=>{c.checked=el.checked;if(el.checked)state.selected.add(c.dataset.select);else state.selected.delete(c.dataset.select);});
   const b=$("#bulkButton");if(b){b.disabled=!state.selected.size;b.textContent=`Alterar categoria (${state.selected.size})`;}return;
 }
 if(el.id==="importDemo"){
   const f=el.files?.[0];if(!f)return;if(f.size>3_000_000)return toast("Arquivo muito grande.");
   if(!confirm("Importar SOMENTE dados fictícios para o Teste 2?"))return;
   f.text().then(s=>{E.load(JSON.parse(s));state.selected.clear();state.month=R.month(R.today());render();toast("Backup de demonstração importado.");}).catch(e=>toast("Falha na importação: "+e.message));
 }
}
function input(event){
 const el=event.target;
 if(el.id==="searchActivity"){state.search=el.value;const host=$("#activityRows");if(host)host.innerHTML=V.activityRows(E.db,state);}
}
document.addEventListener("click",click);
document.addEventListener("submit",submit);
document.addEventListener("change",change);
document.addEventListener("input",input);
document.addEventListener("keydown",event=>{if(event.key==="Escape"){closeSheet();$("#moreMenu").classList.add("hidden");}});
$("#sheetBackdrop").addEventListener("click",event=>{if(event.target===$("#sheetBackdrop"))closeSheet();});
render();
window.FinanceStudioDebug={getData:()=>JSON.parse(JSON.stringify(E.db)),getPage:()=>state.page,getStats:m=>R.stats(E.db,m),runUnitTests:()=>window.FinanceLabTests(R,window.FinanceDemoSeed,window.FinanceLabEngine)};
})();
