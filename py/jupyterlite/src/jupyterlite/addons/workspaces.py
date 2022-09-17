"""a JupyterLite addon for supporting workspaces"""
import json
import pprint
from collections import defaultdict

import doit.tools

from ..constants import (
    ALL_JSON,
    API_WORKSPACES,
    JSON_FMT,
    UTF8,
    WORKSPACE_EXT,
    WORKSPACES,
)
from .base import BaseAddon


class WorkspacesAddon(BaseAddon):
    """discover and collect workspaces and update /api/workspaces/all.json"""

    __all__ = ["status", "post_build", "check"]

    def status(self, manager):
        yield dict(
            name="workspaces:files",
            actions=[lambda: print("    workspaces: ", *self.workspaces)],
        )

    def post_build(self, manager):
        """Update /api/workspaces/all.json"""
        if not self.workspaces:
            return

        yield dict(
            name="workspaces",
            file_dep=[*self.workspaces],
            targets=[
                (doit.tools.create_folder, [self.output_workspaces_json.parent]),
                self.output_workspaces_json,
            ],
            actions=[self.update_workspaces_all_json],
        )

    def check(self, manager):
        """verify /api/workspaces/all.json"""
        if not self.workspaces:
            return

        yield dict(
            name="workspaces",
            doc="validate the workspaces in api/workspaces/all.json",
            file_dep=[self.output_workspaces_json],
            actions=[self.validate_workspaces_json],
        )

    def update_workspaces_all_json(self):
        """Update /api/workspaces/"""
        workspaces = {}
        for workspace_path in self.workspaces:
            workspace = json.loads(workspace_path.read_text(**UTF8))
            stem = workspace.stem
            workspace_id = workspace.get("metadata", {}).get("id", stem)
            workspaces[workspace_id] = workspace

        self.output_workspaces_json.write_text(
            json.dumps(workspaces, **JSON_FMT),
            **UTF8,
        )

    def validate_workspaces_json(self):
        """Ensure /api/workspaces/all.json is well-formatted"""
        workspaces = self.output_workspaces_json.read_text(**UTF8)

        errors = defaultdict(list)

        for workspace_id, workspace in workspaces.items():
            if not "data" in workspace:
                errors[workspace_id] += "missing `data`"

            if not "metadata" in workspace:
                errors[workspace_id] += "missing `metadata`"

        if errors:
            print("Errors found in", self.output_workspaces_json)
            pprint.pprint(errors)
            return False

    @property
    def workspaces_dir(self):
        """The well-known workspaces dir"""
        return self.manager.lite_dir / WORKSPACES

    @property
    def workspaces(self):
        """Get all well-known and configured workspaces"""
        return sorted(
            [*self.workspaces_dir.glob(f"*.{WORKSPACE_EXT}"), *self.manager.workspaces]
        )

    @property
    def output_workspaces_json(self):
        """The path to write with all the workspaces"""
        return self.manager.output_dir / API_WORKSPACES / ALL_JSON