import {
  ConnectionLost,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from "@jupyterlab/application";

// Common Extension Point
import {
  IConnectionLost,
  ILabStatus,
  ILabShell,
  ILayoutRestorer,
  IMimeDocumentTracker,
  IRouter,
  JupyterLab
} from "@jupyterlab/application";

import {
  ICommandPalette,
  ISplashScreen,
  IThemeManager,
  IWindowResolver,
  MainAreaWidget,
  WidgetTracker
} from "@jupyterlab/apputils";

import {
  IEditorServices
} from "@jupyterlab/codeeditor";

import {
  IConsoleTracker
} from "@jupyterlab/console";

//

import {
  LoggerRegistry,
  LogConsolePanel,
  IHtmlLog,
  ITextLog,
  IOutputLog,
  ILogger,
  LogLevel
} from '@jupyterlab/logconsole';

import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { CommandRegistry } from "@lumino/commands";
import { ISignal, Signal, Slot } from "@lumino/signaling";
import { PartialJSONValue } from '@lumino/coreutils';
import { INotebookTracker, NotebookPanel, INotebookModel, Notebook } from "@jupyterlab/notebook";
import { NotebookActions } from '@jupyterlab/notebook';
import { Cell, CodeCell, CellModel, CodeCellModel, ICellModel, ICodeCellModel } from "@jupyterlab/cells";
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Menu } from '@lumino/widgets';

import { JSONExt, JSONObject, Token } from "@lumino/coreutils";

import { Widget } from "@lumino/widgets";

import {
  IObservableJSON,
  IObservableList,
  IObservableUndoableList
} from "@jupyterlab/observables";
import { IChangedArgs } from "@jupyterlab/coreutils";
import { DocumentRegistry } from "@jupyterlab/docregistry";

import { Contents } from '@jupyterlab/services';

import { URLExt } from "@jupyterlab/coreutils";

import { ServerConnection } from "@jupyterlab/services";
import { isDebugEventMsg, isInfoRequestMsg } from "@jupyterlab/services/lib/kernel/messages";

import { SignalDigger } from "./signal_digger"


/**
 * Initialization data for the etc-jupyterlab-telemetry extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: "etc-jupyterlab-signal-logger:plugin",
  autoStart: true,
  requires: [
    ICommandPalette,
    IRenderMimeRegistry,
    IMainMenu,
    ILayoutRestorer,
    IConnectionLost,
    JupyterLab.IInfo,
    JupyterFrontEnd.IPaths,
    ILabStatus,
    ILabShell,
    INotebookTracker
  ],
  activate: (
    jupyterFrontEnd: JupyterFrontEnd,
    commandPalette: ICommandPalette,
    rendermime: IRenderMimeRegistry,
    mainMenu: IMainMenu,
    layoutRestorer: ILayoutRestorer,
    connectionLost: IConnectionLost,
    info: JupyterLab.IInfo,
    paths: JupyterFrontEnd.IPaths,
    labStatus: ILabStatus,
    labShell: ILabShell,
    notebookTracker: INotebookTracker
  ) => {

    console.log('JupyterLab extension @educational-technology-collective/etc_jupyterlab_signal_digger is activated!');

    new SignalDigger({
      subjects: [
        {
          object: jupyterFrontEnd,
          origin: jupyterFrontEnd.name
        },
        {
          object: notebookTracker,
          origin: INotebookTracker.name
        }
      ],
      filterOut: [/keyBindingChanged/, /runningChanged/],
      filterFor: []
    });
  }

};

export default extension;