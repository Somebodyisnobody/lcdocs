# Notable targets:
# all (default): German and English onlinedocs
# online-de: only German onlinedocs, which can be partially updated

# Extra Parameters for xsltproc can be given in the XSLTFLAGS variable.
# Use prefix to select the directory where the docs are to be installed

prefix = /tmp
MKDIR_P = mkdir -p
CP = cp
CP_R = cp -r
PYTHON = $(or $(shell which python2 2> /dev/null), python)

stylesheet = clonk.xsl

# Sources:

# find all directories neither beginning nor contained within a directory beginning with a dot
sdk-dirs := $(shell find sdk -name '.*' -prune -o -type d -print)

# misc
template-files := ./developer/build_contents.py $(addprefix ./developer/templates/, content.html search.html navbar-snippet-de.html navbar-snippet-en.html loading-spinner.html) $(addprefix online/resources/, css/doku.css css/search.css js/content.js js/search.js)
content-language-files := ./developer/templates/content.de.i18n.json ./developer/templates/content.en.i18n.json

# find all *.xml files recursively in sdk/
xmlfiles := $(sort $(shell find sdk -name '.*' -prune -o -name \*.xml -print))

# Targets:

# strip from all files the .xml, and add a .html
htmlfiles := $(addsuffix .html, $(basename $(xmlfiles)))

# The translated files and directories
sdk-dirs-en := $(subst sdk, sdk-en, $(sdk-dirs))
xmlfiles-en := $(subst sdk, sdk-en, $(xmlfiles))
htmlfiles-en := $(subst sdk, sdk-en, $(htmlfiles))

# For clonk.de
online-sdk-files := $(foreach lang, en de, $(addprefix online/$(lang)/, $(htmlfiles) content.html search.html))
online-dirs := $(foreach lang, en de, $(addprefix online/$(lang)/, $(sdk-dirs))) $(addprefix online/resources/, images js css)
online-images-files := $(addprefix online/resources/, $(sort $(wildcard images/*.*)))
online-resources-files := $(addprefix online/resources/, js/bitmask.js css/doku.css) $(online-images-files)

.PHONY: all online-de install svn-update check clean

all: $(online-dirs) $(sdk-dirs-en) $(online-resources-files) $(online-sdk-files)

online-de: $(addprefix online/de/, $(sdk-dirs) images $(htmlfiles) $(extra-files))

install: all
	$(MKDIR_P) $(prefix)
	$(CP_R) $(PWD)/online/* $(prefix)

svn-update:
	svn up

check:
	xmllint --noblanks --noout --valid $(xmlfiles)

clean:
	rm -f *.mo doku.pot
	rm -rf online sdk-en

# Create needed directories
$(sdk-dirs-en) $(online-dirs):
	mkdir -p $@

lcdocs_summary.json: $(xmlfiles) developer/generate_summary.py
	@echo generate lcdocs summary report $@
	@./developer/generate_summary.py ./sdk/

online/resources/js/%.js: developer/templates/%.ts online/resources/js
	@echo compiling $@ from $<
	@tsc $(shell ./developer/tsconfig2arg.py) $<

online/resources/%.json: lcdocs_summary.json $(content-language-files) $(online-dirs)
	@# $(content-language-files) $< merges the first dependency with the list of $(content-language-files) in a for loop
	@for i in $(content-language-files) $<; do \
		echo copy $$i into online/resources/; \
		cp $$i online/resources/; \
	done

online/de/content.html online/de/search.html: online/resources/lcdocs_summary.json online/resources/content.de.i18n.json $(template-files) $(online-dirs)
	@echo generate $@
	@./developer/build_contents.py $(@F) de

online/en/content.html online/en/search.html: online/resources/lcdocs_summary.json online/resources/content.en.i18n.json $(template-files) $(online-dirs)
	@echo generate $@
	@./developer/build_contents.py $(@F) en

online/resources/css/%.css: developer/templates/%.scss online/resources/css
	@echo generate $@
	@sass $< $@

# Do some magic that i don't understand but it works :)
$(filter online/resources/%, $(online-images-files)): online/resources/%: % online/resources/images
	$(CP) $< $@


# Translation stuff
doku.pot: $(xmlfiles) extra-strings.xml xml2po.py clonk.py
	@echo extract strings to $@
	@$(PYTHON) xml2po.py -e -m clonk -o $@ $(xmlfiles) extra-strings.xml

%.po: doku.pot
	@echo update $@
	@msgmerge --no-wrap -w 1 -U $@ $<

%.mo: %.po
	@echo compile $@
	@msgfmt --statistics -o $@ $<

sdk-en/%.xml: sdk/%.xml en.mo xml2po.py clonk.py
	@echo generate $@
	@$(PYTHON) xml2po.py -e -m clonk -t en.mo -o $@ $<

###Transforms XML to HTML files for online in English and German.
###Command for converting single files: saxonb-xslt -ext:on -s:sdk/script/index.xml -xsl:clonk.xsl -o:generated_docs.html is-web-documentation=1 fileext='.html'
###Command for converting full paths (not recursively, target folder must be created): saxonb-xslt -ext:on -s:sdk/ -xsl:clonk.xsl -o:generated_docs/ is-web-documentation=1 fileext='.html'
define run-xslt
@echo transform to $(output)
@saxonb-xslt -it:main -xsl:$(stylesheet) $(XSLTFLAGS) -ext:on is-web-documentation=$(is-web-documentation) fileext='.html' output-folder=$(output) input-folder=$(input)/
@touch $@
endef
online/de/%: input=sdk
online/en/%: input=sdk-en
online/de/%.html: online/de/.tmp ;
online/en/%.html: online/en/.tmp ;
online/de/.tmp: $(xmlfiles) $(stylesheet)
	$(run-xslt)
online/en/.tmp: $(xmlfiles-en) $(stylesheet)
	$(run-xslt)
online/%: is-web-documentation=1
online/de/%: output=online/de/sdk
online/en/%: output=online/en/sdk

