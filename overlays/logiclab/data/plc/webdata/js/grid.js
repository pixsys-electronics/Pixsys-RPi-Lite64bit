// TODO: trovare un modo migliore per refreshare i valori della grid (m_Grid.redraw() non e' ottimale perche' e' piu' indicato per ridisegnare con cambi di layoyt)
// TODO: flag edit sui parametri e colorazione quando e' editato
// TODO: fare validazione dei dati inseriti nella grid

// nomi dei tipi nel formato IEC
const m_typeNamesIEC = {	
    "char": "SINT",
    "unsignedChar": "USINT",
    "short": "INT",
    "unsignedShort": "UINT",
    "int": "DINT",
    "unsignedInt": "UDINT",
    "boolean": "BOOL",
    "float": "REAL",
    "double": "LREAL",
    "string": "STRING",
}

function ParList(list)
{
    this.list = list;

    // converte i tipi del configuratore in tipi IEC
    for (let par of this.list)
    {
        var IECtype = m_typeNamesIEC[par.typepar];
        if (IECtype)
            par.typepar = IECtype;
    }
}

ParList.prototype.getPar = function(ipa)
{
    let par = this.list.find(par => par.ipa == ipa);
    return par;
}

ParList.prototype.setParValue = function(ipa, value, edit)
{
    let par = this.getPar(ipa);
    par.value = value;

    if (edit !== null)
        par.edited = edit;
}

ParList.prototype.GetAllIPAs = function()
{
    return this.list.map(par => par.ipa);
}

ParList.prototype.GetParList = function ()
{
    return this.list;
}

// estrae i valori e li memorizza nell'oggetto values, che e' una mappa ipa->valore
ParList.prototype.GetAllValues = function (values)
{
    for (let par of this.list)
        values[par.ipa] = par.value;
}

// salva i valori dentro la lista interna, prendendoli dall'oggetto values, che e' una mappa ipa->valore
ParList.prototype.SetAllValues = function (values)
{
    for (let par of this.list)
        par.value = values[par.ipa];
}

// estrae i flag edited e li memorizza nell'oggetto values, che e' una mappa ipa->editato
ParList.prototype.GetEdited = function (values)
{
    for (let par of this.list)
        values[par.ipa] = par.edited;
}

// salva i flag edited dentro la lista interna, prendendoli dall'oggetto values, che e' una mappa ipa->editato
ParList.prototype.SetEdited = function (values)
{
    for (let par of this.list)
        par.edited = values[par.ipa];
}

var m_Grid;
var m_ParList;
var m_autoRefreshTimer = null;
const AUTOREFRESH_DELAY = 500;
var m_CurrentSelectedMenu = 0;
var m_allValues = {};
var m_editedValues = {};
var m_autorefreshEnabled;

// evento scatenato al caricamento della pagina
document.addEventListener('DOMContentLoaded', function()
{
    initPage();
}, false);


function initPage()
{
    // gestione autorefresh
    refreshSvg.style.fill='#dfa170';
    let autoRefreshBtn = getElement("autorefreshButton");
    autoRefreshBtn.addEventListener('click', function()
    {
        if (m_autoRefreshTimer !== null)
        {
            AutoRefreshStop();
            autoRefreshBtn.classList.remove("active");
            refreshSvg.classList.remove("active");
            enableButton("readButton", true);
            enableButton("writeButton", true);
            enableButton("readAllButton", true);
            enableButton("writeAllButton", true);
        }
        else
        {
            AutoRefreshStart(AUTOREFRESH_DELAY);
            autoRefreshBtn.classList.add("active");
            refreshSvg.classList.add("active");
            enableButton("readButton", false);
            enableButton("writeButton", false);
            enableButton("readAllButton", false);
            enableButton("writeAllButton", false);
        }
    });

    initTreeMenu();
    initGrid();

    showNavbarLogos();
    showLoginStatus();
}

/**
 * Inizializza la grid e la riempie con la lista dei parametri (funzione usata all'apertura della pagina)
 */
function initGrid()
{
    createGrid();
    fillGrid();
}

/**
 * Riempie la grid scaricando la lista dei parametri per il menu corrente
 */
