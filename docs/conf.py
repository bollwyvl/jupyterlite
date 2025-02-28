"""documentation for jupyterlite"""
import datetime
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from sphinx.application import Sphinx

CONF_PY = Path(__file__)
HERE = CONF_PY.parent
ROOT = HERE.parent
APP_PKG = ROOT / "app/package.json"
APP_DATA = json.loads(APP_PKG.read_text(encoding="utf-8"))
RTD = json.loads(os.environ.get("READTHEDOCS", "False").lower())
EXAMPLE_FILES = [
    ROOT / "README.md",
    ROOT / "docs/_static/icon.svg",
    ROOT / "app/jupyter-lite.json",
    ROOT / "app/jupyterlite.schema.v0.json",
    *[
        example
        for example in (ROOT / "examples").rglob("*.*")
        if not ".ipynb_checkpoints" in str(example)
        and "__pycache__" not in str(example)
    ],
]

# tasks that won't have been run prior to building the docs on RTD
RTD_TASKS = ["build", "docs:typedoc:mystify", "docs:app:pack"]

# this is _not_ the way
sys.path += [str(ROOT / "py/jupyterlite/src")]

# metadata
author = APP_DATA["author"]
project = author.replace("Contributors", "").strip()
copyright = f"{datetime.date.today().year}, {author}"

# The full version, including alpha/beta/rc tags
release = APP_DATA["version"]

# The short X.Y version
version = ".".join(release.rsplit(".", 1))

# sphinx config
extensions = [
    # first-party sphinx extensions
    "sphinx.ext.todo",
    "sphinx.ext.autosectionlabel",
    # for routing
    "sphinxext.rediraffe",
    # for pretty schema
    "sphinx-jsonschema",
    # mostly markdown (some ipynb)
    "myst_nb",
    # autodoc-related stuff must be in order
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx_autodoc_typehints",
]

autosectionlabel_prefix_document = True
myst_heading_anchors = 3
suppress_warnings = ["autosectionlabel.*"]

rediraffe_redirects = {
    "try/index": "_static/index",
    "try/lab/index": "_static/lab/index",
    "try/retro/index": "_static/retro/tree/index",
}

# files
templates_path = ["_templates"]
html_favicon = "../app/lab/favicon.ico"
# rely on the order of these to patch json, labextensions correctly
html_static_path = [
    # docs stuff
    "_static",
    # as-built application, extensions, contents, and patched jupyter-lite.json
    "../build/docs-app",
]
exclude_patterns = [
    "_build",
    ".ipynb_checkpoints",
    "**/.ipynb_checkpoints",
    "**/~.*",
    "**/node_modules",
    "babel.config.*",
    "jest-setup.js",
    "jest.config.js",
    "jupyter_execute",
    ".jupyter_cache",
    "test/",
    "tsconfig.*",
    "webpack.config.*",
]
jupyter_execute_notebooks = "auto"

execution_excludepatterns = [
    "_static/**/*",
]
html_css_files = [
    "theme.css",
]

# theme
html_theme = "pydata_sphinx_theme"
html_logo = "_static/wordmark.svg"
html_theme_options = {
    "github_url": APP_DATA["homepage"],
    "use_edit_page_button": True,
    "navbar_start": ["launch.html"],
    "navbar_center": ["navbar-logo.html", "navbar-nav.html"],
}

html_context = {
    "github_user": "jtpio",
    "github_repo": "jupyterlite",
    "github_version": "main",
    "doc_path": "docs",
}


def after_build(app: Sphinx, error):
    """sphinx-jsonschema makes duplicate ids. clean them"""
    print("jupyterlite: Cleaning generated ids in JSON schema html...", flush=True)
    outdir = Path(app.builder.outdir)
    for schema_html in outdir.glob("schema-v*.html"):
        print(f"... fixing: {schema_html.relative_to(outdir)}")
        text = schema_html.read_text(encoding="utf-8")
        new_text = re.sub(r'<span id="([^"]*)"></span>', "", text)
        if text != new_text:
            schema_html.write_text(new_text, encoding="utf-8")


def before_rtd_build(app: Sphinx, error):
    """ensure doit docs:sphinx precursors have been met on RTD"""
    print("[jupyterlite-docs] Staging files changed by RTD...", flush=True)
    subprocess.call(["git", "add", "."], cwd=str(ROOT))
    task_rcs = []
    print("[jupyterlite-docs] Ensuring built application...", flush=True)
    for task in RTD_TASKS:
        print(f"[jupyterlite-docs] running {task}", flush=True)
        subprocess.call(["git", "diff", str(ROOT)], cwd=str(ROOT))
        rc = subprocess.call(["doit", task], cwd=str(ROOT))
        print(f"[jupyterlite-docs] ... ran {task}: returned {rc}", flush=True)
        task_rcs += [rc]

    if max(task_rcs) > 0:
        raise Exception("[jupyterlite-docs] ... FAIL, see log above")
    print("[jupyterlite-docs] ... OK", flush=True)


def setup(app):
    app.connect("build-finished", after_build)
    if RTD:
        app.connect("config-inited", before_rtd_build)
