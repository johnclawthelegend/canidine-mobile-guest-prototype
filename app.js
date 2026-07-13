const API = '/cid-api';
const FALLBACK = {restaurant:'data/terra-cucina.json', allergens:'data/allergens.json'};
const GROUPS = [
  {id:'major',label:'Major allergens',hint:'11 common regulated allergens',icon:'!',items:['gluten','wheat','dairy','milk','eggs','peanuts','tree nuts','soy','fish','shellfish','sesame']},
  {id:'other',label:'Other allergens',hint:'Ingredients frequently requested by guests',icon:'＋',items:['mustard','celery','lupin','sulfites','corn','mushroom','citrus']},
  {id:'allium',label:'Allium family',hint:'Garlic, onion and related ingredients',icon:'◎',items:['garlic','allium','onion']},
  {id:'nightshades',label:'Nightshades',hint:'Tomato, potato, peppers and eggplant',icon:'◇',items:['nightshades','tomato','potato','pepper','eggplant']},
  {id:'animal',label:'Animal products',hint:'Meat and animal-derived ingredients',icon:'○',items:['meat','red meat','poultry','pork','honey']}
];
const DIETS = ['vegan','vegetarian','keto','celiac'];
const EXPANSIONS = {celiac:['gluten','wheat'],gluten:['wheat'],wheat:['gluten'],milk:['dairy'],dairy:['milk']};
const STATUS_ORDER = {clear:0,modify:1,avoid:2};
const LANGUAGES = ['en','es','fr'];
const COPY = {
  en:{meal:'Menu',passportEyebrow:'MAKE THIS MENU YOURS',setNeeds:'Personalize this menu',needsHint:'Choose allergies, diets, or other food needs',edit:'Change',setup:'Start',crossTitle:'Important safety information',crossSub:'Read this if your allergy is serious',current:'CURRENT MENU',allDishes:'All dishes',personalized:'Your menu choices',noConflict:'No match found',modify:'Ask for a change',avoid:'Do not order',rules:'Menu check complete',rulesCopy:'Checked using the restaurant’s current menu information.',sheetEye:'PERSONALIZE YOUR MENU',sheetTitle:'Tell us what you need',selected:'YOUR CHOICES',search:'Search allergies or ingredients',severe:'Severe allergy',severeCopy:'Shared equipment or cross-contact could be dangerous.',diet:'Food preferences',dietCopy:'Only shows dishes the restaurant marks as compatible.',custom:'Something else?',customCopy:'Type another ingredient or food need.',customPlaceholder:'Example: no alcohol or honey',apply:'Show my menu',clear:'Clear',why:'Why?',ingredients:'Ingredients',detected:'Matched',source:'Restaurant information',noResult:'No match found',modifyResult:'Ask for a change',avoidResult:'Do not order',all:'All'},
  es:{meal:'Menú',passportEyebrow:'MI PASAPORTE DE SEGURIDAD',setNeeds:'Configura tus necesidades',needsHint:'Alergias, dietas, condiciones médicas y restricciones',edit:'Editar',setup:'Configurar',crossTitle:'Contacto cruzado y seguridad',crossSub:'Información importante antes de pedir',current:'MENÚ ACTUAL',allDishes:'Todos los platos',personalized:'Tu menú personalizado',noConflict:'Sin conflicto',modify:'Modificar',avoid:'Evitar',rules:'Revisión de reglas completa',rulesCopy:'Los resultados usan los datos públicos actuales del restaurante.',sheetEye:'TU PASAPORTE DE SEGURIDAD',sheetTitle:'¿Qué debe tener en cuenta este menú?',selected:'SELECCIONADO',search:'Buscar alergias o ingredientes',severe:'Modo de alergia grave',severeCopy:'Trata el equipo compartido o contacto cruzado como Evitar hasta confirmarlo con el personal.',diet:'Dietas y condiciones médicas',dietCopy:'Los filtros requieren que el restaurante marque el plato como compatible.',custom:'¿Tienes una restricción poco común?',customCopy:'Descríbela con palabras sencillas. Este prototipo busca términos exactos en los datos públicos.',customPlaceholder:'p. ej., sin alcohol ni miel',apply:'Aplicar al menú',clear:'Borrar',why:'¿Por qué este resultado?',ingredients:'Ingredientes',detected:'Detectado',source:'Fuente',noResult:'Sin conflicto detectado',modifyResult:'Preguntar / Modificar',avoidResult:'Evitar',all:'Todos'},
  fr:{meal:'Menu',passportEyebrow:'MON PASSEPORT SÉCURITÉ',setNeeds:'Indiquez vos besoins',needsHint:'Allergies, régimes, besoins médicaux et restrictions',edit:'Modifier',setup:'Configurer',crossTitle:'Contact croisé et sécurité',crossSub:'Informations importantes avant de commander',current:'MENU ACTUEL',allDishes:'Tous les plats',personalized:'Votre menu personnalisé',noConflict:'Aucun conflit',modify:'Modifier',avoid:'Éviter',rules:'Vérification terminée',rulesCopy:'Les résultats utilisent les données publiques actuelles du restaurant.',sheetEye:'VOTRE PASSEPORT SÉCURITÉ',sheetTitle:'Que doit prendre en compte ce menu ?',selected:'SÉLECTIONNÉ',search:'Rechercher allergies ou ingrédients',severe:'Mode allergie sévère',severeCopy:'Traite l’équipement partagé ou le contact croisé comme À éviter jusqu’à confirmation du personnel.',diet:'Régimes et conditions médicales',dietCopy:'Les filtres exigent que le restaurant marque un plat compatible.',custom:'Une restriction inhabituelle ?',customCopy:'Décrivez-la simplement. Ce prototype recherche les termes exacts dans les données publiques.',customPlaceholder:'ex. sans alcool ni miel',apply:'Appliquer au menu',clear:'Effacer',why:'Pourquoi ce résultat ?',ingredients:'Ingrédients',detected:'Détecté',source:'Source',noResult:'Aucun conflit détecté',modifyResult:'Demander / Modifier',avoidResult:'Éviter',all:'Tous'}
};

