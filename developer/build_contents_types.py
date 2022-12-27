from enum import Enum

class Folder():
	def __init__(self, folders, items):
		self.folders = folders
		self.items = items

class ItemState(Enum):
	AVAILABLE = 0
	NEW = 1
	DEPRECATED = 2

class Item():
	def __init__(self, name, state, path):
		self.name = name
		self.state = state
		self.path = path
