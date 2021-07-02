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


interface ISubject {
  object: any;
  origin?: string;
  originPath?: string;
  paths?: Array<string>;
}

interface ISignalLoggerOptions {
  subjects: Array<ISubject>;
  filterOut: Array<RegExp>;
  filterFor: Array<RegExp>;
}


class SignalLogger {

  private _seen: WeakSet<any>;
  private _filterOut: Array<RegExp>;
  private _filterFor: Array<RegExp>;

  constructor({ subjects, filterOut = [], filterFor = [] }: ISignalLoggerOptions) {

    this._seen = new WeakSet();

    this._filterOut = filterOut;
    this._filterFor = filterFor;

    for (let subject of subjects) {
      this.findSignals(subject);
    }
  }

  findSignals(subject: ISubject) {

    try {

      subject.paths = [];

      let objects: Array<any> = [];

      objects.push(subject);

      while (objects.length) {

        let parent = objects.pop();

        if (this._seen.has(parent.object)) {
          continue;
        }

        this._seen.add(parent.object);

        //
        let keys = Object.getOwnPropertyNames(parent.object);

        let prototype = Object.getPrototypeOf(parent.object);

        while (prototype !== null && prototype != Object.prototype) {

          keys = keys.concat(Object.getOwnPropertyNames(prototype));

          prototype = Object.getPrototypeOf(prototype);
        }
        //  Get the keys of the object.

        for (let key of keys) {

          try {

            if (key.startsWith("_")) {
              continue;
            }

            let value = parent.object[key];

            if (
              typeof value != "object" ||
              value == null ||
              value === Object.getPrototypeOf(parent.object) ||
              this._seen.has(value) ||
              Array.isArray(value) ||
              value instanceof Element ||
              value instanceof SVGElement
            ) {
              continue;
            }

            let child: ISubject = {
              ...parent,
              ...{
                object: value,
                paths: [...parent.paths, ...[key]]
              }
            }

            if (child.object instanceof Signal && child.paths) {

              let path = child.paths.join(".");

              //
              child.object.connect((emitter: any, args: any) => {

                if (
                  (
                    this._filterOut.length == 0 ||
                    !this._filterOut.some((value: RegExp) => path.match(value))
                  ) &&
                  (
                    this._filterFor.length == 0 ||
                    this._filterFor.some((value: RegExp) => path.match(value))
                  )
                ) {

                  let object = {
                    ...child, ...{
                      path: path,
                      emitter: emitter,
                      args: args
                    }
                  }

                  delete object.object;

                  console.log(path, object);
                }
              });
              // Logging.

              child.object.connect(function fn(this: SignalLogger, emitter: any, object: any) {

                if (object !== null && typeof object == "object" && !this._seen.has(object)) {

                  this.findSignals({
                    ...child, ...{
                      object: object,
                      originPath: path
                    }
                  });
                }

                child.object.disconnect(fn);
              }, this);

              this._seen.add(child.object);
              //  This prevents the Signal from being considered again.
            }
            else {
              objects.push(child);
            }
          }
          catch (e) {
            console.log("for findSignals Error: ", e)
          }
        }
      }
    }
    catch (e) {
      console.log("findSignals Error: ", e);
    }
  }
}

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

    new SignalLogger({
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