const state={payload:null,restaurant:null,menu:[],canonical:[],selected:new Set(),diets:new Set(),custom:[],severe:false,period:'all',statusFilter:'all',lang:'en',wizardStep:0,showAllAllergens:false,usingLive:false};
const $=(selector,root=document)=>root.querySelector(selector); const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=(value='')=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const title=value=>String(value||'').replace(/\b\w/g,c=>c.toUpperCase());
const norm=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const t=key=>COPY[state.lang][key]||COPY.en[key]||key;
let toastTimer;

function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2400)}
async function getJSON(url,fallback){try{const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error(response.status);const data=await response.json();state.usingLive=true;return data}catch(error){const response=await fetch(fallback);if(!response.ok)throw error;return response.json()}}

function openSheet(sheet){$('#sheetBackdrop').hidden=false;sheet.hidden=false;document.body.classList.add('sheet-open');setTimeout(()=>sheet.querySelector('button,input')?.focus(),50)}
function closeSheets(){[$('#passportSheet'),$('#infoSheet'),$('#sheetBackdrop')].forEach(node=>node.hidden=true);document.body.classList.remove('sheet-open')}

function expandedSelected(){const values=new Set(state.selected);[...state.selected].forEach(value=>(EXPANSIONS[value]||[]).forEach(next=>values.add(next)));return values}
function itemAllergens(item){return new Set([...(item.allergens||[]),...(item.rule_allergens||[]),...(item.intrinsic_rule_allergens||[])].map(value=>norm(value)))}
function crossAllergens(item){return new Set((item.cross_contact_allergens||[]).map(value=>norm(value)))}
function customTerms(){
  const allTags=new Set([...state.canonical,...state.menu.flatMap(item=>[...(item.rule_allergens||[]),...(item.allergens||[])])].map(norm));
  const matched=new Set();
  state.custom.forEach(query=>{const clean=norm(query.replace(/\b(no|without|avoid|allergic|allergy|free from)\b/g,' '));allTags.forEach(tag=>{if(tag&&(` ${clean} `).includes(` ${tag} `))matched.add(tag)})});
  return matched;
}
function analyzeItem(item){
  if(!state.selected.size&&!state.diets.size&&!state.custom.length)return{status:'neutral',triggers:[],message:''};
  const wanted=expandedSelected();customTerms().forEach(value=>wanted.add(value));
  const intrinsic=itemAllergens(item),cross=crossAllergens(item),triggers=[...wanted].filter(value=>intrinsic.has(value)),crossTriggers=[...wanted].filter(value=>cross.has(value));
  const tags=new Set((item.diet_tags||[]).map(norm));const dietMisses=[...state.diets].filter(value=>value!=='celiac'&&!tags.has(value));
  const celiacMiss=state.diets.has('celiac')&&(intrinsic.has('gluten')||intrinsic.has('wheat'));if(celiacMiss)triggers.push('celiac');
  if(state.severe&&crossTriggers.length)return{status:'avoid',triggers:[...new Set([...triggers,...crossTriggers])],message:`This dish may come into contact with ${crossTriggers.join(', ')}.`};
  if(!triggers.length&&!dietMisses.length)return{status:'clear',triggers:[],message:'We did not find your selected ingredients in this dish.'};
  if(dietMisses.length)return{status:'avoid',triggers:dietMisses.map(value=>`not ${value}`),message:`The restaurant does not mark this dish as ${dietMisses.join(' or ')}.`};
  const modifiable=new Set((item.modifiable_for||[]).map(norm));const canModify=triggers.length&&triggers.every(value=>modifiable.has(value))&&!(state.severe&&crossTriggers.length);
  if(canModify)return{status:'modify',triggers:[...new Set(triggers)],message:item.modification_notes||'Ask the restaurant if they can leave that ingredient out.'};
  return{status:'avoid',triggers:[...new Set(triggers)],message:`This dish lists ${[...new Set(triggers)].join(', ')}.`};
}

