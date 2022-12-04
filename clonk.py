# the description of the format used for the clonk developer docs for xml2po
class clonkXmlMode:
    """Clonks propietary xml format"""
    def getIgnoredTags(self):
        "Returns array of tags to be ignored."
        return ['emLink', 'em', 'strong', 'code']
    # These tags will create new separate message entries in the .pot/.po files when they appear. If they appear in another tag's message a placeholder is being created.
    def getFinalTags(self):
        "Returns array of tags to be considered 'final'."
        return ['table', 'text', 'desc', 'description', 'remark', 'col', 'li', 'ul', 'h', 'dt', 'funcLink', 'constLink', 'callbackLink']
    # Swallow tags are not included in the whole translation process. They don't appear as separate messages in the .pot and .po files but can appear as part in a message that was caused by another not-swallowed tag.
    def getSwallowTags(self):
        "Return array of tags which content is not translated."
        return ['funcLink', 'constLink', 'callbackLink', 'version', 'extversion', 'rtype', 'param/type', 'param/name', 'author', 'date',
                       'type', 'code', 'code/i', 'code/b', 'name', 'func/title',
                       'const/name', 'const/value']
    def getSpacePreserveTags(self):
        "Returns array of tags in which spaces are to be preserved."
        return ['code']


    def preProcessXml(self, doc, msg):
        """Add additional messages of interest here."""
        return
        #root = doc.getRootElement()

    def postProcessXmlTranslation(self, doc, language, translators):
        """Sets a language and translators in "doc" tree.
        
        "translators" is a string consisted of translator credits.
        "language" is a simple string.
        "doc" is a libxml2.xmlDoc instance."""
        root = doc.getRootElement()
        root.setProp('xml:lang', language)

    def getStringForTranslators(self):
        """Returns None or a string to be added to PO files.

        Common example is 'translator-credits'."""
        return None

    def getCommentForTranslators(self):
        """Returns a comment to be added next to string for crediting translators.

        It should explain the format of the string provided by getStringForTranslators()."""
        return None
