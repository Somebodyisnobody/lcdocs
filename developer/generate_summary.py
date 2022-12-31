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

# Returns the first tag in a list. Use it when you have always only one element first in a list that you want to use (<versions><version>I want this!</version><extversion></extversion></versions>)
def get_unique_tag(node, tag):
	elements = node.getElementsByTagName(tag)
	if len(elements) != 1:
		print(f'None or multiple <{tag}> elements found in "{file_path}"!', file=sys.stderr)
		return None
	return elements[0]

# Returns the value of a given element (tag) which is contained in node. (<title>FooBar</title> => "FooBar")
def get_unique_value(node, tag):
	element = get_unique_tag(node, tag)
	if not element:
		return
	return element.firstChild.nodeValue.strip()

categories = []

def create_entry(entries, raw_file_path, node):
	tag_name = node.tagName
	
	file_path = raw_file_path.replace(os.path.sep, '/')[len(root_dir) + 1:] # replace os specific seperators with / so it's usable in an URL
	
	category = get_unique_value(node, 'category')
	if category not in categories:
		categories.append(category)
	deprecated_tags = node.getElementsByTagName('deprecated')
	deprecated_version = None
	if len(deprecated_tags) > 0:
		deprecated_version = get_unique_value(deprecated_tags[0], 'version')
	if tag_name == 'const':
		name = get_unique_value(node, 'name')
		version = get_unique_value(node, 'version')
	elif tag_name == 'func':
		name = get_unique_value(node, 'title')
		version = get_unique_value(get_unique_tag(node, 'versions'), 'version')
	if not (name and category and version):
		print(f'Skipping <{tag_name}> in {file_path}', file=sys.stderr)
		return
	
	# This is our new object for export to file later
	entry = {
		'path': file_path,
		'name': name,
		'category': category,
		'version': version,
		'deprecated_version': deprecated_version
	}
	entries.append(entry)

# Now we search recursively in a given path for xml files
# FIXME only loop trough xml files to be sure no side effects appear
constants = []
functions = []
for path, dir_names, files in os.walk(root_dir):
	for file_name in files:
		file_path = os.path.join(path, file_name)
		# Parse the file into a dom object which contains elements
		dom = minidom.parse(file_path)
		
		# Search for <const> Elements in the current dom object
		for const in dom.getElementsByTagName('const'):
			create_entry(constants, file_path, const)
		
		# Search for <func> Elements in the current dom object
		for func in dom.getElementsByTagName('func'):
			create_entry(functions, file_path, func)

# Sort by name first, then group by file (one constgroup-file can have multiple constants)
constants.sort(key=lambda item: item['name'])
constants.sort(key=lambda item: item['path'])
# Sort by name only for functions
functions.sort(key=lambda item: item['path'])

# Data integrity check: We search for duplicates over the "name"-key of { "constants", "functions" }. The desired output is an empty array and means everything is okay.
flattened_names = [*[const['name'] for const in constants], *[func['name'] for func in functions]]
print('Duplicates:', [item for item, count in collections.Counter(flattened_names).items() if count > 1])

categories.sort()

category_i18n = {'de': {}, 'en': {}}
for category in categories:
	category_i18n['de'][category] = category.split('/')
for category in categories:
	category_i18n['en'][category] = po_i18n[category].split('/')

# Print the current datetime in the exported file
# WARNING: datetime is in local timezone
out = {'created': datetime.datetime.now().isoformat(), 'generated_from': root_dir, 'category_i18n': category_i18n, 'constants': constants, 'functions': functions}
with open('lcdocs_summary.json', 'w') as f:
	# disable "ensure_ascii" so UTF-8 chars are output correctly
	f.write(json.dumps(out, ensure_ascii=False, indent='\t'))