function periods(){const present=new Set(state.menu.flatMap(item=>item.meal_periods||['all_day']));return['all',...['breakfast','brunch','lunch','dinner','happy_hour'].filter(value=>present.has(value))]}
function periodItems(){return state.menu.filter(item=>state.period==='all'||(item.meal_periods||['all_day']).includes(state.period))}

function renderPeriods(){const labels={all:'All day',breakfast:'Breakfast',brunch:'Brunch',lunch:'Lunch',dinner:'Dinner',happy_hour:'Happy hour'};$('#periodTabs').innerHTML=periods().map(value=>`<button class="${state.period===value?'active':''}" data-period="${value}">${labels[value]}</button>`).join('');$$('[data-period]').forEach(button=>button.addEventListener('click',()=>{state.period=button.dataset.period;renderPeriods();renderMenu()}))}

function selectionValues(){return[...state.selected,...state.diets,...state.custom]}
const COMMON_ALLERGENS=['gluten','dairy','eggs','peanuts','tree nuts','soy','fish','shellfish','sesame'];
const WIZARD_COPY={
  en:[['What do you need to avoid?','Choose everything that applies. You can also skip this step.'],['Do any of these apply?','Choose a food preference or medical need.'],['How serious is the allergy?','Choose the answer that feels right. You can always ask restaurant staff.']],
  es:[['¿Qué necesitas evitar?','Elige todo lo que corresponda. También puedes omitir este paso.'],['¿Te corresponde alguna opción?','Elige una preferencia o necesidad médica.'],['¿Qué tan grave es la alergia?','Elige la respuesta adecuada. Siempre puedes preguntar al personal.']],
  fr:[["Que devez-vous éviter ?",'Choisissez tout ce qui convient. Vous pouvez aussi passer cette étape.'],['Une de ces options vous concerne ?','Choisissez une préférence ou un besoin médical.'],["L’allergie est-elle grave ?",'Choisissez la réponse appropriée. Vous pouvez toujours demander au personnel.']]
};
function selectedSummary(){const values=selectionValues();if(!values.length&&!state.severe)return'';return `<div class="wizard-summary"><small>${esc(t('selected'))}</small><div>${values.map(value=>`<span>${esc(title(value))}</span>`).join('')}${state.severe?'<span class="severe">Severe allergy</span>':''}</div></div>`}
function toggleAllergen(value){state.selected.has(value)?state.selected.delete(value):state.selected.add(value);renderWizard()}
function renderWizard(){
  const copy=WIZARD_COPY[state.lang]||WIZARD_COPY.en;const [heading,help]=copy[state.wizardStep];$('#stepLabel').textContent=`Step ${state.wizardStep+1} of 3`;$('#wizardProgress').style.width=`${(state.wizardStep+1)/3*100}%`;$('#wizardBack').textContent=state.wizardStep===0?'Cancel':'Back';$('#wizardNextLabel').textContent=state.wizardStep===2?t('apply'):'Next';
  let body=`${selectedSummary()}<div class="wizard-question"><h3>${esc(heading)}</h3><p>${esc(help)}</p></div>`;
  if(state.wizardStep===0){const choices=state.showAllAllergens?GROUPS.flatMap(group=>group.items):COMMON_ALLERGENS;body+=`<div class="simple-choice-grid">${choices.map(value=>`<button class="${state.selected.has(value)?'active':''}" data-simple-allergen="${esc(value)}"><span>${esc(title(value))}</span><b>${state.selected.has(value)?'✓':'＋'}</b></button>`).join('')}</div><button class="show-more" id="showMoreAllergens">${state.showAllAllergens?'Show common allergies only':'See all 31 allergies'} <span>›</span></button>`}
  if(state.wizardStep===1){body+=`<div class="large-options"><button class="${!state.diets.size&&!state.selected.has('celiac')?'active':''}" data-simple-diet="none"><span><b>None of these</b><small>Go to the next step</small></span><i>✓</i></button>${DIETS.map(value=>{const active=(value==='celiac'?state.selected:state.diets).has(value);return`<button class="${active?'active':''}" data-simple-diet="${value}"><span><b>${value==='celiac'?'Celiac disease':title(value)}</b><small>${value==='celiac'?'Avoids gluten and wheat':'Only show dishes marked '+value}</small></span><i>${active?'✓':'＋'}</i></button>`}).join('')}</div>`}
  if(state.wizardStep===2){body+=`<div class="severity-options"><button class="${!state.severe?'active':''}" data-severity="no"><i>○</i><span><b>No or not sure</b><small>Use the restaurant’s listed ingredients.</small></span></button><button class="${state.severe?'active danger':''}" data-severity="yes"><i>!</i><span><b>Yes, it is severe</b><small>Also flag matching shared equipment and cross-contact.</small></span></button></div><div class="simple-custom"><label for="wizardCustom"><b>${esc(t('custom'))}</b><span>${esc(t('customCopy'))}</span></label><div><input id="wizardCustom" placeholder="${esc(t('customPlaceholder'))}"><button id="wizardAddCustom">Add</button></div>${state.custom.length?`<p>Added: ${state.custom.map(esc).join(', ')}</p>`:''}</div><button class="wizard-clear" id="wizardClear">Clear all choices</button>`}
  $('#wizardStep').innerHTML=body;
  $$('[data-simple-allergen]').forEach(button=>button.addEventListener('click',()=>toggleAllergen(button.dataset.simpleAllergen)));$('#showMoreAllergens')?.addEventListener('click',()=>{state.showAllAllergens=!state.showAllAllergens;renderWizard()});
  $$('[data-simple-diet]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.simpleDiet;if(value==='none'){state.diets.clear();state.selected.delete('celiac')}else{const set=value==='celiac'?state.selected:state.diets;set.has(value)?set.delete(value):set.add(value)}renderWizard()}));
  $$('[data-severity]').forEach(button=>button.addEventListener('click',()=>{state.severe=button.dataset.severity==='yes';renderWizard()}));$('#wizardAddCustom')?.addEventListener('click',addWizardCustom);$('#wizardCustom')?.addEventListener('keydown',event=>{if(event.key==='Enter')addWizardCustom()});$('#wizardClear')?.addEventListener('click',()=>{state.selected.clear();state.diets.clear();state.custom=[];state.severe=false;renderWizard()});
}
function addWizardCustom(){const input=$('#wizardCustom');const value=input?.value.trim();if(!value){input?.focus();return}if(!state.custom.includes(value))state.custom.push(value);renderWizard()}

function hasProfile(){return state.selected.size||state.diets.size||state.custom.length}
function renderPassportSummary(){
  const active=hasProfile();$('#passportTitle').textContent=active?t('personalized'):t('setNeeds');$('#passportDescription').textContent=active?`${selectionValues().length} dietary need${selectionValues().length===1?'':'s'} applied${state.severe?' · Severe mode':''}`:t('needsHint');$('#passportAction').innerHTML=`${active?t('edit'):t('setup')} <b>→</b>`;$('#activeProfile').hidden=!active;
  $('#activeProfile').innerHTML=[...selectionValues().slice(0,5).map(value=>`<span>${esc(title(value))}</span>`),...(selectionValues().length>5?[`<span>+${selectionValues().length-5}</span>`]:[]),...(state.severe?['<span class="severe">Severe mode</span>']:[])].join('');
  $('#statusFilters').hidden=!active;$('#verificationStrip').hidden=!active;$('#resultTitle').textContent=active?t('personalized'):t('allDishes');
}

function statusCopy(result){if(result.status==='clear')return{label:t('noResult'),icon:'✓'};if(result.status==='modify')return{label:t('modifyResult'),icon:'↻'};if(result.status==='avoid')return{label:t('avoidResult'),icon:'!'};return{label:'',icon:''}}
function renderMenu(){
  const items=periodItems().map(item=>({item,result:analyzeItem(item)}));const active=hasProfile();const counts={clear:0,modify:0,avoid:0};items.forEach(({result})=>{if(counts[result.status]!==undefined)counts[result.status]++});
  $('#allCount').textContent=items.length;$('#clearCount').textContent=counts.clear;$('#modifyCount').textContent=counts.modify;$('#avoidCount').textContent=counts.avoid;
  const visible=state.statusFilter==='all'?items:items.filter(({result})=>result.status===state.statusFilter);$('#resultMeta').textContent=active?`${counts.clear} no match found · ${counts.modify} ask for a change · ${counts.avoid} do not order`:`${items.length} dishes · Tap “Personalize this menu” to check your needs`;
  const byCategory=new Map();visible.forEach(entry=>{const category=entry.item.category||'Menu';if(!byCategory.has(category))byCategory.set(category,[]);byCategory.get(category).push(entry)});
  $('#menuSections').innerHTML=[...byCategory.entries()].map(([category,entries])=>`<section><div class="menu-category"><span>${esc(category)}</span><i></i></div>${entries.map(({item,result})=>menuCard(item,result,active)).join('')}</section>`).join('')||'<div class="empty-state">No dishes in this result group for the selected meal period.</div>';
  $$('.why-button').forEach(button=>button.addEventListener('click',()=>{const card=button.closest('.menu-card');const expanded=card.classList.toggle('expanded');button.setAttribute('aria-expanded',String(expanded));$('span',button).textContent=expanded?'−':'＋'}));
  renderPassportSummary();
}
function menuCard(item,result,active){const copy=statusCopy(result);const tags=[...itemAllergens(item)].filter(Boolean);const ingredients=(item.ingredients||[]).join(', ')||'Ingredient details not listed';return `<article class="menu-card" data-status="${result.status}"><div class="menu-card-inner"><div class="dish-top"><div class="dish-main"><h4>${esc(item.name)}</h4><p>${esc(item.description||ingredients)}</p></div><span class="dish-price">${item.price?`$${Number(item.price).toFixed(2)}`:''}</span></div>${active?`<div class="result-row"><span class="result-icon ${result.status}">${copy.icon}</span><div class="result-copy"><strong>${esc(copy.label)}</strong><small>${esc(result.message)}</small></div><span class="result-badge ${result.status}">${esc(result.status==='clear'?t('noConflict'):result.status==='modify'?t('modify'):t('avoid'))}</span></div><button class="why-button" aria-expanded="false">${esc(t('why'))}<span>＋</span></button><div class="evidence-detail"><dl><div><dt>${esc(t('ingredients'))}</dt><dd>${esc(ingredients)}</dd></div><div><dt>${esc(t('detected'))}</dt><dd>${esc(result.triggers.length?result.triggers.join(', '):'No selected restriction tags')}</dd></div><div><dt>${esc(t('source'))}</dt><dd>${esc(state.restaurant.name)} public menu · rule allergens: ${esc(tags.slice(0,10).join(', ')||'none listed')}</dd></div></dl></div>`:''}</div></article>`}

function renderLanguage(){const names={en:'English',es:'Español',fr:'Français'};$('#languageCode').textContent=names[state.lang];$('#mealLabel').textContent=t('meal');$('#passportEyebrow').textContent=t('passportEyebrow');$('#crossContactTitle').textContent=t('crossTitle');$('#crossContactSubtitle').textContent=t('crossSub');$('#resultEyebrow').textContent=t('current');$('#clearFilterLabel').textContent=t('noConflict');$('#modifyFilterLabel').textContent=t('modify');$('#avoidFilterLabel').textContent=t('avoid');$('#verificationTitle').textContent=t('rules');$('#verificationCopy').textContent=t('rulesCopy');$('#sheetEyebrow').textContent=t('sheetEye');$('#sheetTitle').textContent=t('sheetTitle');if(!$('#passportSheet').hidden)renderWizard();renderMenu()}

function bind(){
  $('#openPassport').addEventListener('click',()=>{state.wizardStep=0;state.showAllAllergens=false;renderWizard();openSheet($('#passportSheet'))});$('#closePassport').addEventListener('click',closeSheets);$('#sheetBackdrop').addEventListener('click',closeSheets);
  $('#openSafetyInfo').addEventListener('click',()=>openSheet($('#infoSheet')));$('#closeInfo').addEventListener('click',closeSheets);$('#acknowledgeInfo').addEventListener('click',closeSheets);
  $('#wizardBack').addEventListener('click',()=>{if(state.wizardStep===0){closeSheets();return}state.wizardStep--;renderWizard()});$('#wizardNext').addEventListener('click',()=>{if(state.wizardStep<2){state.wizardStep++;renderWizard();return}closeSheets();state.statusFilter='all';$$('[data-status-filter]').forEach(button=>button.classList.toggle('active',button.dataset.statusFilter==='all'));renderMenu();$('.menu-content').scrollIntoView({behavior:'smooth',block:'start'});toast(hasProfile()?'Your choices were applied to this menu':'Showing the full menu')});
  $$('[data-status-filter]').forEach(button=>button.addEventListener('click',()=>{$$('[data-status-filter]').forEach(item=>item.classList.remove('active'));button.classList.add('active');state.statusFilter=button.dataset.statusFilter;renderMenu()}));
  $('#languageButton').addEventListener('click',()=>{state.lang=LANGUAGES[(LANGUAGES.indexOf(state.lang)+1)%LANGUAGES.length];renderLanguage();toast(`Interface language: ${state.lang.toUpperCase()}`)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSheets()});
}

async function init(){
  bind();const[payload,allergenPayload]=await Promise.all([getJSON(`${API}/public/restaurant/terra-cucina`,FALLBACK.restaurant),getJSON(`${API}/allergens`,FALLBACK.allergens)]);state.payload=payload;state.restaurant=payload.restaurant;state.menu=payload.menu||[];state.canonical=(Array.isArray(allergenPayload)?allergenPayload:allergenPayload.allergens||[]).map(norm);
  const r=state.restaurant,initial=r.name.charAt(0).toUpperCase();$('#restaurantInitial').textContent=initial;$('#headerRestaurant').textContent=r.name;$('#headerCuisine').textContent=r.cuisine||'Restaurant';$('#restaurantCuisine').textContent=(r.cuisine||'Restaurant').toUpperCase();$('#restaurantName').textContent=r.name;$('#restaurantTagline').textContent=r.tagline||r.description||'';$('#infoRestaurant').textContent=`${r.name} handles many allergens.`;$('#crossContactText').textContent=r.cross_contact_notes||'This restaurant has not provided a custom cross-contact statement. Inform your server about all severe allergies.';
  $('#houseCount').textContent=`${(r.house_ingredients||[]).length} notes`;$('#oilList').textContent=(r.cooking_oils||[]).join(', ')||'Ask staff';$('#reviewDate').textContent=r.last_accuracy_ack_at?new Date(r.last_accuracy_ack_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'On file';
  renderPeriods();renderLanguage();
}
init().catch(error=>{console.error(error);$('#menuSections').innerHTML='<div class="empty-state">The public menu could not be loaded. Please try again shortly.</div>'});
