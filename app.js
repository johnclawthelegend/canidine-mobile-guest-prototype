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
  en:{meal:'Menu',passportEyebrow:'MY SAFETY PASSPORT',setNeeds:'Set your dietary needs',needsHint:'Allergies, diets, medical needs and custom restrictions',edit:'Edit',setup:'Set up',crossTitle:'Cross-contact & safety',crossSub:'Important information before ordering',current:'CURRENT MENU',allDishes:'All dishes',personalized:'Your personalized menu',noConflict:'No conflict',modify:'Modify',avoid:'Avoid',rules:'Rule check complete',rulesCopy:'Results use the restaurant’s current public menu data.',sheetEye:'YOUR SAFETY PASSPORT',sheetTitle:'What should this menu account for?',selected:'SELECTED',search:'Search allergies or ingredients',severe:'Severe allergy mode',severeCopy:'Treat shared equipment or cross-contact exposure as Avoid until restaurant staff confirms otherwise.',diet:'Diets & medical conditions',dietCopy:'Diet filters require the restaurant to mark a dish compatible.',custom:'Have an unusual restriction?',customCopy:'Describe it in plain language. This prototype matches exact public ingredient terms and flags anything uncertain for staff.',customPlaceholder:'e.g. no alcohol or honey',apply:'Apply to menu',clear:'Clear',why:'Why this result?',ingredients:'Ingredients',detected:'Detected',source:'Source',noResult:'No conflict detected',modifyResult:'Ask / Modify',avoidResult:'Avoid',all:'All'},
  es:{meal:'Menú',passportEyebrow:'MI PASAPORTE DE SEGURIDAD',setNeeds:'Configura tus necesidades',needsHint:'Alergias, dietas, condiciones médicas y restricciones',edit:'Editar',setup:'Configurar',crossTitle:'Contacto cruzado y seguridad',crossSub:'Información importante antes de pedir',current:'MENÚ ACTUAL',allDishes:'Todos los platos',personalized:'Tu menú personalizado',noConflict:'Sin conflicto',modify:'Modificar',avoid:'Evitar',rules:'Revisión de reglas completa',rulesCopy:'Los resultados usan los datos públicos actuales del restaurante.',sheetEye:'TU PASAPORTE DE SEGURIDAD',sheetTitle:'¿Qué debe tener en cuenta este menú?',selected:'SELECCIONADO',search:'Buscar alergias o ingredientes',severe:'Modo de alergia grave',severeCopy:'Trata el equipo compartido o contacto cruzado como Evitar hasta confirmarlo con el personal.',diet:'Dietas y condiciones médicas',dietCopy:'Los filtros requieren que el restaurante marque el plato como compatible.',custom:'¿Tienes una restricción poco común?',customCopy:'Descríbela con palabras sencillas. Este prototipo busca términos exactos en los datos públicos.',customPlaceholder:'p. ej., sin alcohol ni miel',apply:'Aplicar al menú',clear:'Borrar',why:'¿Por qué este resultado?',ingredients:'Ingredientes',detected:'Detectado',source:'Fuente',noResult:'Sin conflicto detectado',modifyResult:'Preguntar / Modificar',avoidResult:'Evitar',all:'Todos'},
  fr:{meal:'Menu',passportEyebrow:'MON PASSEPORT SÉCURITÉ',setNeeds:'Indiquez vos besoins',needsHint:'Allergies, régimes, besoins médicaux et restrictions',edit:'Modifier',setup:'Configurer',crossTitle:'Contact croisé et sécurité',crossSub:'Informations importantes avant de commander',current:'MENU ACTUEL',allDishes:'Tous les plats',personalized:'Votre menu personnalisé',noConflict:'Aucun conflit',modify:'Modifier',avoid:'Éviter',rules:'Vérification terminée',rulesCopy:'Les résultats utilisent les données publiques actuelles du restaurant.',sheetEye:'VOTRE PASSEPORT SÉCURITÉ',sheetTitle:'Que doit prendre en compte ce menu ?',selected:'SÉLECTIONNÉ',search:'Rechercher allergies ou ingrédients',severe:'Mode allergie sévère',severeCopy:'Traite l’équipement partagé ou le contact croisé comme À éviter jusqu’à confirmation du personnel.',diet:'Régimes et conditions médicales',dietCopy:'Les filtres exigent que le restaurant marque un plat compatible.',custom:'Une restriction inhabituelle ?',customCopy:'Décrivez-la simplement. Ce prototype recherche les termes exacts dans les données publiques.',customPlaceholder:'ex. sans alcool ni miel',apply:'Appliquer au menu',clear:'Effacer',why:'Pourquoi ce résultat ?',ingredients:'Ingrédients',detected:'Détecté',source:'Source',noResult:'Aucun conflit détecté',modifyResult:'Demander / Modifier',avoidResult:'Éviter',all:'Tous'}
};