function fillGrid()
{
    // se c'e' gia' una lista attiva (quindi non prima esecuzione) salva i valori attuali dentro la mappa globale
    // necessario perche' ad ogni caricamento della lista parametri i valori si perderebbero,
    // poiche' la griglia cerca campi 'values' dentro la parList che viene ogni volta rifatta
    if (m_ParList)
    {
        m_ParList.GetAllValues(m_allValues);
        m_ParList.GetEdited(m_editedValues);
    }

    m_ParList = new ParList(LLWebServer.GetParList(m_CurrentSelectedMenu));

    // se non ci sono valori (ovvero e' la prima apertura, li legge)
    if (Object.entries(m_allValues).length === 0 && m_allValues.constructor === Object)
        readAll();
    else
    // altrimenti ripristina valori salvati in precedenza
        m_ParList.SetAllValues(m_allValues);

    m_ParList.SetEdited(m_editedValues);

    m_Grid.setData(m_ParList.list);
}

/**
 * Aggiorna la grid (quando sono stati aggiornati i valori)
 */
function reloadGrid()
{
    m_Grid.redraw();
}

/**
 * Crea e disegna la griglia con le relative impostazioni
 */
function createGrid()
{
    m_Grid = new Tabulator("#par-grid", {
        rowFormatter: customRowFormatter,
        // probabilmente questa e' l'impostazione che non nasconde immediatamente la tastiera sui device mobili
        autoResize: false,
        selectable:true,
        selectableRangeMode:"click",
        columns: [
            {title:"IPA", field:"ipa"},
            {title:"Name", field:"name", width: 120},
            {title:"Type", field:"typepar"},
            {title:"Value", field:"value", editor: customCellValEditor, editable: checkEditable, formatter: customCellValFormatter, width: 140},
            {title:"Um", field:"um"},
            {title:"Default", field:"defval", formatter: customCellValFormatter},
            {title:"Description", field:"descr", width: 220},
        ],
    });

    // toglie le righe bianche in fondo alla tabella https://github.com/olifolkerd/tabulator/issues/1670#issuecomment-448916368
    // m_Grid.redraw();
}

/**
 * Filtra i parametri quando e' stato cambiato il menu corrente
 * @param {number} currentMenu 
 */
function filterMenus(currentMenu)
{
    let autorefreshEnabled = (m_autoRefreshTimer !== null);
	if (autorefreshEnabled)
    	AutoRefreshStop();

    m_CurrentSelectedMenu = currentMenu;
    fillGrid();

    if (autorefreshEnabled)
        AutoRefreshStart(AUTOREFRESH_DELAY);
}

/**
 * Inizializza il menu dei parametri
 */
function initTreeMenu()
{
    const MENUTYPE_MENU = 0;
    const MENUTYPE_PAGE = 1;

    // il menu corrente in questa circostanza sara' 0
    let menus = LLWebServer.GetMenuList(m_CurrentSelectedMenu, true);
    let treeMenuContainer = getElement("treeMenu");

    let rootElem = createElement("ul");
    rootElem.classList.add("file-tree");

    // nodo padre "all parameters"
    let allParamsElem = createElement("li");
    let href = createElement("a");
    href.innerText = "All parameters";
    href.setAttribute("href", "#");
    // il data attribute attualmente e' inutile ma serve per capire l'id del menu dall'HTML
    href.dataset.menuId = 0;
    href.onclick = (() => {
        return function() { filterMenus(0); }
    })();

    // per inserire l'icona custom
    // allParamsElem.classList.add('defaultIcon');

    allParamsElem.appendChild(href);
    rootElem.appendChild(allParamsElem);

    createChildren(menus, allParamsElem);

    // funzione ricorsiva per creare menu e sottomenu
    function createChildren(menus, father)
    {
        let childMenuElem = createElement("ul");

        for (let menu of menus)
        {
            let item = createElement("li");
            let href = createElement("a");
            href.innerText = menu.caption;
            href.dataset.menuId = menu.id;

            if (menu.type == MENUTYPE_MENU)
            {
                href.setAttribute("href", "#");
                href.onclick = (() => {
                    return function() { filterMenus(menu.id); }
                })();

                // per inserire l'icona custom
                // item.classList.add('defaultIcon');
            }
            else if (menu.type == MENUTYPE_PAGE)
            {
                href.setAttribute("href", menu.link);

                // per inserire l'icona custom
                // let img = createElement("img");
                // img.setAttribute('src', 'pippo.ico');
                // item.appendChild(img);
            }

            item.appendChild(href);

            if (menu.children)
                createChildren(menu.children, item);

            childMenuElem.appendChild(item);
        }

        father.appendChild(childMenuElem);
    }

    treeMenuContainer.appendChild(rootElem);

    $(rootElem).filetree();
}

