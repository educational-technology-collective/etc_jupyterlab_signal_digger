import { Signal } from "@lumino/signaling";

export interface ISubject {
    object: any;
    origin?: string;
    originPath?: string;
    paths?: Array<string>;
}

export interface ISignalDiggerOptions {
    subjects: Array<ISubject>;
    filterOut: Array<RegExp>;
    filterFor: Array<RegExp>;
}


export class SignalDigger {

    private _seen: WeakSet<any>;
    private _filterOut: Array<RegExp>;
    private _filterFor: Array<RegExp>;

    constructor({ subjects, filterOut = [], filterFor = [] }: ISignalDiggerOptions) {

        this.findSignals = this.findSignals.bind(this);

        this._seen = new WeakSet();

        this._filterOut = filterOut;
        this._filterFor = filterFor;

        subjects.forEach((subject: ISubject) => setTimeout(this.findSignals, 0, subject));
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

                            child.object.connect(function fn(this: SignalDigger, emitter: any, object: any) {

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