#!/bin/env python3

import collections
import datetime
import json
import os
import sys
import xml.dom.minidom as minidom

if len(sys.argv) < 2:
	print(f'Not enough arguments!\nSyntax: {sys.argv[0]} path', file=sys.stderr)
	sys.exit(1)

root_dir = os.path.normpath(sys.argv[1])

if not os.path.isdir(root_dir):
	print(f'"{root_dir}" is not a directory or not accessible!', file=sys.stderr)
	sys.exit(1)

po_i18n = {}
with open('en.po', 'r') as f:
	en_po = f.read().split('\n')
for line in en_po:
	if line.startswith('msgid'):
		msgid = line[7:-1]
	elif line.startswith('msgstr'):
		po_i18n[msgid] = line[8:-1]

def get_unique_tag(node, tag, file_path):
	'''Return the first node with name *tag* of *node* or print a warning and return None in the case of none or multiple tags with the name *tag*
	   example: <versions><version>I want this!</version><extversion></extversion></versions>'''
	
	elements = node.getElementsByTagName(tag)
	
	if len(elements) != 1:
		print(f'None or multiple <{tag}> elements found in "{file_path}"!', file=sys.stderr)
		return None
	
	return elements[0]

def get_unique_value(node, tag, file_path):
	'''Return the text contained in *node* or print a warning and return None in the case of none or multiple tags with the name *tag*
	   example: <title>FooBar</title> -> "FooBar"
	   detailed explanation: Get value of first child node of *node* and strip whitespace. This won't work if *node* doesn't have a child node or if that child node is not a text node)'''
	
	element = get_unique_tag(node, tag, file_path)
	
	if not element:
		return None
	
	return element.firstChild.nodeValue.strip()

categories = []

def create_entry(entries, raw_file_path, node):
	tag_name = node.tagName
	
	file_path = raw_file_path.replace(os.path.sep, '/')[len(root_dir) + 1:] # replace os specific seperators with / so it's usable in an URL
	
	category = get_unique_value(node, 'category', file_path)
	if category not in categories:
		categories.append(category)
	deprecated_tags = node.getElementsByTagName('deprecated')
	deprecated_version = None
	if len(deprecated_tags) > 0:
		deprecated_version = get_unique_value(deprecated_tags[0], 'version', file_path)
	if tag_name == 'const':
		name = get_unique_value(node, 'name', file_path)
		version = get_unique_value(node, 'version', file_path)
	elif tag_name == 'func':
		name = get_unique_value(node, 'title', file_path)
		version = get_unique_value(get_unique_tag(node, 'versions', file_path), 'version', file_path)
	
	if not (name and category and version):
		print(f'Skipping <{tag_name}> in {file_path}', file=sys.stderr)
		return
	
	# this is the object which is later exported to the summary JSON file
	entry = {
		'path': file_path,
		'name': name,
		'category': category,
		'version': version,
		'deprecated_version': deprecated_version
	}
	entries.append(entry)

# search recursively in a given path for XML files
constants = []
functions = []
for path, dir_names, files in os.walk(root_dir):
	for file_name in files:
		# ignore non-XML files
		if not file_name.endswith('.xml'):
			continue
		
		file_path = os.path.join(path, file_name)
		# parse the XML file into a DOM object
		document = minidom.parse(file_path)
		
		# find <const> tags in the current document
		for const in document.getElementsByTagName('const'):
			create_entry(constants, file_path, const)
		
		# find <func> tags in the current document
		for func in document.getElementsByTagName('func'):
			create_entry(functions, file_path, func)

# sort by name first, then group by file (one constgroup-file can have multiple constants)
constants.sort(key=lambda item: item['name'])
constants.sort(key=lambda item: item['path'])
# only sort by path for functions
functions.sort(key=lambda item: item['path'])

# data integrity check: print a list of duplicate entries by the "name"-key (this is an empty array when the data is correct)
flattened_names = [*[const['name'] for const in constants], *[func['name'] for func in functions]]
print('Duplicates:', [item for item, count in collections.Counter(flattened_names).items() if count > 1])

categories.sort()

category_i18n = {'de': {}, 'en': {}}
for category in categories:
	category_i18n['de'][category] = category.split('/')
for category in categories:
	category_i18n['en'][category] = po_i18n[category].split('/')

# also export the current date and time into the JSON file
# WARNING: datetime is in local timezone
out = {'created': datetime.datetime.now().isoformat(), 'generated_from': root_dir, 'category_i18n': category_i18n, 'constants': constants, 'functions': functions}
with open('lcdocs_summary.json', 'w') as f:
	# disable "ensure_ascii" so UTF-8 chars are output correctly
	f.write(json.dumps(out, ensure_ascii=False, indent='\t'))
