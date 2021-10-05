# Copyright: Ankitects Pty Ltd and contributors
# License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html

from typing import Callable, Optional

import aqt
from anki.collection import OpChanges
from aqt import AnkiQt, gui_hooks
from aqt.qt import *
from aqt.utils import restoreGeom, saveGeom
from aqt.editor import Editor


class EditorWindow(QMainWindow):
    editor_widget: QWidget
    main_layout: QVBoxLayout
    button_box = QDialogButtonBox
    editor: Optional[Editor]

    def __init__(
        self, mw: AnkiQt, geom_key="", dialog_key="", title="", min_size=(100, 100)
    ) -> None:
        super().__init__(parent=None)
        self.mw = mw
        self.setWindowTitle(title)
        self.setMinimumSize(*min_size)
        self.geom_key = geom_key
        restoreGeom(self, self.geom_key)
        self.dialog_key = dialog_key
        self.setup_central_widget()
        self.cleanup_done = False
        gui_hooks.operation_did_execute.append(self.on_operation_did_execute)

    def setup_central_widget(self) -> None:
        widget = QWidget()

        self.main_layout = QVBoxLayout()
        self.main_layout.setContentsMargins(12, 12, 12, 12)
        self.main_layout.setSpacing(3)

        self.editor_widget = QWidget()
        # self.editor_widget.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        # self.editor_widget.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred)
        self.main_layout.addWidget(self.editor_widget)

        self.button_box = QDialogButtonBox()
        qconnect(self.button_box.rejected, self.close)  # close button
        self.main_layout.addWidget(self.button_box)

        widget.setLayout(self.main_layout)
        self.setCentralWidget(widget)

    def on_operation_did_execute(
        self, changes: OpChanges, handler: Optional[object]
    ) -> None:
        raise NotImplementedError

    def can_close(self) -> bool:
        raise NotImplementedError

    def save_and_if_can_close_then(self, callback: Callable) -> None:
        def on_after_save() -> None:
            if self.can_close():
                callback()

        self.editor.call_after_note_saved(on_after_save)

    def closeEvent(self, event: QCloseEvent) -> None:
        if self.cleanup_done:
            event.accept()
            self.mw.deferred_delete_and_garbage_collect(self)
            return
        else:
            self.save_and_if_can_close_then(self.cleanup_and_close)
            return event.ignore()

    def cleanup_and_close(self) -> None:
        gui_hooks.operation_did_execute.remove(self.on_operation_did_execute)
        self.editor.cleanup()
        saveGeom(self, self.geom_key)
        aqt.dialogs.markClosed(self.dialog_key)
        self.cleanup_done = True
        self.close()

    def closeWithCallback(self, on_success: Callable) -> None:
        def callback() -> None:
            self.cleanup_and_close()
            on_success()

        self.save_and_if_can_close_then(callback)
