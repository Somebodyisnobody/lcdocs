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

def create_entry(entries, file_path, node):
	tag_name = node.tagName
	
	category = get_unique_value(node, 'category').split('/')
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
for path, dir_names, files in os.walk(sys.argv[1]):
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

# Print the current datetime in the exported file
# WARNING: datetime is in local timezone
out = {'created': datetime.datetime.now().isoformat(), 'constants': constants, 'functions': functions}
with open('lcdocs_summary.json', 'w') as f:
	f.write(json.dumps(out, indent='\t'))
