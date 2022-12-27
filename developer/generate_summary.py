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

if not os.path.isdir(sys.argv[1]):
	print(f'"{sys.argv[1]}" is not a directory or not accessible!', file=sys.stderr)
	sys.exit(1)

def get_unique_tag(node, tag):
	elements = node.getElementsByTagName(tag)
	if len(elements) != 1:
		print(f'None or multiple <{tag}> elements found in "{file_path}"!', file=sys.stderr)
		return None
	return elements[0]

def get_unique_value(node, tag):
	return get_unique_tag(node, tag).firstChild.nodeValue

constants = []
functions = []
for path, dir_names, files in os.walk(sys.argv[1]):
	for file_name in files:
		file_path = os.path.join(path, file_name)
		dom = minidom.parse(file_path)
		
		# FIXME create a function to remove this duplication (ATTENTION: const has "name" and func has "title"; const doesn't have <versions> (only <version>))
		
		for const in dom.getElementsByTagName('const'):
			const_entry = {}
			const_entry['path'] = file_path
			name = get_unique_value(const, 'name')
			category = get_unique_value(const, 'category').split('/')
			version = get_unique_value(const, 'version')
			if name and category and version:
				const_entry['name'] = name
				const_entry['category'] = category
				const_entry['version'] = version
			else:
				continue
			
			constants.append(const_entry)
		
		for func in dom.getElementsByTagName('func'):
			func_entry = {}
			func_entry['path'] = file_path
			name = get_unique_value(func, 'title')
			category = get_unique_value(func, 'category').split('/')
			version = get_unique_value(get_unique_tag(func, 'versions'), 'version')
			if name and category and version:
				func_entry['name'] = name
				func_entry['category'] = category
				func_entry['version'] = version
			else:
				continue
			
			functions.append(func_entry)

constants.sort(key=lambda item: item['name'])
constants.sort(key=lambda item: item['path'])

functions.sort(key=lambda item: item['path'])

everything = [*[const['name'] for const in constants], *[func['name'] for func in functions]]
print('Duplicates:', [item for item, count in collections.Counter(everything).items() if count > 1])

# WARNING: datetime is in local timezone
out = {'created': datetime.datetime.now().isoformat(), 'constants': constants, 'functions': functions}
with open('lcdocs_summary.json', 'w') as f:
	f.write(json.dumps(out, indent='\t'))