const state={payload:null,restaurant:null,menu:[],canonical:[],selected:new Set(),diets:new Set(),custom:[],severe:false,period:'all',statusFilter:'all',dense:false,lang:'en',openGroups:new Set(['major']),usingLive:false};
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
  if(state.severe&&crossTriggers.length)return{status:'avoid',triggers:[...new Set([...triggers,...crossTriggers])],message:`Potential cross-contact with ${crossTriggers.join(', ')}.`};
  if(!triggers.length&&!dietMisses.length)return{status:'clear',triggers:[],message:'No selected conflict found in current public menu data.'};
  if(dietMisses.length)return{status:'avoid',triggers:dietMisses.map(value=>`not ${value}`),message:`Not marked ${dietMisses.join(' or ')} by the restaurant.`};
  const modifiable=new Set((item.modifiable_for||[]).map(norm));const canModify=triggers.length&&triggers.every(value=>modifiable.has(value))&&!(state.severe&&crossTriggers.length);
  if(canModify)return{status:'modify',triggers:[...new Set(triggers)],message:item.modification_notes||'Ask staff to remove the triggering ingredient.'};
  return{status:'avoid',triggers:[...new Set(triggers)],message:`Current menu data identifies ${[...new Set(triggers)].join(', ')}.`};
}

function periods(){const present=new Set(state.menu.flatMap(item=>item.meal_periods||['all_day']));return['all',...['breakfast','brunch','lunch','dinner','happy_hour'].filter(value=>present.has(value))]}
function periodItems(){return state.menu.filter(item=>state.period==='all'||(item.meal_periods||['all_day']).includes(state.period))}

function renderPeriods(){const labels={all:'All day',breakfast:'Breakfast',brunch:'Brunch',lunch:'Lunch',dinner:'Dinner',happy_hour:'Happy hour'};$('#periodTabs').innerHTML=periods().map(value=>`<button class="${state.period===value?'active':''}" data-period="${value}">${labels[value]}</button>`).join('');$$('[data-period]').forEach(button=>button.addEventListener('click',()=>{state.period=button.dataset.period;renderPeriods();renderMenu()}))}

