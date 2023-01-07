interface Summary {
    created: string;
    generated_from: string;
    files: {
        [directory: string]: {
            i18n: files_i18n;
            files: {[name: string]: files_i18n};
        };
    };
    category_i18n: {
        de: category_i18n_map;
        en: category_i18n_map;
    };
    script: {
        constants: Entry[];
        functions: Entry[];
    };
}

type category_i18n_map = {[path: string]: string[]};
type files_i18n = {
    de: string;
    en: string;
};

interface Entry {
    path: string;
    name: string;
    category: string;
    version: string;
    deprecated_version: string | null;
}


let i18n: {[key: string]: string};
const language = document.documentElement.lang;
let summary: Summary;

function entry_abs_path(rel_path: string): string {
    return `${summary.generated_from}/${rel_path.substring(0, rel_path.length - 4)}.html`;
}

function createList(entryTable: HTMLTableElement) {
    for (const type of Object.keys(summary.script)) {
        for (const item of <Array<Entry>>summary.script[type]) {
            const entryTr = document.createElement('tr');

            const nameTd = document.createElement('td');
            const anchorElement = document.createElement('a');
            anchorElement.href = entry_abs_path(item.path);
            if (item.deprecated_version === null) {
                anchorElement.appendChild(document.createTextNode(item.name));
            } else {
                const strikeoutElement = document.createElement('s');
                strikeoutElement.appendChild(document.createTextNode(item.name));
                anchorElement.appendChild(strikeoutElement);
            }
            nameTd.appendChild(anchorElement);
            entryTr.appendChild(nameTd);

            const typeTd = document.createElement('td');
            switch (type) {
                case 'functions':
                    typeTd.appendChild(document.createTextNode(i18n['function']));
                    entryTr.setAttribute('data-type', 'function');
                    break;
                case 'constants':
                    entryTr.setAttribute('data-type', 'constant');
                    typeTd.appendChild(document.createTextNode(i18n['constant']));
                    break;
            }
            entryTr.appendChild(typeTd);

            const categoryTd = document.createElement('td');
            categoryTd.appendChild(document.createTextNode(summary.category_i18n[language][item.category].join('/')));
            entryTr.appendChild(categoryTd)

            const versionTd = document.createElement('td');
            versionTd.appendChild(document.createTextNode(item.version));
            entryTr.appendChild(versionTd);

            entryTable.appendChild(entryTr);
        }
    }
}

const debounce = (func, wait) => {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

function performSearch(searchField: HTMLInputElement, typeCheckboxes: HTMLCollectionOf<HTMLInputElement>, entries: HTMLCollectionOf<HTMLTableRowElement>): void {
    const search = searchField.value.toUpperCase()
    const enabledTypes = [];
    for (let i = 0; i < typeCheckboxes.length; i++) {
        const checkbox = typeCheckboxes[i];
        if (checkbox.checked) enabledTypes.push(checkbox.value)
    }

    for (let i = 0; i < entries.length; i++) {
        const row = entries[i];
        const nameTd = row.getElementsByTagName("td")[0];
        if (nameTd) {
            const value = nameTd.textContent || nameTd.innerText;
            if (value.toUpperCase().indexOf(search) > -1 && enabledTypes.indexOf(row.getAttribute('data-type')) > -1) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        }
    }
}

(async () => {
    await Promise.all([
        (async () => i18n = await (await fetch(`../resources/content.${language}.i18n.json`)).json())(),
        (async () => summary = await (await fetch('../resources/lcdocs_summary.json')).json())(),
    ]);

    const searchBar = <HTMLFieldSetElement>document.getElementById('search-bar')
    const searchField = <HTMLInputElement>document.getElementById('search-field');
    const typeCheckboxes = <HTMLCollectionOf<HTMLInputElement>>document.getElementsByClassName('type-checkbox');
    const entryTable = <HTMLTableElement>document.getElementById('search-results');
    createList(entryTable);

    const entries = entryTable.getElementsByTagName("tr");
    performSearch(searchField, typeCheckboxes, entries);
    searchBar.addEventListener('change', debounce(() => performSearch(searchField, typeCheckboxes, entries), 250));
    searchBar.addEventListener('keyup', debounce(() => performSearch(searchField, typeCheckboxes, entries), 250));
    entryTable.style.display = "";
    document.getElementById('loading-spinner').style.display = "none";
})();

function switchLanguage() {
    let target_lang: string;
    if (language == 'de') {
        target_lang = 'en';
    } else {
        target_lang = 'de';
    }
    const href = window.location.href;
    const baseURL = href.substring(0, href.lastIndexOf('/', href.lastIndexOf('/') - 1));
    window.location.href = baseURL + `/${target_lang}/search.html`;
}