function customCellValFormatter(cell, formatterParams, onRendered)
{
    //cell - the cell component
    //formatterParams - parameters set for the column
    //onRendered - function to call when the formatter has been rendered

    let data = cell.getRow().getData();
    let formattedValue = formatValue(cell.getValue(), data.typepar, data.form);

    if (cell.getColumn().getField() == "value" && data.edited)
        return "<span style='color:red;'>" + formattedValue + "</span>";

    return formattedValue;
}

function IsBoolType(type)
{
    return type == 'BOOL';
}

/**
 * Formatta il valore del parametro da mostrare nella griglia
 * @param {*} value 
 * @param {*} valueType 
 */
function formatValue(value, valueType, format)
{
    if (value === undefined || value === null)
        return '';

    if (IsBoolType(valueType))
        return LLWebServer.ParseBoolean(value) ? "TRUE" : "FALSE";
    else if (format)
        return LLWebServer.sprintf(format, value);
    else
        return value;
}

function customCellValEditor(cell, onRendered, success, cancel, editorParams)
{
    //cell - the cell component for the editable cell
    //onRendered - function to call when the editor has been rendered
    //success - function to call to pass the successfuly updated value to Tabulator
    //cancel - function to call to abort the edit and return to a normal cell
    //editorParams - params object passed into the editorParams column definition property

    let editor;

    let data = cell.getRow().getData();
    let currentValue = data.value;
    if (IsBoolType(data.typepar))
    {
        editor = document.createElement("select");

        let trueOption = document.createElement("option");
        trueOption.setAttribute("value", 1);
        trueOption.innerText = "TRUE";

        let falseOption = document.createElement("option");
        falseOption.setAttribute("value", 0);
        falseOption.innerText = "FALSE";

        if (LLWebServer.ParseBoolean(cell.getValue()))
            trueOption.setAttribute("selected", "");
        else
            falseOption.setAttribute("selected", "");

        editor.appendChild(trueOption);
        editor.appendChild(falseOption);
    }
    else
    {
        editor = document.createElement("input");
        if (currentValue)
            editor.value = currentValue;
    }

    //create and style input
    editor.style.padding = "3px";
    editor.style.width = "100%";
    editor.style.boxSizing = "border-box";

    //set focus on the select box when the editor is selected (timeout allows for editor to be added to DOM)
    onRendered(function()
    {
        editor.focus();
        editor.style.css = "100%";
    });

    //when the value has been set, trigger the cell to update
    function successFunc()
    {
        // setto a mano il flag edited sul parametro perche' success ne modifica solamente il valore
        if (IsBoolType(data.typepar))
            data.edited = (LLWebServer.ParseBoolean(editor.value) != LLWebServer.ParseBoolean(currentValue));
        else
            data.edited = (editor.value != currentValue);

        success(editor.value);

        if (m_autorefreshEnabled)
        {
            writeParameter(data.ipa);
            AutoRefreshStart(AUTOREFRESH_DELAY);
        }
    }

    function focusFunc()
    {
        // ferma l'autorefresh quando si entra in edit di una cella
        m_autorefreshEnabled = (m_autoRefreshTimer !== null);
        if (m_autorefreshEnabled)
            AutoRefreshStop();
    }

    editor.addEventListener("change", successFunc);
    editor.addEventListener("blur", successFunc);
    editor.addEventListener("focus", focusFunc);

    // se vado in edit in una qualsisi riga, deseleziono le possibili altre
    m_Grid.deselectRow();

    // seleziono la riga che ho in edit
    cell.getRow().toggleSelect(); //toggle row selected state on row click

    //return the editor element
    return editor;
};