function renderPicker(){
  const query=norm($('#allergenSearch')?.value||'');
  $('#pickerGroups').innerHTML=GROUPS.map(group=>{
    const filtered=group.items.filter(item=>!query||norm(item).includes(query));if(query&&!filtered.length)return'';const open=query||state.openGroups.has(group.id);
    return `<section class="picker-group"><button class="picker-group-head" data-group="${group.id}"><span><i>${group.icon}</i><span><strong>${group.label}</strong><small>${filtered.length} choices · ${group.hint}</small></span></span><b>${open?'−':'＋'}</b></button><div class="choice-grid" ${open?'':'hidden'}>${filtered.map(item=>`<button class="${state.selected.has(item)?'active':''}" data-allergen="${esc(item)}" aria-pressed="${state.selected.has(item)}">${esc(title(item))}</button>`).join('')}</div></section>`
  }).join('')||'<div class="empty-state">No matching restriction found. Add it as a custom restriction below.</div>';
  $$('[data-group]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.group;state.openGroups.has(id)?state.openGroups.delete(id):state.openGroups.add(id);renderPicker()}));
  $$('[data-allergen]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.allergen;state.selected.has(value)?state.selected.delete(value):state.selected.add(value);renderPicker();renderSelection()}));
  $('#dietChoices').innerHTML=DIETS.map(value=>`<button class="${(value==='celiac'?state.selected:state.diets).has(value)?'active':''}" data-diet="${value}">${title(value)}</button>`).join('');
  $$('[data-diet]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.diet;const set=value==='celiac'?state.selected:state.diets;set.has(value)?set.delete(value):set.add(value);renderPicker();renderSelection()}));
}

function selectionValues(){return[...state.selected,...state.diets,...state.custom]}
function renderSelection(){
  const values=selectionValues();const count=values.length+(state.severe?1:0);$('#applyCount').textContent=`${count} selected`;$('#profileSelected').hidden=!count;
  $('#selectedChips').innerHTML=[...values.map(value=>`<button data-remove-choice="${esc(value)}">${esc(title(value))} ×</button>`),...(state.severe?['<button class="severe" data-remove-choice="__severe">Severe mode ×</button>']:[])].join('');
  $$('[data-remove-choice]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.removeChoice;if(value==='__severe'){state.severe=false;updateSevere()}else if(state.selected.has(value))state.selected.delete(value);else if(state.diets.has(value))state.diets.delete(value);else state.custom=state.custom.filter(item=>item!==value);renderPicker();renderSelection()}));
}
function updateSevere(){const button=$('#severeSwitch');button.classList.toggle('active',state.severe);button.setAttribute('aria-checked',String(state.severe));renderSelection()}

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
  const visible=state.statusFilter==='all'?items:items.filter(({result})=>result.status===state.statusFilter);$('#resultMeta').textContent=active?`${counts.clear} no conflict · ${counts.modify} modify · ${counts.avoid} avoid`:`${items.length} dishes · Choose dietary needs to personalize`;
  const byCategory=new Map();visible.forEach(entry=>{const category=entry.item.category||'Menu';if(!byCategory.has(category))byCategory.set(category,[]);byCategory.get(category).push(entry)});
  $('#menuSections').innerHTML=[...byCategory.entries()].map(([category,entries])=>`<section><div class="menu-category"><span>${esc(category)}</span><i></i></div>${entries.map(({item,result})=>menuCard(item,result,active)).join('')}</section>`).join('')||'<div class="empty-state">No dishes in this result group for the selected meal period.</div>';
  $$('.why-button').forEach(button=>button.addEventListener('click',()=>{const card=button.closest('.menu-card');const expanded=card.classList.toggle('expanded');button.setAttribute('aria-expanded',String(expanded));$('span',button).textContent=expanded?'−':'＋'}));
  renderPassportSummary();
}
function menuCard(item,result,active){const copy=statusCopy(result);const tags=[...itemAllergens(item)].filter(Boolean);const ingredients=(item.ingredients||[]).join(', ')||'Ingredient details not listed';return `<article class="menu-card ${state.dense?'compact':''}" data-status="${result.status}"><div class="menu-card-inner"><div class="dish-top"><div class="dish-main"><h4>${esc(item.name)}</h4><p>${esc(item.description||ingredients)}</p></div><span class="dish-price">${item.price?`$${Number(item.price).toFixed(2)}`:''}</span></div>${active?`<div class="result-row"><span class="result-icon ${result.status}">${copy.icon}</span><div class="result-copy"><strong>${esc(copy.label)}</strong><small>${esc(result.message)}</small></div><span class="result-badge ${result.status}">${esc(result.status==='clear'?t('noConflict'):result.status==='modify'?t('modify'):t('avoid'))}</span></div><button class="why-button" aria-expanded="false">${esc(t('why'))}<span>＋</span></button><div class="evidence-detail"><dl><div><dt>${esc(t('ingredients'))}</dt><dd>${esc(ingredients)}</dd></div><div><dt>${esc(t('detected'))}</dt><dd>${esc(result.triggers.length?result.triggers.join(', '):'No selected restriction tags')}</dd></div><div><dt>${esc(t('source'))}</dt><dd>${esc(state.restaurant.name)} public menu · rule allergens: ${esc(tags.slice(0,10).join(', ')||'none listed')}</dd></div></dl></div>`:''}</div></article>`}

function renderLanguage(){const code=state.lang.toUpperCase();$('#languageCode').textContent=code;$('#mealLabel').textContent=t('meal');$('#passportEyebrow').textContent=t('passportEyebrow');$('#crossContactTitle').textContent=t('crossTitle');$('#crossContactSubtitle').textContent=t('crossSub');$('#resultEyebrow').textContent=t('current');$('#clearFilterLabel').textContent=t('noConflict');$('#modifyFilterLabel').textContent=t('modify');$('#avoidFilterLabel').textContent=t('avoid');$('#verificationTitle').textContent=t('rules');$('#verificationCopy').textContent=t('rulesCopy');$('#sheetEyebrow').textContent=t('sheetEye');$('#sheetTitle').textContent=t('sheetTitle');$('#selectedLabel').textContent=t('selected');$('#allergenSearch').placeholder=t('search');$('#severeTitle').textContent=t('severe');$('#severeCopy').textContent=t('severeCopy');$('#dietTitle').textContent=t('diet');$('#dietCopy').textContent=t('dietCopy');$('#customTitle').textContent=t('custom');$('#customCopy').textContent=t('customCopy');$('#customRestriction').placeholder=t('customPlaceholder');$('#applyLabel').textContent=t('apply');$('#clearProfile').textContent=t('clear');renderMenu()}

function addCustom(){const input=$('#customRestriction');const value=input.value.trim();if(!value){input.focus();return}if(!state.custom.includes(value))state.custom.push(value);const matched=[...customTerms()];$('#customFeedback').textContent=matched.length?`Matched public menu terms: ${matched.join(', ')}.`:'No exact public tag matched. The menu will flag this profile for direct staff confirmation rather than invent a result.';input.value='';renderSelection()}

function bind(){
  $('#openPassport').addEventListener('click',()=>{renderPicker();renderSelection();openSheet($('#passportSheet'))});$('#closePassport').addEventListener('click',closeSheets);$('#sheetBackdrop').addEventListener('click',closeSheets);
  $('#openSafetyInfo').addEventListener('click',()=>openSheet($('#infoSheet')));$('#closeInfo').addEventListener('click',closeSheets);$('#acknowledgeInfo').addEventListener('click',closeSheets);
  $('#severeSwitch').addEventListener('click',()=>{state.severe=!state.severe;updateSevere()});$('#allergenSearch').addEventListener('input',renderPicker);$('#addCustom').addEventListener('click',addCustom);$('#customRestriction').addEventListener('keydown',event=>{if(event.key==='Enter')addCustom()});
  $('#clearProfile').addEventListener('click',()=>{state.selected.clear();state.diets.clear();state.custom=[];state.severe=false;updateSevere();renderPicker();renderSelection()});
  $('#applyProfile').addEventListener('click',()=>{closeSheets();state.statusFilter='all';$$('[data-status-filter]').forEach(button=>button.classList.toggle('active',button.dataset.statusFilter==='all'));renderMenu();$('.menu-content').scrollIntoView({behavior:'smooth',block:'start'});toast(hasProfile()?'Safety Passport applied to this menu':'Showing the full menu')});
  $$('[data-status-filter]').forEach(button=>button.addEventListener('click',()=>{$$('[data-status-filter]').forEach(item=>item.classList.remove('active'));button.classList.add('active');state.statusFilter=button.dataset.statusFilter;renderMenu()}));
  $('#layoutButton').addEventListener('click',()=>{state.dense=!state.dense;$('#layoutButton').textContent=state.dense?'☰':'☷';renderMenu();toast(state.dense?'Compact menu view':'Comfortable menu view')});
  $('#languageButton').addEventListener('click',()=>{state.lang=LANGUAGES[(LANGUAGES.indexOf(state.lang)+1)%LANGUAGES.length];renderLanguage();toast(`Interface language: ${state.lang.toUpperCase()}`)});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSheets()});
}

async function init(){
  bind();const[payload,allergenPayload]=await Promise.all([getJSON(`${API}/public/restaurant/terra-cucina`,FALLBACK.restaurant),getJSON(`${API}/allergens`,FALLBACK.allergens)]);state.payload=payload;state.restaurant=payload.restaurant;state.menu=payload.menu||[];state.canonical=(Array.isArray(allergenPayload)?allergenPayload:allergenPayload.allergens||[]).map(norm);
  const r=state.restaurant,initial=r.name.charAt(0).toUpperCase();$('#restaurantInitial').textContent=initial;$('#headerRestaurant').textContent=r.name;$('#headerCuisine').textContent=r.cuisine||'Restaurant';$('#restaurantCuisine').textContent=(r.cuisine||'Restaurant').toUpperCase();$('#restaurantName').textContent=r.name;$('#restaurantTagline').textContent=r.tagline||r.description||'';$('#infoRestaurant').textContent=`${r.name} handles many allergens.`;$('#crossContactText').textContent=r.cross_contact_notes||'This restaurant has not provided a custom cross-contact statement. Inform your server about all severe allergies.';
  $('#houseCount').textContent=`${(r.house_ingredients||[]).length} notes`;$('#oilList').textContent=(r.cooking_oils||[]).join(', ')||'Ask staff';$('#reviewDate').textContent=r.last_accuracy_ack_at?new Date(r.last_accuracy_ack_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'On file';
  renderPeriods();renderPicker();renderSelection();renderLanguage();
}
init().catch(error=>{console.error(error);$('#menuSections').innerHTML='<div class="empty-state">The public menu could not be loaded. Please try again shortly.</div>'});
