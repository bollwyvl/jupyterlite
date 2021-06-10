// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd,
  ILabShell
} from '@jupyterlab/application';

import { ICommandPalette, Dialog, showDialog } from '@jupyterlab/apputils';

import { PageConfig } from '@jupyterlab/coreutils';

import { IDocumentManager } from '@jupyterlab/docmanager';

import {
  IDocumentProvider,
  IDocumentProviderFactory,
  ProviderMock
} from '@jupyterlab/docprovider';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { ITranslator, TranslationManager } from '@jupyterlab/translation';

import { liteIcon, liteWordmark } from '@jupyterlite/ui-components';

import { Widget } from '@lumino/widgets';

import { WebsocketProvider } from 'y-websocket';

import React from 'react';

const YJS_WEBSOCKET_URL = 'wss://demos.yjs.dev';

class WebSocketProvider extends WebsocketProvider implements IDocumentProvider {
  constructor(options: IDocumentProviderFactory.IOptions) {
    super(YJS_WEBSOCKET_URL, options.guid, options.ymodel.ydoc);
  }
  requestInitialContent(): Promise<boolean> {
    return Promise.resolve(true);
  }
  putInitializedState(): void {
    // no-op
  }
  acquireLock(): Promise<number> {
    return Promise.resolve(0);
  }
  releaseLock(lock: number): void {
    // no-op
  }
}

/**
 * The command IDs used by the application extension.
 */
namespace CommandIDs {
  export const about = 'application:about';

  export const download = 'docmanager:download';
}

/**
 * Add a command to show an About dialog.
 */
const about: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/application-extension:about',
  autoStart: true,
  requires: [ITranslator],
  optional: [ICommandPalette, IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    palette: ICommandPalette | null,
    menu: IMainMenu | null
  ): void => {
    const { commands } = app;
    const trans = translator.load('jupyterlab');
    const category = trans.__('Help');

    commands.addCommand(CommandIDs.about, {
      label: trans.__('About %1', app.name),
      execute: () => {
        const versionNumber = trans.__('Version %1', app.version);
        const versionInfo = (
          <span className="jp-About-version-info">
            <span className="jp-About-version">{versionNumber}</span>
          </span>
        );
        const title = (
          <span className="jp-About-header">
            <div className="jp-About-header-info">
              <liteWordmark.react height="auto" width="196px" />
              {versionInfo}
            </div>
          </span>
        );

        // Create the body of the about dialog
        const jupyterliteURL = 'https://github.com/jtpio/jupyterlite';
        const contributorsURL =
          'https://github.com/jtpio/jupyterlite/graphs/contributors';
        const externalLinks = (
          <span className="jp-About-externalLinks">
            <a
              href={contributorsURL}
              target="_blank"
              rel="noopener noreferrer"
              className="jp-Button-flat"
            >
              {trans.__('CONTRIBUTOR LIST')}
            </a>
            <a
              href={jupyterliteURL}
              target="_blank"
              rel="noopener noreferrer"
              className="jp-Button-flat"
            >
              {trans.__('JUPYTERLITE ON GITHUB')}
            </a>
          </span>
        );
        const copyright = (
          <span className="jp-About-copyright">
            {trans.__('© 2021 JupyterLite Contributors')}
          </span>
        );
        const body = (
          <div className="jp-About-body">
            {externalLinks}
            {copyright}
          </div>
        );

        return showDialog({
          title,
          body,
          buttons: [
            Dialog.createButton({
              label: trans.__('Dismiss'),
              className: 'jp-About-button jp-mod-reject jp-mod-styled'
            })
          ]
        });
      }
    });

    if (palette) {
      palette.addItem({ command: CommandIDs.about, category });
    }

    if (menu) {
      menu.helpMenu.addGroup([{ command: CommandIDs.about }], 0);
    }
  }
};

/**
 * An alternative document provider plugin
 */
const docProviderPlugin: JupyterFrontEndPlugin<IDocumentProviderFactory> = {
  id: '@jupyterlite/application-extension:docprovider',
  provides: IDocumentProviderFactory,
  activate: (app: JupyterFrontEnd): IDocumentProviderFactory => {
    const collaborative = PageConfig.getOption('collaborative');
    const factory = (options: IDocumentProviderFactory.IOptions): IDocumentProvider => {
      return collaborative ? new WebSocketProvider(options) : new ProviderMock();
    };
    return factory;
  }
};

/**
 * A plugin providing download commands in the file menu and command palette.
 */
const downloadPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/application-extension:download',
  autoStart: true,
  requires: [ITranslator, IDocumentManager],
  optional: [ICommandPalette, IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    docManager: IDocumentManager,
    palette: ICommandPalette | null,
    mainMenu: IMainMenu | null
  ) => {
    const trans = translator.load('jupyterlab');
    const { commands, shell } = app;
    const isEnabled = () => {
      const { currentWidget } = shell;
      return !!(currentWidget && docManager.contextForWidget(currentWidget));
    };
    commands.addCommand(CommandIDs.download, {
      label: trans.__('Download'),
      caption: trans.__('Download the file to your computer'),
      isEnabled,
      execute: () => {
        // Checks that shell.currentWidget is valid:
        const current = shell.currentWidget;
        if (isEnabled() && current) {
          const context = docManager.contextForWidget(current);
          if (!context) {
            return showDialog({
              title: trans.__('Cannot Download'),
              body: trans.__('No context found for current widget!'),
              buttons: [Dialog.okButton({ label: trans.__('OK') })]
            });
          }
          const element = document.createElement('a');
          element.href = `data:text/json;charset=utf-8,${encodeURIComponent(
            context.model.toString()
          )}`;
          element.download = context.path;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        }
      }
    });

    const category = trans.__('File Operations');

    if (palette) {
      palette.addItem({ command: CommandIDs.download, category });
    }

    if (mainMenu) {
      mainMenu.fileMenu.addGroup([{ command: CommandIDs.download }], 6);
    }
  }
};

/**
 * The main application icon.
 */
const liteLogo: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/application-extension:logo',
  // marking as optional to not throw errors in retro
  optional: [ILabShell],
  autoStart: true,
  activate: (app: JupyterFrontEnd, labShell: ILabShell) => {
    if (!labShell) {
      return;
    }
    const logo = new Widget();
    liteIcon.element({
      container: logo.node,
      elementPosition: 'center',
      margin: '2px 2px 2px 8px',
      height: 'auto',
      width: '16px'
    });
    logo.id = 'jp-MainLogo';
    labShell.add(logo, 'top', { rank: 0 });
  }
};

/**
 * A simplified Translator
 */
const translator: JupyterFrontEndPlugin<ITranslator> = {
  id: '@jupyterlite/application-extension:translator',
  activate: (app: JupyterFrontEnd): ITranslator => {
    const translationManager = new TranslationManager();
    return translationManager;
  },
  autoStart: true,
  provides: ITranslator
};

const plugins: JupyterFrontEndPlugin<any>[] = [
  about,
  docProviderPlugin,
  downloadPlugin,
  liteLogo,
  translator
];

export default plugins;
