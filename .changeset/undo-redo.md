---
'@subterra-technologies/blockletter-react': minor
---

Undo and redo every change to the document, from the editor's top bar (the More menu when it shows
one pane at a time), Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z or Ctrl+Y, or the browser's own undo. Typing
in one field undoes as one step. Removing a block no longer asks for confirmation; its toast offers
Undo instead. `NewsletterEditorApi` gains `undo`, `redo`, `canUndo` and `canRedo`, and its `remove`
now returns nothing rather than a promise.
