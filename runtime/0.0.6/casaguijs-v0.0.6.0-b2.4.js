/*!
 * Copyright (c) 2012 - 2021, Anaconda, Inc., and Bokeh Contributors
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 * 
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * 
 * Neither the name of Anaconda nor the names of any contributors
 * may be used to endorse or promote products derived from this software
 * without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
 * THE POSSIBILITY OF SUCH DAMAGE.
 */
(function(root, factory) {
  factory(root["Bokeh"], undefined);
})(this, function(Bokeh, version) {
  let define;
  return (function(modules, entry, aliases, externals) {
    const bokeh = typeof Bokeh !== "undefined" && (version != null ? Bokeh[version] : Bokeh);
    if (bokeh != null) {
      return bokeh.register_plugin(modules, entry, aliases);
    } else {
      throw new Error("Cannot find Bokeh " + version + ". You have to load it prior to loading plugins.");
    }
  })
({
"988b553afa": /* index.js */ function _(require, module, exports, __esModule, __esExport) {
    __esModule();
    const data_pipe_1 = require("989790dae8") /* ./src/bokeh/sources/data_pipe */;
    __esExport("DataPipe", data_pipe_1.DataPipe);
    const image_pipe_1 = require("86e287dc15") /* ./src/bokeh/sources/image_pipe */;
    __esExport("ImagePipe", image_pipe_1.ImagePipe);
    const image_data_source_1 = require("20c0382ad2") /* ./src/bokeh/sources/image_data_source */;
    __esExport("ImageDataSource", image_data_source_1.ImageDataSource);
    const spectra_data_source_1 = require("e5ac72e4af") /* ./src/bokeh/sources/spectra_data_source */;
    __esExport("SpectraDataSource", spectra_data_source_1.SpectraDataSource);
    const base_1 = require("@bokehjs/base");
    (0, base_1.register_models)({ DataPipe: data_pipe_1.DataPipe, ImagePipe: image_pipe_1.ImagePipe, ImageDataSource: image_data_source_1.ImageDataSource, SpectraDataSource: spectra_data_source_1.SpectraDataSource });
},
"989790dae8": /* src/bokeh/sources/data_pipe.js */ function _(require, module, exports, __esModule, __esExport) {
    __esModule();
    const data_source_1 = require("@bokehjs/models/sources/data_source");
    const serialization_1 = require("@bokehjs/core/util/serialization");
    class DataPipe extends data_source_1.DataSource {
        constructor(attrs) {
            super(attrs);
            this.send_queue = {};
            this.pending = {};
            this.incoming_callbacks = {};
            let ws_address = `ws://${this.address[0]}:${this.address[1]}`;
            console.log("datapipe url:", ws_address);
            this.websocket = new WebSocket(ws_address);
            this.websocket.binaryType = "arraybuffer";
            this.websocket.onmessage = (event) => {
                //--- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
                // helper function
                //--- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
                function expand_arrays(obj) {
                    const res = Array.isArray(obj) ? new Array() : {};
                    for (const key in obj) {
                        let value = obj[key];
                        if ((0, serialization_1.is_NDArray_ref)(value)) {
                            const buffers0 = new Map();
                            res[key] = (0, serialization_1.decode_NDArray)(value, buffers0);
                        }
                        else {
                            res[key] = typeof value === 'object' && value !== null ? expand_arrays(value) : value;
                        }
                    }
                    return res;
                }
                //--- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
                if (typeof event.data === 'string' || event.data instanceof String) {
                    let obj = JSON.parse(event.data);
                    let data = expand_arrays(obj);
                    if ('id' in data && 'direction' in data && 'message' in data) {
                        let { id, message, direction } = data;
                        if (direction == 'j2p') {
                            if (id in this.pending) {
                                let { cb } = this.pending[id];
                                delete this.pending[id];
                                if (id in this.send_queue && this.send_queue[id].length > 0) {
                                    // send next message queued by 'id'
                                    let { cb, msg } = this.send_queue[id].shift();
                                    this.pending[id] = { cb };
                                    this.websocket.send(JSON.stringify(msg));
                                }
                                // post message
                                cb(message);
                            }
                            else {
                                console.log("message received but could not find id");
                            }
                        }
                        else {
                            if (id in this.incoming_callbacks) {
                                let result = this.incoming_callbacks[id](message);
                                this.websocket.send(JSON.stringify({ id, direction, message: result, session: object_id(this) }));
                            }
                        }
                    }
                    else {
                        console.log(`datapipe received message without one of 'id', 'message' or 'direction': ${data}`);
                    }
                }
                else {
                    console.log("datapipe received binary data", event.data.byteLength, "bytes");
                }
            };
            let session = object_id(this);
            this.websocket.onopen = () => {
                this.websocket.send(JSON.stringify({ id: 'initialize', direction: 'j2p', session }));
            };
        }
        initialize() {
            super.initialize();
            const execute = () => {
                if (this.init_script != null)
                    this.init_script.execute(this);
            };
            execute();
        }
        register(id, cb) {
            this.incoming_callbacks[id] = cb;
        }
        send(id, message, cb) {
            let msg = { id, message, direction: 'j2p', session: object_id(this) };
            if (id in this.pending) {
                if (id in this.send_queue) {
                    this.send_queue[id].push({ cb, msg });
                }
                else {
                    this.send_queue[id] = [{ cb, msg }];
                }
            }
            else {
                if (id in this.send_queue && this.send_queue[id].length > 0) {
                    this.send_queue[id].push({ cb, msg });
                    { // seemingly cannot reference wider 'cb' and the block-scoped
                        // 'cb' within the same block...
                        // src/bokeh/sources/data_pipe.ts:100:45 - error TS2448: Block-scoped variable 'cb' used before its declaration.
                        let { cb, msg } = this.send_queue[id].shift();
                        this.pending[id] = { cb };
                        this.websocket.send(JSON.stringify(msg));
                    }
                }
                else {
                    this.pending[id] = { cb };
                    this.websocket.send(JSON.stringify(msg));
                }
            }
        }
        static init_DataPipe() {
            this.define(({ Tuple, String, Number, Any }) => ({
                init_script: [Any],
                address: [Tuple(String, Number)],
            }));
        }
    }
    exports.DataPipe = DataPipe;
    DataPipe.__name__ = "DataPipe";
    DataPipe.init_DataPipe();
},
"86e287dc15": /* src/bokeh/sources/image_pipe.js */ function _(require, module, exports, __esModule, __esExport) {
    __esModule();
    const data_source_1 = require("@bokehjs/models/sources/data_source");
    const serialization_1 = require("@bokehjs/core/util/serialization");
    class ImagePipe extends data_source_1.DataSource {
        constructor(attrs) {
            super(attrs);
            this.queue = {};
            this.pending = {};
            this.position = {};
            let ws_address = `ws://${this.address[0]}:${this.address[1]}`;
            console.log("imagepipe url:", ws_address);
            this.websocket = new WebSocket(ws_address);
            this.websocket.binaryType = "arraybuffer";
            this.websocket.onmessage = (event) => {
                //--- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
                // helper function
                //--- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
                function expand_arrays(obj) {
                    const res = Array.isArray(obj) ? new Array() : {};
                    for (const key in obj) {
                        let value = obj[key];
                        if ((0, serialization_1.is_NDArray_ref)(value)) {
                            const buffers0 = new Map();
                            res[key] = (0, serialization_1.decode_NDArray)(value, buffers0);
                        }
                        else {
                            res[key] = typeof value === 'object' && value !== null ? expand_arrays(value) : value;
                        }
                    }
                    return res;
                }
                //--- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
                if (typeof event.data === 'string' || event.data instanceof String) {
                    let obj = JSON.parse(event.data);
                    let data = expand_arrays(obj);
                    if ('id' in data && 'message' in data) {
                        // 'message' here is generated in python and
                        // contains the requested slice of the image
                        let { id, message } = data;
                        let { cb, index } = this.pending[id];
                        delete this.pending[id];
                        if (id in this.queue) {
                            // send next message queued by 'id'
                            let { cb, message, index } = this.queue[id];
                            delete this.queue[id];
                            this.pending[id] = { cb, index };
                            this.websocket.send(JSON.stringify(message));
                        }
                        // post message
                        this.position[id] = { index };
                        cb(message);
                    }
                    else {
                        console.log(`imagepipe received data without 'id' and/or 'message' field: ${data}`);
                    }
                }
                else {
                    console.log("imagepipe received binary data", event.data.byteLength, "bytes");
                }
            };
            let session = object_id(this);
            this.websocket.onopen = () => {
                this.websocket.send(JSON.stringify({ action: 'initialize', session }));
            };
        }
        initialize() {
            super.initialize();
            const execute = () => {
                if (this.init_script != null)
                    this.init_script.execute(this);
            };
            execute();
        }
        // fetch channel
        //    index: [ stokes index, spectral plane ]
        // RETURNED MESSAGE SHOULD HAVE { id: string, message: any }
        channel(index, cb, id) {
            let message = { action: 'channel', index, id, session: object_id(this) };
            if (id in this.pending) {
                this.queue[id] = { cb, message, index };
            }
            else {
                this.websocket.send(JSON.stringify(message));
                this.pending[id] = { cb, index };
            }
        }
        // fetch spectra
        //    index: [ RA index, DEC index, stokes index ]
        // RETURNED MESSAGE SHOULD HAVE { id: string, message: any }
        spectra(index, cb, id) {
            let message = { action: 'spectra', index, id, session: object_id(this) };
            if (id in this.pending) {
                this.queue[id] = { cb, message, index };
            }
            else {
                this.websocket.send(JSON.stringify(message));
                this.pending[id] = { cb, index };
            }
        }
        refresh(cb, id, default_index = []) {
            let { index } = id in this.position ? this.position[id] : { index: default_index };
            if (index.length === 2) {
                // refreshing channel
                let message = { action: 'channel', index, id, session: object_id(this) };
                if (id in this.pending) {
                    this.queue[id] = { cb, message, index };
                }
                else {
                    this.websocket.send(JSON.stringify(message));
                    this.pending[id] = { cb, index };
                }
            }
            else if (index.length === 3) {
                // refreshing spectra
                let message = { action: 'spectra', index, id, session: object_id(this) };
                if (id in this.pending) {
                    this.queue[id] = { cb, message, index };
                }
                else {
                    this.websocket.send(JSON.stringify(message));
                    this.pending[id] = { cb, index };
                }
            }
        }
        static init_ImagePipe() {
            this.define(({ Tuple, String, Number, Any }) => ({
                init_script: [Any],
                address: [Tuple(String, Number)],
                shape: [Tuple(Number, Number, Number, Number)]
            }));
        }
    }
    exports.ImagePipe = ImagePipe;
    ImagePipe.__name__ = "ImagePipe";
    ImagePipe.init_ImagePipe();
},
"20c0382ad2": /* src/bokeh/sources/image_data_source.js */ function _(require, module, exports, __esModule, __esExport) {
    __esModule();
    const column_data_source_1 = require("@bokehjs/models/sources/column_data_source");
    const string_1 = require("@bokehjs/core/util/string");
    const image_pipe_1 = require("86e287dc15") /* ./image_pipe */;
    class ImageDataSource extends column_data_source_1.ColumnDataSource {
        constructor(attrs) {
            super(attrs);
            this.imid = (0, string_1.uuid4)();
        }
        initialize() {
            super.initialize();
            const execute = () => {
                if (this.init_script != null)
                    this.init_script.execute(this);
            };
            execute();
        }
        channel(c, s = 0, cb) {
            this.image_source.channel([s, c], (data) => {
                this.cur_chan = [s, c];
                if (cb) {
                    cb(data);
                }
                this.data = data.chan;
            }, this.imid);
        }
        refresh(cb) {
            // supply default index value because the ImagePipe will have no cached
            // index values for this.imid if there have been no updates yet...
            this.image_source.refresh((data) => {
                if (cb) {
                    cb(data);
                }
                this.data = data.chan;
            }, this.imid, [0, 0]);
        }
        static init_ImageDataSource() {
            this.define(({ Tuple, Number, Ref, Any }) => ({
                init_script: [Any],
                image_source: [Ref(image_pipe_1.ImagePipe)],
                num_chans: [Tuple(Number, Number)],
                cur_chan: [Tuple(Number, Number)],
            }));
        }
    }
    exports.ImageDataSource = ImageDataSource;
    ImageDataSource.__name__ = "ImageDataSource";
    ImageDataSource.init_ImageDataSource();
},
"e5ac72e4af": /* src/bokeh/sources/spectra_data_source.js */ function _(require, module, exports, __esModule, __esExport) {
    __esModule();
    const column_data_source_1 = require("@bokehjs/models/sources/column_data_source");
    const string_1 = require("@bokehjs/core/util/string");
    const image_pipe_1 = require("86e287dc15") /* ./image_pipe */;
    class SpectraDataSource extends column_data_source_1.ColumnDataSource {
        constructor(attrs) {
            super(attrs);
            this.imid = (0, string_1.uuid4)();
            console.log('spectra data source id:', this.imid);
        }
        initialize() {
            super.initialize();
        }
        spectra(r, d, s = 0) {
            this.image_source.spectra([r, d, s], (data) => this.data = data.spectrum, this.imid);
        }
        refresh() {
            // supply default index value because the ImagePipe will have no cached
            // index values for this.imid if there have been no updates yet...
            this.image_source.refresh((data) => this.data = data.spectrum, this.imid, [0, 0, 0]);
        }
        static init_SpectraDataSource() {
            this.define(({ Ref }) => ({
                image_source: [Ref(image_pipe_1.ImagePipe)],
            }));
        }
    }
    exports.SpectraDataSource = SpectraDataSource;
    SpectraDataSource.__name__ = "SpectraDataSource";
    SpectraDataSource.init_SpectraDataSource();
},
}, "988b553afa", {"index":"988b553afa","src/bokeh/sources/data_pipe":"989790dae8","src/bokeh/sources/image_pipe":"86e287dc15","src/bokeh/sources/image_data_source":"20c0382ad2","src/bokeh/sources/spectra_data_source":"e5ac72e4af"}, {});});
//# sourceMappingURL=casaguijs.js.map
