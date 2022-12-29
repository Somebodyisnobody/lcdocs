interface Entry {
	path: string;
	name: string;
	category: string[];
	version: string;
	deprecated_version: string | null;
}

type EntryType = 'constants' | 'functions';

interface Summary {
	constants: Entry[];
	functions: Entry[];
}

type ListSorting = 'by_category' | 'by_name';

enum ItemState {
	AVAILABLE = 0,
	NEW,
	DEPRECATED,
}

interface Item {
	name: string;
	state: ItemState;
	path: string;
}

type FolderList = {[name: string]: Folder};

interface Folder {
	folders: FolderList;
	items: Item[];
}

let i18n: {[key: string]: string};
let summary: Summary;

function open_bullet(bullet: HTMLImageElement): void {
	bullet.src = 'images/bullet_folder_open.gif';
	bullet.alt = '-';
	bullet.title = i18n['collapse'];
}

function close_bullet(bullet: HTMLImageElement): void {
	bullet.src = 'images/bullet_folder.gif';
	bullet.alt = '+';
	bullet.title = i18n['expand'];
}

function collapse_tree(event: MouseEvent): void {
	const bullet = event.target as HTMLImageElement;
	const ul = bullet.nextElementSibling as HTMLUListElement;
	if (bullet.alt == '+') {
		open_bullet(bullet);
		ul.style.display = '';
	} else {
		close_bullet(bullet);
		ul.style.display = 'none';
	}
}

function create_folder_structure_by_category(current_folder: Folder, entry: Entry): void {
	if (entry.category.length == 0) {
		current_folder.items.push({name: entry.name, state: ItemState.AVAILABLE, path: entry.path});
		return;
	}
	
	const target_category = entry.category[0];
	if (!current_folder.folders[target_category]) {
		current_folder.folders[target_category] = {folders: {}, items: []};
	}
	const consumed_entry = structuredClone(entry);
	consumed_entry.category.splice(0, 1); // remove the target category from the entry
	create_folder_structure_by_category(current_folder.folders[target_category], consumed_entry);
}

function sort_folder_list(source_folder_list: FolderList): FolderList {
	// recurse into subfolders
	for (const folder of Object.values(source_folder_list)) {
		folder.folders = sort_folder_list(folder.folders);
	}
	
	const sorted_folder_list: FolderList = {};
	Object.keys(source_folder_list).sort().forEach((name) => {
		sorted_folder_list[name] = source_folder_list[name];
	});
	
	return sorted_folder_list;
}

function create_list(parent_folder: Folder, entry_type: EntryType, sorting: ListSorting): void {
	const list: Folder = {folders: {}, items: []};
	
	switch (sorting) {
	case 'by_category':
		for (const entry of summary[entry_type]) {
			create_folder_structure_by_category(list, entry);
		}
		list.folders = sort_folder_list(list.folders);
		break;
	case 'by_name':
		for (const entry of summary[entry_type]) {
			list.items.push({name: entry.name, state: ItemState.AVAILABLE, path: entry.path});
		}
		break;
	}
	
	parent_folder.folders[i18n[entry_type] + ' ' + i18n[sorting]] = list;
}

function render_folder(folder: Folder, folder_name: string, parent_node: HTMLUListElement, first=true): void {
	const folder_node = document.createElement('ul') as HTMLUListElement;
	
	const folder_item_list_node = document.createElement('ul') as HTMLUListElement;
	
	const folder_bullet = document.createElement('img') as HTMLImageElement;
	folder_bullet.className = 'folder-bullet';
	if (first) {
		open_bullet(folder_bullet);
	} else {
		close_bullet(folder_bullet);
		folder_item_list_node.style.display = 'none';
	}
	folder_bullet.addEventListener('click', collapse_tree);
	folder_node.appendChild(folder_bullet);
	
	folder_node.appendChild(document.createTextNode(folder_name));
	
	for (const item of folder.items) {
		const item_li = document.createElement('li') as HTMLLIElement;
		
		const item_bullet = document.createElement('img') as HTMLImageElement;
		item_bullet.className = 'bullet';
		item_bullet.src = 'images/bullet_sheet.gif';
		item_bullet.alt = '-';
		item_li.appendChild(item_bullet);
		
		item_li.appendChild(document.createTextNode(item.name));
		
		folder_item_list_node.appendChild(item_li);
	}
	
	for (const [subfolder_name, subfolder] of Object.entries(folder.folders)) {
		render_folder(subfolder, subfolder_name, folder_item_list_node, false);
	}
	
	folder_node.appendChild(folder_item_list_node);
	
	parent_node.appendChild(folder_node);
}

(async () => {
	await Promise.all([
		(async () => i18n = await (await fetch(`content.${document.documentElement.lang}.i18n.json`)).json())(),
		(async () => summary = await (await fetch('lcdocs_summary.json')).json())(),
	]);
	
	const folders_ul = document.getElementById('folders') as HTMLUListElement;
	
	const root_folder: Folder = {folders: {}, items: []};
	
	const script_folder: Folder = {folders: {}, items: []};
	create_list(script_folder, 'constants', 'by_category');
	create_list(script_folder, 'constants', 'by_name');
	create_list(script_folder, 'functions', 'by_category');
	create_list(script_folder, 'functions', 'by_name');
	root_folder.folders[i18n['script']] = script_folder;
	
	for (const [folder_name, folder] of Object.entries(root_folder.folders)) {
		render_folder(folder, folder_name, folders_ul);
	}
})();
