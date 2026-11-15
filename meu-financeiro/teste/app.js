(function FinanceLabApp() {
 "use strict";
 const R=window.FinanceRules, E=window.FinanceLabEngine(R,window.FinanceDemoSeed), V=window.FinanceLabViews(R);
 const $=selector=>document.querySelector(selector), H=V.h;
 const state={page:"dashboard",month:E.db.settings.month||R.month(R.today()),search:"",filterType:"all",filterCategory:"all",selected:new Set(),selectedCard:E.db.cards[0]?.id,selectedAccount:E.db.accounts[0]?.id,positionDate:R.today(),projectionContribution:null,projectionPct:100,projectionYears:5};
 const titles={dashboard:["VISÃO FINANCEIRA","Visão geral"],movements:["ORGANIZAÇÃO","Lançamentos"],accounts:["PATRIMÔNIO","Minhas contas"],cards:["CRÉDITO","Cartões de crédito"],calendar:["AGENDA","Calendário financeiro"],subscriptions:["RECORRÊNCIA","Assinaturas"],investments:["PATRIMÔNIO","Investimentos"],settings:["PERSONALIZAÇÃO","Configurações"]};
 function toast(msg){const t=$("#toast");t.textContent=String(msg||"");t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),3500);}
 function render(){
   const [eye,title]=titles[state.page]||titles.dashboard;
   $("#pageEyebrow").textContent=eye;$("#pageTitle").textContent=title;
   document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===state.page));
   const handlers={dashboard:V.dashboard,movements:V.movements,accounts:V.accounts,cards:V.cards,calendar:V.calendar,subscriptions:V.subscriptions,investments:V.investments,settings:V.settings};
   try{$("#workspace").innerHTML=handlers[state.page](E.db,state);}catch(e){$("#workspace").innerHTML=`<div class="hint-panel"><strong>Erro ao carregar tela:</strong> ${H(e.message)}</div>`;console.error(e);}
   $("#sidebar").classList.remove("open");
 }
 function navigate(p){if(!titles[p])return;state.page=p;state.selected.clear();render();window.scrollTo({top:0,behavior:"smooth"});}
 function modal(title,body,eyebrow="REGISTRO FINANCEIRO"){
   $("#dialogKicker").textContent=eyebrow;$("#dialogTitle").textContent=title;$("#dialogBody").innerHTML=body;$("#dialogBackdrop").classList.remove("hidden");
   document.body.style.overflow="hidden";
   const first=$("#dialogBody input:not([type=hidden]),#dialogBody select");if(first)setTimeout(()=>first.focus(),50);
 }
 function close(){document.body.style.overflow="";$("#dialogBackdrop").classList.add("hidden");$("#dialogBody").innerHTML="";}
 function opt(items,selected,placeholder="Selecione"){
   return `<option value="">${H(placeholder)}</option>${items.map(x=>`<option value="${H(x.id)}" ${x.id===selected?"selected":""}>${H(x.name)}</option>`).join("")}`;
 }
 function categories(selected,kind=null){const list=E.db.categories.filter(x=>!x.archived||x.id===selected);return `<option value="">Sem categoria</option>${list.map(c=>`<option value="${H(c.id)}" ${c.id===selected?"selected":""}>${H(c.name)}</option>`).join("")}`;}
 function accounts(selected){return opt(E.db.accounts,selected,"Escolha a conta");}
 function cards(selected){return opt(E.db.cards,selected,"Escolha o cartão");}
 function invs(selected){return opt(E.db.investments,selected,"Escolha o investimento");}
 const num=c=>((Number(c)||0)/100).toFixed(2);
 const input=(name,label,value="",type="text",extra="")=>`<div class="field"><label for="field_${H(name)}">${H(label)}</label><input id="field_${H(name)}" name="${H(name)}" type="${H(type)}" value="${H(value)}" ${extra}></div>`;
 const select=(name,label,content,extra="")=>`<div class="field"><label for="field_${H(name)}">${H(label)}</label><select id="field_${H(name)}" name="${H(name)}" ${extra}>${content}</select></div>`;
 function formActions(label="Salvar"){return `<div class="form-actions wide"><button type="button" class="ghost-btn" data-action="close">Cancelar</button><button type="submit" class="primary-btn">${H(label)}</button></div><div id="formError" class="red tiny wide" role="alert"></div>`;}
 function typeOpts(sel){return [["expense","Despesa"],["income","Receita"],["card","Compra no cartão"],["transfer","Transferência"],["investment","Aporte em investimento"],["rescue","Resgate de investimento"]].map(([val,label])=>`<option value="${val}" ${val===sel?"selected":""}>${label}</option>`).join("");}
 function openTx(type="expense",id=null,investmentId=null){
   const old=id?E.db.transactions.find(x=>x.id===id):null;if(id&&!old)return toast("Lançamento não encontrado.");
   type=old?.type||type;
   const v={type,desc:old?.desc||"",date:old?.date||R.today(),amount:old?num(old.amount):"",categoryId:old?.categoryId||"",accountId:old?.accountId||E.db.accounts[0]?.id,cardId:old?.cardId||E.db.cards[0]?.id,toAccountId:old?.toAccountId||E.db.accounts[1]?.id,investmentId:old?.investmentId||investmentId||E.db.investments[0]?.id,installmentTotal:old?.installmentTotal||1,installmentCurrent:old?.installmentNo||1};
   if(!E.db.accounts.length)return toast("Cadastre primeiro uma conta bancária.");
   const kind=type==="income"?"Receita":type==="expense"?"Despesa":type==="card"?"Compra no cartão":type==="transfer"?"Transferência":type==="investment"?"Aporte":"Resgate";
   modal(old?"Editar lançamento":"Novo lançamento",`<form id="dynamicForm" data-form="transaction" data-id="${H(id||"")}" class="form-grid">
   ${select("type","Tipo de lançamento",typeOpts(type),old?"disabled":"")}
   ${input("desc","Descrição",v.desc,"text",'required maxlength="100" placeholder="Ex.: Supermercado"')}
   ${input("amount",type==="card"&&!old?"Valor total da compra (R$)":"Valor (R$)",v.amount,"number",'required min="0.01" step="0.01"')}
   ${input("date","Data",v.date,"date","required")}
   <div class="field" data-txwhen="all"><label for="field_categoryId">Categoria</label><select id="field_categoryId" name="categoryId">${categories(v.categoryId)}</select></div>
   <div data-txwhen="account" class="field"><label for="field_accountId">Conta bancária</label><select name="accountId" id="field_accountId">${accounts(v.accountId)}</select></div>
   <div data-txwhen="card" class="field"><label for="field_cardId">Cartão</label><select name="cardId" id="field_cardId">${cards(v.cardId)}</select></div>
   <div data-txwhen="transfer" class="field"><label for="field_toAccountId">Conta destino</label><select name="toAccountId" id="field_toAccountId">${accounts(v.toAccountId)}</select></div>
   <div data-txwhen="investment" class="field"><label for="field_investmentId">Produto de investimento</label><select name="investmentId" id="field_investmentId">${invs(v.investmentId)}</select></div>
   <div data-txwhen="card-new" class="field"><label for="field_installmentTotal">Número de parcelas</label><input id="field_installmentTotal" name="installmentTotal" type="number" min="1" max="120" value="${v.installmentTotal}"></div>
   <div data-txwhen="card-new" class="field"><label for="field_installmentCurrent">Parcela atual</label><input id="field_installmentCurrent" name="installmentCurrent" type="number" min="1" max="120" value="${v.installmentCurrent}"></div>
   ${old?.groupId?`<div class="hint-panel wide">Edição desta parcela. Use Excluir para selecionar o escopo de um parcelamento.</div>`:""}
   <div class="hint-panel wide" id="txHelp">Lançamentos atualizam o dashboard e os saldos da demonstração.</div>${formActions(old?"Salvar alterações":"Registrar lançamento")}
   </form>`,kind.toUpperCase());
   toggleTx();
 }
 function toggleTx(){
   const f=$("#dynamicForm");if(!f||f.dataset.form!=="transaction")return;
   const kind=f.querySelector('[name="type"]').value,editing=!!f.dataset.id;
   for(const node of f.querySelectorAll("[data-txwhen]")){
     const key=node.dataset.txwhen,show=key==="all"||(key==="account"&&kind!=="card")||(key==="card"&&kind==="card")||(key==="transfer"&&kind==="transfer")||(key==="investment"&&["investment","rescue"].includes(kind))||(key==="card-new"&&kind==="card"&&!editing);
     node.classList.toggle("hidden",!show);node.querySelectorAll("input,select,textarea").forEach(i=>i.disabled=!show);
   }
   const help=$("#txHelp");if(help)help.textContent=kind==="card"?"A compra será distribuída nas faturas pelo fechamento do cartão. O pagamento da fatura não duplica o gasto.":kind==="investment"?"Aporte diminui o caixa, mas aumenta a carteira, sem entrar nas despesas.":kind==="rescue"?"Resgate aumenta o caixa e reduz a carteira.":kind==="transfer"?"Transferências movimentam duas contas, mas não são receitas nem despesas.":"O lançamento será refletido na competência selecionada.";
 }
 function openAccount(id=null){
   const a=id?E.db.accounts.find(x=>x.id===id):null;
   modal(a?"Editar conta":"Nova conta",`<form data-form="account" data-id="${H(id||"")}" class="form-grid">${input("name","Nome",a?.name||"","text","required")}${input("bank","Instituição",a?.bank||"","text","required")}${input("opening","Saldo inicial (R$)",num(a?.opening||0),"number",'step="0.01" required')}${input("color","Cor",a?.color||"#5e8aff","color")}${formActions()}</form>${a?`<button class="danger-btn" data-action="removeAccount" data-id="${H(id)}">Excluir conta sem vínculos</button>`:""}`,"CONTAS");
 }
 function openCard(id=null){
   const c=id?E.db.cards.find(x=>x.id===id):null;
   modal(c?"Editar cartão":"Novo cartão",`<form data-form="card" data-id="${H(id||"")}" class="form-grid">${input("name","Nome",c?.name||"","text","required")}${input("bank","Instituição",c?.bank||"","text","required")}${input("limit","Limite total (R$)",num(c?.limit||0),"number",'step=".01" min=".01" required')}${input("closingDay","Dia do fechamento",c?.closingDay||27,"number",'min="1" max="31" required')}${input("dueDay","Dia do vencimento",c?.dueDay||3,"number",'min="1" max="31" required')}${input("color","Cor",c?.color||"#8170ff","color")}${formActions()}</form>${c?`<button class="danger-btn" data-action="removeCard" data-id="${H(id)}">Excluir cartão sem vínculos</button>`:""}`,"CARTÕES");
 }
 function openBill(id=null){
   const b=id?E.db.bills.find(x=>x.id===id):null;
   modal(b?"Editar conta a pagar":"Nova conta a pagar",`<form data-form="bill" data-id="${H(id||"")}" class="form-grid">
   ${input("name","Descrição",b?.name||"","text","required")}
   ${input("amount","Valor (R$)",b?num(b.amount):"","number",'min=".01" step=".01" required')}
   ${input("dueDate","Vencimento",b?.dueDate||R.addDays(R.today(),5),"date","required")}
   ${select("recurrence","Recorrência",["Nenhuma","Semanal","Mensal","Bimestral","Trimestral","Semestral","Anual"].map(x=>`<option value="${x}" ${(b?.recurrence||"Nenhuma")===x?"selected":""}>${x}</option>`).join(""),b?"disabled":"")}
   ${select("categoryId","Categoria",categories(b?.categoryId))}
   ${select("accountId","Conta do pagamento",accounts(b?.accountId||E.db.accounts[0]?.id))}
   ${b?.seriesId?select("scope","Aplicar alteração",'<option value="one">Somente esta ocorrência</option><option value="future">Esta e próximas</option><option value="all">Toda a série</option>'):""}
   <div class="hint-panel wide">${b?"A alteração preserva o status individual de cada ocorrência.":"Conta recorrente gera vencimentos sem duplicar o cadastro."}</div>${formActions(b?"Salvar alterações":"Criar conta a pagar")}</form>
   ${b?`<div class="flex mt"><button class="soft-btn" data-action="toggleBill" data-id="${H(id)}">${b.paidAt?"Reverter pagamento":"Marcar como paga"}</button><button class="danger-btn" data-action="deleteBill" data-id="${H(id)}">Excluir conta</button></div>`:""}`,"COMPROMISSOS");
 }
 function openSubscription(id=null){
   const x=id?E.db.subscriptions.find(s=>s.id===id):null;
   modal(x?"Editar assinatura":"Nova assinatura",`<form data-form="subscription" data-id="${H(id||"")}" class="form-grid">
   ${input("name","Serviço",x?.name||"","text","required")}
   ${input("amount","Valor por cobrança (R$)",x?num(x.amount):"","number",'min=".01" step=".01" required')}
   ${input("nextDate","Próxima cobrança",x?.nextDate||R.today(),"date","required")}
   ${select("recurrence","Periodicidade",["Semanal","Mensal","Bimestral","Trimestral","Semestral","Anual"].map(v=>`<option value="${v}" ${(x?.recurrence||"Mensal")===v?"selected":""}>${v}</option>`).join(""))}
   ${select("categoryId","Categoria",categories(x?.categoryId))}
   ${select("cardId","Cartão (opcional)",cards(x?.cardId))}
   ${select("accountId","Conta, se não houver cartão",accounts(x?.accountId||E.db.accounts[0]?.id))}
   ${select("status","Status",["Ativa","Pausada","Cancelada"].map(v=>`<option value="${v}" ${(x?.status||"Ativa")===v?"selected":""}>${v}</option>`).join(""))}
   <div class="hint-panel wide">A previsão só vira despesa lançada depois de registrar a cobrança.</div>${formActions()}</form>
   ${x?`<div class="flex mt"><button class="soft-btn" data-action="chargeSubscription" data-id="${H(id)}">Registrar cobrança</button><button class="danger-btn" data-action="removeSubscription" data-id="${H(id)}">Excluir assinatura</button></div>`:""}`,"ASSINATURAS");
 }
 function openInvestment(id=null){
   const x=id?E.db.investments.find(t=>t.id===id):null;
   modal(x?"Editar investimento":"Novo investimento",`<form data-form="investment" data-id="${H(id||"")}" class="form-grid">
   ${input("name","Produto",x?.name||"","text","required")}
   ${input("institution","Instituição",x?.institution||"","text","required")}
   ${input("startDate","Data inicial",x?.startDate||R.today(),"date","required")}
   ${input("opening","Saldo aplicado inicial (R$)",x?num(x.opening):"0.00","number",'min="0" step=".01" required')}
   ${input("cdiPercent","Percentual do CDI (%)",x?.cdiPercent??100,"number",'min="0" max="500" step="1" required')}
   ${input("monthlyPlan","Aporte planejado/mês (R$)",x?num(x.monthlyPlan):"0.00","number",'min="0" step=".01" required')}
   ${select("risk","Risco",["Baixo","Médio","Alto"].map(z=>`<option value="${z}" ${x?.risk===z?"selected":""}>${z}</option>`).join(""))}
   <p class="note wide">O valor estimado é ilustrativo. Registre aportes/resgates na página de Lançamentos ou no cartão de cada investimento.</p>${formActions()}</form>
   ${x?`<button class="danger-btn" data-action="removeInvestment" data-id="${H(id)}">Excluir investimento sem movimentações</button>`:""}`,"INVESTIMENTOS");
 }
 function openCategory(id=null){
   const c=id?E.db.categories.find(x=>x.id===id):null;
   modal(c?"Editar categoria":"Nova categoria",`<form data-form="category" data-id="${H(id||"")}" class="form-grid">
   ${input("name","Nome",c?.name||"","text",'required maxlength="60"')}
   ${select("kind","Tipo",["expense","income","investment"].map(x=>`<option value="${x}" ${x===(c?.kind||"expense")?"selected":""}>${x==="expense"?"Despesa":x==="income"?"Receita":"Investimento"}</option>`).join(""))}
   ${input("color","Cor",c?.color||"#8170ff","color")}
   <div class="hint-panel wide">Renomear a categoria mantém os vínculos de todo o histórico, pois os lançamentos referenciam seu identificador.</div>${formActions()}</form>`,"CATEGORIAS");
 }
 function openBulk(){
   if(!state.selected.size)return toast("Selecione ao menos um lançamento.");
   modal("Mudar categorias em lote",`<form data-form="bulk" class="form-grid"><div class="hint-panel wide">${state.selected.size} lançamento(s) selecionado(s). A operação não exclui registros.</div>${select("categoryId","Nova categoria",categories(null),'required')}${formActions("Aplicar categoria")}</form>`,"EDIÇÃO EM LOTE");
 }
 function openPayment(cardId,dueDate){
   const inv=R.invoice(E.db,cardId,dueDate),c=E.db.cards.find(x=>x.id===cardId);
   if(!c||inv.pending<=0)return toast("Fatura não tem saldo aberto.");
   modal("Pagar fatura",`<form data-form="payment" class="form-grid"><input type="hidden" name="cardId" value="${H(cardId)}"><input type="hidden" name="dueDate" value="${H(dueDate)}">
   <div class="hint-panel wide"><strong>${H(c.name)}</strong> · Vencimento ${V.dt(dueDate)}<br>Fatura: ${R.fmt(inv.charges)} · Já pago: ${R.fmt(inv.paid)}<br><strong>Em aberto: ${R.fmt(inv.pending)}</strong></div>
   ${select("accountId","Conta de origem",accounts(E.db.accounts[0]?.id),"required")}
   ${input("amount","Valor do pagamento (R$)",num(inv.pending),"number",'required min=".01" step=".01"')}
   ${input("date","Data de pagamento",R.today(),"date","required")}
   <p class="note wide">Pagamento diminui somente o saldo da conta. A despesa das parcelas já está registrada nas competências próprias.</p>${formActions("Registrar pagamento")}</form>`,"PAGAMENTO DE CARTÃO");
 }
 function detail(kind,id,date){
   const db=E.db;
   if(kind==="transaction"){
     const t=db.transactions.find(x=>x.id===id);if(!t)return toast("Lançamento não encontrado.");
     const isCard=t.type==="card";
     modal(t.desc,`<div class="detail-grid mb"><div class="cell"><small>Valor</small><strong>${R.fmt(t.amount)}</strong></div><div class="cell"><small>Data</small><strong>${V.dt(t.date)}</strong></div><div class="cell"><small>Tipo</small><strong>${V.type[t.type]}</strong></div></div>
     <p class="muted">Categoria: <strong>${H(V.cName(db,t.categoryId))}</strong></p>${isCard?`<div class="hint-panel">Cartão: ${H(V.card(db,t.cardId))} · Parcela ${t.installmentNo||1}/${t.installmentTotal||1}<br>Vencimento da fatura: ${V.dt(t.invoiceDue)}</div>`:""}
     <div class="flex mt"><button class="primary-btn" data-edit="transaction" data-id="${H(id)}">Editar</button><button class="soft-btn" data-action="duplicateTx" data-id="${H(id)}">Duplicar</button><button class="danger-btn" data-action="deleteTx" data-id="${H(id)}">Excluir</button></div>`,"DETALHES DO LANÇAMENTO");return;
   }
   if(kind==="bill"){
     const b=db.bills.find(x=>x.id===id);if(!b)return toast("Conta não encontrada.");
     modal(b.name,`<div class="detail-grid mb"><div class="cell"><small>Valor</small><strong>${R.fmt(b.amount)}</strong></div><div class="cell"><small>Vencimento</small><strong>${V.dt(b.dueDate)}</strong></div><div class="cell"><small>Status</small><strong class="${b.paidAt?"green":"amber"}">${b.paidAt?"Paga":"Pendente"}</strong></div></div>
     <p class="muted">Categoria: ${H(V.cName(db,b.categoryId))} · Conta: ${H(V.acct(db,b.accountId))}</p><div class="flex mt"><button class="primary-btn" data-action="toggleBill" data-id="${H(id)}">${b.paidAt?"Reverter pagamento":"Marcar como paga"}</button><button class="soft-btn" data-edit="bill" data-id="${H(id)}">Editar</button><button class="danger-btn" data-action="deleteBill" data-id="${H(id)}">Excluir</button></div>`,"CONTA A PAGAR");return;
   }
   if(kind==="invoice"){
     const c=db.cards.find(x=>x.id===id);if(!c)return toast("Cartão não encontrado.");
     const inv=R.invoice(db,id,date),tx=db.transactions.filter(t=>t.type==="card"&&t.cardId===id&&t.invoiceDue===date),paid=db.invoicePayments.filter(p=>p.cardId===id&&p.dueDate===date);
     modal("Fatura "+c.name,`<div class="detail-grid mb"><div class="cell"><small>Vencimento</small><strong>${V.dt(date)}</strong></div><div class="cell"><small>Total</small><strong>${R.fmt(inv.charges)}</strong></div><div class="cell"><small>Em aberto</small><strong class="amber">${R.fmt(inv.pending)}</strong></div></div><h3>Parcelas e compras</h3>
     <div class="feed mb">${tx.map(t=>V.feedRow("▰",t.desc,`${t.installmentNo||1}/${t.installmentTotal||1} · ${V.dt(t.date)}`,R.fmt(t.amount),"red",`data-detail="transaction" data-id="${H(t.id)}"`)).join("")||V.empty("Sem compras.")}</div>
     ${paid.length?`<h3>Pagamentos realizados</h3><div class="feed">${paid.map(p=>V.feedRow("✓","Pagamento registrado",V.dt(p.date)+" · "+V.acct(db,p.accountId),R.fmt(p.amount),"green")).join("")}</div><div class="flex mt">${paid.map(p=>`<button class="ghost-btn" data-action="cancelPayment" data-id="${H(p.id)}">Reverter pagamento ${R.fmt(p.amount)}</button>`).join("")}</div>`:""}
     <div class="flex mt">${inv.pending>0?`<button class="primary-btn" data-action="payInvoice" data-id="${H(id)}" data-date="${H(date)}">Pagar ${R.fmt(inv.pending)}</button>`:"<span class='pill success'>Fatura quitada</span>"}</div>`,"DETALHE DA FATURA");return;
   }
   if(kind==="subscription"){
     const s=db.subscriptions.find(x=>x.id===id);if(!s)return toast("Assinatura não encontrada.");
     modal(s.name,`<div class="detail-grid mb"><div class="cell"><small>Valor</small><strong>${R.fmt(s.amount)}</strong></div><div class="cell"><small>Próxima cobrança</small><strong>${V.dt(s.nextDate)}</strong></div><div class="cell"><small>Status</small><strong>${H(s.status)}</strong></div></div>
     <p class="muted">${H(s.cardId?V.card(db,s.cardId):V.acct(db,s.accountId))} · ${H(s.recurrence)}</p><div class="flex mt"><button class="primary-btn" data-edit="subscription" data-id="${H(id)}">Editar</button><button class="soft-btn" data-action="chargeSubscription" data-id="${H(id)}">Registrar cobrança</button></div>`,"ASSINATURA");return;
   }
 }
 function more(){
   modal("Outras páginas",`<div class="option-grid">${[["accounts","▤","Contas"],["cards","▰","Cartões"],["subscriptions","⟳","Assinaturas"],["investments","◈","Investimentos"],["settings","⚙","Configurações"],["dashboard","▦","Dashboard"]].map(x=>`<button class="option-card" data-nav="${x[0]}"><span>${x[1]}</span><strong>${x[2]}</strong></button>`).join("")}</div>`,"NAVEGAÇÃO");
 }
 function deleteTransaction(id){
   const row=E.db.transactions.find(t=>t.id===id);if(!row)return;
   let scope="one";if(row.groupId&&row.installmentTotal>1){const entered=prompt("Excluir parcelamento:\n1 = somente esta parcela\n2 = esta e próximas\n3 = compra inteira","1");if(!entered)return;scope=entered==="2"?"future":entered==="3"?"all":"one";}
   if(!confirm(scope==="one"?"Excluir este lançamento?":"Excluir as parcelas selecionadas?"))return;
   const count=E.deleteTx(id,scope);close();state.selected.delete(id);render();toast(count+" registro(s) excluído(s).");
 }
 function deleteBill(id){
   const b=E.db.bills.find(x=>x.id===id);if(!b)return;let scope="one";
   if(b.seriesId){const answer=prompt("Excluir conta recorrente:\n1 = somente esta\n2 = esta e próximas\n3 = todas as ocorrências","1");if(!answer)return;scope=answer==="2"?"future":answer==="3"?"all":"one";}
   if(!confirm("Excluir as ocorrências selecionadas?"))return;
   const count=E.deleteBill(id,scope);close();render();toast(count+" ocorrência(s) excluída(s).");
 }
 const resolve=(handler)=>{try{handler();}catch(e){console.error(e);toast(e.message||"Não foi possível concluir a operação.");}};
 function click(e){
   const btn=e.target.closest("button,[data-detail],[data-nav],[data-add],[data-create],[data-edit],[data-action]");
   if(!btn)return;
   if(btn.dataset.nav){const p=btn.dataset.nav;close();navigate(p);return;}
   if(btn.dataset.add){openTx(btn.dataset.add,null,btn.dataset.id||null);return;}
   if(btn.dataset.create){({account:openAccount,card:openCard,bill:openBill,subscription:openSubscription,investment:openInvestment,category:openCategory}[btn.dataset.create])?.();return;}
   if(btn.dataset.edit){const kind=btn.dataset.edit,id=btn.dataset.id;({account:openAccount,card:openCard,bill:openBill,transaction:(id)=>openTx("expense",id),subscription:openSubscription,investment:openInvestment,category:openCategory}[kind])?.(id);return;}
   if(btn.dataset.detail){detail(btn.dataset.detail,btn.dataset.id,btn.dataset.date);return;}
   if(!btn.dataset.action)return;
   const action=btn.dataset.action,id=btn.dataset.id;
   resolve(()=>{
     if(action==="close"){close();return;}
     if(action==="more"){more();return;}
     if(action==="prevMonth"||action==="nextMonth"){state.month=R.month(R.addMonths(state.month+"-01",action==="prevMonth"?-1:1));render();return;}
     if(action==="nowMonth"){state.month=R.month(R.today());render();return;}
     if(action==="selectCard"){state.selectedCard=id;render();return;}
     if(action==="selectAccount"){state.selectedAccount=id;render();return;}
     if(action==="payInvoice"){openPayment(id,btn.dataset.date);return;}
     if(action==="toggleBill"){E.toggleBill(id);close();render();toast("Pagamento da conta atualizado.");return;}
     if(action==="deleteBill"){deleteBill(id);return;}
     if(action==="deleteTx"){deleteTransaction(id);return;}
     if(action==="duplicateTx"){E.duplicate(id);close();render();toast("Lançamento duplicado.");return;}
     if(action==="bulkCategory"){openBulk();return;}
     if(action==="clearSelection"){state.selected.clear();render();return;}
     if(action==="toggleSubscription"){E.statusSubscription(id);render();toast("Status da assinatura atualizado.");return;}
     if(action==="chargeSubscription"){if(!confirm("Registrar a cobrança prevista? O lançamento será criado e a próxima data avançará."))return;E.chargeSubscription(id);close();render();toast("Cobrança registrada sem duplicar a previsão.");return;}
     if(action==="removeSubscription"){if(!confirm("Excluir esta assinatura? Cobranças já registradas continuarão no histórico."))return;E.removeSubscription(id);close();render();return;}
     if(action==="removeAccount"){if(!confirm("Excluir conta sem vínculo?"))return;E.removeAccount(id);close();render();return;}
     if(action==="removeCard"){if(!confirm("Excluir cartão sem vínculo?"))return;E.removeCard(id);close();render();return;}
     if(action==="removeInvestment"){if(!confirm("Excluir investimento sem aportes?"))return;E.removeInvestment(id);close();render();return;}
     if(action==="archiveCategory"){E.archiveCategory(id);render();toast("Categoria atualizada sem apagar histórico.");return;}
     if(action==="cancelPayment"){if(!confirm("Reverter este pagamento de fatura?"))return;E.cancelPayment(id);close();render();toast("Pagamento revertido.");return;}
     if(action==="reset"){if(!confirm("Reiniciar APENAS os dados fictícios do Laboratório?"))return;E.reset();state.month=R.month(R.today());state.selected.clear();state.selectedCard=E.db.cards[0]?.id;state.selectedAccount=E.db.accounts[0]?.id;close();navigate("dashboard");toast("Demonstração reiniciada. Produção intacta.");return;}
     if(action==="export"){const blob=new Blob([E.exportData()],{type:"application/json"});const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="meu-financeiro-laboratorio-demo.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast("Backup fictício exportado.");return;}
     if(action==="updateCdi"){fetchCdi();return;}
     if(action==="runTests"){runTests();return;}
   });
 }
 async function fetchCdi(){
   const button=document.querySelector('[data-action="updateCdi"]');if(button)button.disabled=true;
   toast("Consultando CDI diário oficial...");
   try{
     const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
     let response;try{response=await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json",{signal:ctrl.signal,cache:"no-store"});}finally{clearTimeout(timer);}
     if(!response.ok)throw Error("Banco Central indisponível ("+response.status+").");
     const data=await response.json(),record=Array.isArray(data)?data[data.length-1]:null;
     const n=Number(String(record?.valor||"").replace(",","."));
     if(!Number.isFinite(n)||n<=0||n>1)throw Error("Resposta inesperada do CDI.");
     E.db.settings.dailyCDIPct=n;E.db.settings.CDIDate=record.data;E.db.settings.cdiSource="Banco Central SGS 12";E.persist();render();toast("CDI atualizado do Banco Central.");
   }catch(e){render();toast("Não foi possível consultar o CDI. Mantida a taxa didática: "+e.message);}
 }
 function formSubmit(event){
   const form=event.target.closest("form[data-form]");if(!form)return;
   event.preventDefault();
   const kind=form.dataset.form,id=form.dataset.id||null,data=Object.fromEntries(new FormData(form).entries()),button=form.querySelector('[type="submit"]');
   if(button)button.disabled=true;
   try{
     if(kind==="transaction"){
       if(id)data.type=E.db.transactions.find(x=>x.id===id)?.type||data.type;
       const rows=E.tx(data,id);toast(id?"Lançamento atualizado.":rows.length>1?`${rows.length} parcelas criadas nas faturas correspondentes.`:"Lançamento salvo.");
     }
     else if(kind==="account"){E.account(data,id);toast("Conta salva.");}
     else if(kind==="card"){E.card(data,id);toast("Cartão salvo.");}
     else if(kind==="bill"){const old=id?E.db.bills.find(b=>b.id===id):null;if(old&&!data.recurrence)data.recurrence=old.recurrence;E.bill(data,id,data.scope||"one");toast("Conta a pagar salva.");}
     else if(kind==="subscription"){E.subscription(data,id);toast("Assinatura salva.");}
     else if(kind==="investment"){E.investment(data,id);toast("Investimento salvo.");}
     else if(kind==="category"){E.category(data,id);toast("Categoria salva e histórico preservado.");}
     else if(kind==="payment"){E.payment(data);toast("Pagamento lançado sem duplicar consumo.");}
     else if(kind==="bulk"){const n=E.bulk([...state.selected],data.categoryId);state.selected.clear();toast(n+" lançamentos atualizados.");}
     close();render();
   }catch(e){console.error(e);const alert=form.querySelector("#formError");if(alert)alert.textContent=e.message;else toast(e.message);if(button)button.disabled=false;}
 }
 function changed(e){
   const el=e.target;
   if(el.id==="periodPicker"){if(/^\d{4}-\d{2}$/.test(el.value)){state.month=el.value;render();}return;}
   if(el.id==="kindFilter"){state.filterType=el.value;render();return;}
   if(el.id==="categoryFilter"){state.filterCategory=el.value;render();return;}
   if(el.id==="positionDate"){if(el.value){state.positionDate=el.value;render();}return;}
   if(el.id==="projectionContribution"||el.id==="projectionPct"||el.id==="projectionYears"){
     const c=Number($("#projectionContribution")?.value||0),p=Number($("#projectionPct")?.value||100),y=Number($("#projectionYears")?.value||5);
     if([c,p,y].every(Number.isFinite)&&c>=0&&p>=0&&p<=500&&y>=1&&y<=10){state.projectionContribution=c;state.projectionPct=p;state.projectionYears=y;render();}
     return;
   }
   if(el.id==="txType"||el.name==="type"&&el.closest('[data-form="transaction"]')){toggleTx();return;}
   if(el.hasAttribute("data-select-tx")){if(el.checked)state.selected.add(el.dataset.selectTx);else state.selected.delete(el.dataset.selectTx);const box=$("#bulkActions");if(box)box.innerHTML=state.selected.size?`<span class="pill purple">${state.selected.size} selecionado(s)</span><button class="soft-btn" data-action="bulkCategory">Mudar categoria</button><button class="ghost-btn" data-action="clearSelection">Limpar seleção</button>`:"<span class='note'>Selecione lançamentos para categorizar em lote.</span>";return;}
   if(el.hasAttribute("data-select-all")){document.querySelectorAll("[data-select-tx]").forEach(b=>{b.checked=el.checked;if(el.checked)state.selected.add(b.dataset.selectTx);else state.selected.delete(b.dataset.selectTx);});const box=$("#bulkActions");if(box)box.innerHTML=state.selected.size?`<span class="pill purple">${state.selected.size} selecionado(s)</span><button class="soft-btn" data-action="bulkCategory">Mudar categoria</button><button class="ghost-btn" data-action="clearSelection">Limpar seleção</button>`:"";return;}
   if(el.id==="importDemo"){const file=el.files?.[0];if(!file)return;if(file.size>3e6){toast("Arquivo maior que 3 MB.");return;}if(!confirm("Substituir APENAS os dados fictícios do Laboratório por este JSON?"))return;file.text().then(t=>{E.load(JSON.parse(t));state.month=R.month(R.today());close();render();toast("Backup demonstrativo carregado.");}).catch(e=>toast("Importação recusada: "+e.message));return;}
 }
 function searchInput(e){if(e.target.id==="movementSearch"){state.search=e.target.value;const host=$("#movementRows");if(host)host.innerHTML=V.movementRows(E.db,state);}}
 function runTests(){
   const suite=window.FinanceLabTests;if(typeof suite!=="function"){toast("Suite de testes não foi carregada.");return;}
   const results=suite(R,window.FinanceDemoSeed,window.FinanceLabEngine);
   const passed=results.filter(x=>x.ok).length,host=$("#testResults");
   if(host)host.innerHTML=`<div class="hint-panel"><strong>${passed}/${results.length} testes aprovados.</strong></div><div class="feed mt">${results.map(x=>`<div class="stat-line"><small>${x.ok?"✓":"✕"} ${H(x.name)}</small><strong class="${x.ok?"green":"red"}">${x.ok?"OK":H(x.error||"Falhou")}</strong></div>`).join("")}</div>`;
   toast(passed===results.length?"Regras financeiras aprovadas.":"Há testes que precisam de correção.");
 }
 document.addEventListener("click",click);
 document.addEventListener("submit",formSubmit);
 document.addEventListener("change",changed);
 document.addEventListener("input",searchInput);
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#dialogBackdrop").classList.contains("hidden"))close();});
 $("#dialogBackdrop").addEventListener("click",e=>{if(e.target.id==="dialogBackdrop")close();});
 $("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
 render();
 window.FinanceLabDebug={getDemo:()=>JSON.parse(JSON.stringify(E.db)),getStats:(m)=>R.stats(E.db,m),getPage:()=>state.page,runTests};
})();