/**
 * Consente o meno l'edit del valore dei parametri readonly
 * @param {object} cell 
 */
function checkEditable(cell)
{
    //cell - the cell component for the editable cell

    //get row data
    var par = cell.getRow().getData();

    return (!par.readonly);
}

/**
 * Formatta la riga dei parametri readonly
 * @param {object} row 
 */
function customRowFormatter(row)
{
    let par = row.getData();

    if (par.readonly)
        row.getElement().style.color = "darkgray";
}

// gestione menu a scomparsa
function openNav()
{
    getElement("menuContent").classList.add("collapsed-menu-open");
}

function closeNav()
{
    getElement("menuContent").classList.remove("collapsed-menu-open");
}

/**
 * Legge i parametri selezionati nella griglia
 */
function readSelected()
{
    let selectedData = m_Grid.getSelectedData();

    if (selectedData.length == 0)
        return;

    let IPAs = selectedData.map(par => par.ipa);
    readParameters(IPAs);
}

/**
 * Legge tutti i parametri della griglia
 */
function readAll()
{
    let IPAs = m_ParList.GetAllIPAs();
    readParameters(IPAs);
}

/**
 * Legge una lista di IPA
 * @param {object} IPAs 
 */
function readParameters(IPAs)
{
    if (!IPAs || IPAs.length == 0)
        return;

    const ASYNC = false;

    LLWebServer.GetParValues(IPAs, ASYNC, data => {
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const ipa = IPAs[i];

			// il valore edited viene settato dopo letture/scritture, quindi sara' false
            m_ParList.setParValue(ipa, value, false);
        }
    });

    reloadGrid();
}

/**
 * Scrive tutti i parametri
 */
function writeAll()
{
    let dataToWrite = {};
    for (let par of m_ParList.GetParList())
    {
        dataToWrite[par.ipa] = par.value;
    }

    writeParameters(dataToWrite);
}

/**
 * Scrive i parametri selezionati
 */
function writeSelected()
{
    let selectedData = m_Grid.getSelectedData();

    if (selectedData.length == 0)
        return;

    let dataToWrite = {};
    for (let par of selectedData)
    {
        dataToWrite[par.ipa] = par.value;
    }

    writeParameters(dataToWrite);
}

/**
 * Scrive un singolo parametro
 * Attenzione: non passare qui il valore ma usare la funzione setParValue sulla lista!
 * @param {*} ipa 
 */
function writeParameter(ipa)
{
    let dataToWrite = {};
    let par = m_ParList.getPar(ipa);
    dataToWrite[par.ipa] = par.value;

    writeParameters(dataToWrite);
}

/**
 * Scrive una mappa di parametri [ipa, valore]
 * @param {object} dataToWrite 
 */
function writeParameters(dataToWrite)
{
    if (!dataToWrite || Object.keys(dataToWrite).length == 0)
        return;

    const ASYNC = false;
    let res = LLWebServer.SetParValues(dataToWrite, ASYNC);
    if (!res)
        alert("Error writing parameters");
    else
    {
        let IPAs = Object.keys(dataToWrite);

        if (!m_autorefreshEnabled)
            readParameters(IPAs);
    }
}

function AutoRefreshStart(periodMs)
{
    if (m_autoRefreshTimer === null)
        m_autoRefreshTimer = UpdateData(periodMs);
}

function AutoRefreshStop()
{
	if (m_autoRefreshTimer !== null)
	{
		clearInterval(m_autoRefreshTimer);
		m_autoRefreshTimer = null;
	}
}

function UpdateData(periodMs)
{
	let parIpas = m_ParList.GetAllIPAs();
	const ASYNC = true;
    function DoUpdate()
	{
        LLWebServer.GetParValues(parIpas, ASYNC, data => {
            for (let i = 0; i < data.length; i++) {
                const value = data[i];
                const ipa = parIpas[i];

                m_ParList.setParValue(ipa, value);
            }
        });

        reloadGrid();
    }

    return setInterval(DoUpdate, periodMs);
}