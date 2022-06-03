/**
 * Store the kernel and interpreter instances.
 */
// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let kernel: any;
// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let interpreter: any;
// eslint-disable-next-line
// @ts-ignore: breaks typedoc

let pyodide: any;

// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let stdout_stream: any;
// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let stderr_stream: any;
// eslint-disable-next-line
// @ts-ignore: breaks typedoc
let resolveInputReply: any;

// TODO Import this locally
declare let Comlink: any;
importScripts('https://unpkg.com/comlink/dist/umd/comlink.js');

enum Mode {
  file = 32768,
  dir = 16384
}

// Types and implementation inspired from
// https://github.com/jvilk/BrowserFS
// https://github.com/jvilk/BrowserFS/blob/a96aa2d417995dac7d376987839bc4e95e218e06/src/generic/emscripten_fs.ts
interface Stats {
  dev: number;
  ino: number;
  mode: number;
  nlink: number;
  uid: number;
  gid: number;
  rdev: number;
  size: number;
  blksize: number;
  blocks: number;
  atime: Date;
  mtime: Date;
  ctime: Date;
  timestamp?: number;
}

interface EmscriptenFSNode {
  name: string;
  mode: number;
  parent: EmscriptenFSNode | null;
  mount: {opts: {root: string}};
  stream_ops: EmscriptenStreamOps;
  node_ops: EmscriptenNodeOps;
}

interface EmscriptenStream {
  node: EmscriptenFSNode;
  nfd: any;
  flags: string;
  position: number;
}

interface EmscriptenNodeOps {
  getattr(node: EmscriptenFSNode): Stats;
  setattr(node: EmscriptenFSNode, attr: Stats): void;
  lookup(parent: EmscriptenFSNode, name: string): EmscriptenFSNode;
  mknod(parent: EmscriptenFSNode, name: string, mode: number, dev: any): EmscriptenFSNode;
  rename(oldNode: EmscriptenFSNode, newDir: EmscriptenFSNode, newName: string): void;
  unlink(parent: EmscriptenFSNode, name: string): void;
  rmdir(parent: EmscriptenFSNode, name: string): void;
  readdir(node: EmscriptenFSNode): string[];
  symlink(parent: EmscriptenFSNode, newName: string, oldPath: string): void;
  readlink(node: EmscriptenFSNode): string;
}

interface EmscriptenStreamOps {
  open(stream: EmscriptenStream): void;
  close(stream: EmscriptenStream): void;
  read(stream: EmscriptenStream, buffer: Uint8Array, offset: number, length: number, position: number): number;
  write(stream: EmscriptenStream, buffer: Uint8Array, offset: number, length: number, position: number): number;
  llseek(stream: EmscriptenStream, offset: number, whence: number): number;
}


class DriveFSEmscriptenStreamOps implements EmscriptenStreamOps {

  private fs: DriveFS;

  constructor(fs: DriveFS) {
    console.log('DriveFSEmscriptenStreamOps -- ctor');
    this.fs = fs;
    this.fs;
  }

  public open(stream: EmscriptenStream): void {
    console.log('DriveFSEmscriptenStreamOps -- open', stream);
  }

  public close(stream: EmscriptenStream): void {
    console.log('DriveFSEmscriptenStreamOps -- close', stream);
  }

  public read(stream: EmscriptenStream, buffer: Uint8Array, offset: number, length: number, position: number): number {
    console.log('DriveFSEmscriptenStreamOps -- read', stream, buffer, offset, length, position);
    return 0;
  }

  public write(stream: EmscriptenStream, buffer: Uint8Array, offset: number, length: number, position: number): number {
    console.log('DriveFSEmscriptenStreamOps -- write', stream, buffer, offset, length, position);
    return 0;
  }

  public llseek(stream: EmscriptenStream, offset: number, whence: number): number {
    console.log('DriveFSEmscriptenStreamOps -- llseek', stream, offset, whence);
    return 0;
  }
}


class DriveFSEmscriptenNodeOps implements EmscriptenNodeOps {

  private fs: DriveFS;

  constructor(fs: DriveFS) {
    console.log('DriveFSEmscriptenNodeOps -- ctor');
    this.fs = fs;
  }

  public getattr(node: EmscriptenFSNode): Stats {
    console.log('DriveFSEmscriptenNodeOps -- getattr', node);
    return {
      dev: 0,
      ino: 0,
      mode: 0,
      nlink: 0,
      uid: 0,
      gid: 0,
      rdev: 0,
      size: 0,
      blksize: 0,
      blocks: 0,
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      timestamp: 0
    };
  }

  public setattr(node: EmscriptenFSNode, attr: Stats): void {
    console.log('DriveFSEmscriptenNodeOps -- setattr', node, attr);
  }

  public lookup(parent: EmscriptenFSNode, name: string): EmscriptenFSNode {
    console.log('DriveFSEmscriptenNodeOps -- lookup', parent, name);
    return {
      name: '',
      mode: Mode.dir,
      parent: null,
      mount: {opts: {root: '/'}},
      stream_ops: new DriveFSEmscriptenStreamOps(this.fs),
      node_ops: new DriveFSEmscriptenNodeOps(this.fs)
    }
  }

  public mknod(parent: EmscriptenFSNode, name: string, mode: number, dev: any): EmscriptenFSNode {
    console.log('DriveFSEmscriptenNodeOps -- mknod', parent, name, mode, dev);
    return {
      name: '',
      mode,
      parent: null,
      mount: {opts: {root: '/'}},
      stream_ops: new DriveFSEmscriptenStreamOps(this.fs),
      node_ops: new DriveFSEmscriptenNodeOps(this.fs)
    }
  }

  public rename(oldNode: EmscriptenFSNode, newDir: EmscriptenFSNode, newName: string): void {
    console.log('DriveFSEmscriptenNodeOps -- rename', oldNode, newDir, newName);
  }

  public unlink(parent: EmscriptenFSNode, name: string): void {
    console.log('DriveFSEmscriptenNodeOps -- unlink', parent, name);
  }

  public rmdir(parent: EmscriptenFSNode, name: string) {
    console.log('DriveFSEmscriptenNodeOps -- rmdir', parent, name);
  }

  public readdir(node: EmscriptenFSNode): string[] {
    console.log('DriveFSEmscriptenNodeOps -- readdir', node);
    return [];
  }

  public symlink(parent: EmscriptenFSNode, newName: string, oldPath: string): void {
    console.log('DriveFSEmscriptenNodeOps -- symlink', parent, newName, oldPath);
  }

  public readlink(node: EmscriptenFSNode): string {
    console.log('DriveFSEmscriptenNodeOps -- readlink', node);
    return '';
  }
}

class DriveFS {

  private FS: any;

  constructor(fs: any) {
    this.FS = fs;

    this.node_ops = new DriveFSEmscriptenNodeOps(this);
    this.stream_ops = new DriveFSEmscriptenStreamOps(this);
  }

  node_ops: EmscriptenNodeOps;
  stream_ops: EmscriptenStreamOps;

  mount(mount: any): EmscriptenFSNode {
    console.log("DriveFS -- mount", mount);
    return this.createNode(null, mount.mountpoint, Mode.dir | 511, 0);
  };

  createNode(parent: EmscriptenFSNode | null, name: string, mode: number, dev?: any): EmscriptenFSNode {
    const FS = this.FS;
    const node = FS.createNode(parent, name, mode, dev);
    node.node_ops = this.node_ops;
    node.stream_ops = this.stream_ops;
    return node;
  };

  getMode(path: string): number {
    console.log("DriveFS -- getMode", path);
    return Mode.dir;
  };

  realPath(node: EmscriptenFSNode): string {
    console.log("DriveFS -- realPath", node)
    return "";
  };
}

function get(path: string) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', `${baseURL}api/drive${path}`, false);
  try {
    xhr.send();
  } catch(e) {
    console.error(e);
  }
  return xhr.responseText;
}

// const dir = get("/dir");
// console.log('WORKER RECEIVED BACK DIR --- ', dir);

/**
 * Load pyodide and initialize the interpreter.
 *
 * The first package loaded, `piplite`, is a build-time configurable wrapper
 * around `micropip` that supports multiple warehouse API endpoints, as well
 * as a multipackage summary JSON format in `all.json`.
 */
async function loadPyodideAndPackages() {
  // as of 0.17.0 indexURL must be provided
  pyodide = await loadPyodide({ indexURL });

  // this is the only use of `loadPackage`, allow `piplite` to handle the rest
  await pyodide.loadPackage(['micropip']);

  // get piplite early enough to impact pyolite dependencies
  await pyodide.runPythonAsync(`
    import micropip
    await micropip.install('${_pipliteWheelUrl}', keep_going=True)
    import piplite.piplite
    piplite.piplite._PIPLITE_DISABLE_PYPI = ${_disablePyPIFallback ? 'True' : 'False'}
    piplite.piplite._PIPLITE_URLS = ${JSON.stringify(_pipliteUrls)}
  `);

  // from this point forward, only use piplite
  await pyodide.runPythonAsync(`
    await piplite.install([
      'matplotlib',
      'ipykernel',
    ], keep_going=True)
    await piplite.install([
      'pyolite',
    ], keep_going=True);
    await piplite.install([
      'ipython',
    ], keep_going=True);
    import pyolite
  `);

  // make copies of these so they don't get garbage collected
  kernel = pyodide.globals.get('pyolite').kernel_instance.copy();
  stdout_stream = pyodide.globals.get('pyolite').stdout_stream.copy();
  stderr_stream = pyodide.globals.get('pyolite').stderr_stream.copy();
  interpreter = kernel.interpreter.copy();
  interpreter.send_comm = sendComm;

  // Setup custom FileSystem
  const driveFS = new DriveFS(pyodide.FS);
  console.log('Worker -- mkdir drive');
  pyodide.FS.mkdir('/drive');
  console.log('Worker -- mount driveFS');
  pyodide.FS.mount(driveFS, {}, '/drive');
  console.log('Worker -- chdir');
  pyodide.FS.chdir('/drive');
}

/**
 * Recursively convert a Map to a JavaScript object
 * @param The Map object to convert
 */
function mapToObject(obj: any) {
  const out: any = obj instanceof Array ? [] : {};
  obj.forEach((value: any, key: string) => {
    out[key] =
      value instanceof Map || value instanceof Array ? mapToObject(value) : value;
  });
  return out;
}

/**
 * Format the response from the Pyodide evaluation.
 *
 * @param res The result object from the Pyodide evaluation
 */
function formatResult(res: any): any {
  if (!pyodide.isPyProxy(res)) {
    return res;
  }
  // TODO: this is a bit brittle
  const m = res.toJs();
  const results = mapToObject(m);
  return results;
}

// eslint-disable-next-line
// @ts-ignore: breaks typedoc
const pyodideReadyPromise = loadPyodideAndPackages();

/**
 * Send a comm message to the front-end.
 *
 * @param type The type of the comm message.
 * @param content The content.
 * @param metadata The metadata.
 * @param ident The ident.
 * @param buffers The binary buffers.
 */
async function sendComm(
  type: string,
  content: any,
  metadata: any,
  ident: any,
  buffers: any
) {
  postMessage({
    type: type,
    content: formatResult(content),
    metadata: formatResult(metadata),
    ident: formatResult(ident),
    buffers: formatResult(buffers),
    parentHeader: formatResult(kernel._parent_header)['header'],
  });
}

async function getpass(prompt: string) {
  prompt = typeof prompt === 'undefined' ? '' : prompt;
  await sendInputRequest(prompt, true);
  const replyPromise = new Promise((resolve) => {
    resolveInputReply = resolve;
  });
  const result: any = await replyPromise;
  return result['value'];
}

async function input(prompt: string) {
  prompt = typeof prompt === 'undefined' ? '' : prompt;
  await sendInputRequest(prompt, false);
  const replyPromise = new Promise((resolve) => {
    resolveInputReply = resolve;
  });
  const result: any = await replyPromise;
  return result['value'];
}

/**
 * Send a input request to the front-end.
 *
 * @param prompt the text to show at the prompt
 * @param password Is the request for a password?
 */
async function sendInputRequest(prompt: string, password: boolean) {
  const content = {
    prompt,
    password,
  };
  postMessage({
    type: 'input_request',
    parentHeader: formatResult(kernel._parent_header)['header'],
    content,
  });
}

const workerKernel = {
  async setup(parent: any) {
    // Make sure pyodide is ready before continuing
    await pyodideReadyPromise;

    kernel._parent_header = pyodide.toPy(parent);
  },

  /**
   * Execute code with the interpreter.
   *
   * @param content The incoming message with the code to execute.
   */
  async execute(content: any, parent: any) {
    await this.setup(parent);

    const publishExecutionResult = (
      prompt_count: any,
      data: any,
      metadata: any
    ): void => {
      const bundle = {
        execution_count: prompt_count,
        data: formatResult(data),
        metadata: formatResult(metadata),
      };
      postMessage({
        parentHeader: formatResult(kernel._parent_header)['header'],
        bundle,
        type: 'execute_result',
      });
    };

    const publishExecutionError = (ename: any, evalue: any, traceback: any): void => {
      const bundle = {
        ename: ename,
        evalue: evalue,
        traceback: traceback,
      };
      postMessage({
        parentHeader: formatResult(kernel._parent_header)['header'],
        bundle,
        type: 'execute_error',
      });
    };

    const clearOutputCallback = (wait: boolean): void => {
      const bundle = {
        wait: formatResult(wait),
      };
      postMessage({
        parentHeader: formatResult(kernel._parent_header)['header'],
        bundle,
        type: 'clear_output',
      });
    };

    const displayDataCallback = (data: any, metadata: any, transient: any): void => {
      const bundle = {
        data: formatResult(data),
        metadata: formatResult(metadata),
        transient: formatResult(transient),
      };
      postMessage({
        parentHeader: formatResult(kernel._parent_header)['header'],
        bundle,
        type: 'display_data',
      });
    };

    const updateDisplayDataCallback = (
      data: any,
      metadata: any,
      transient: any
    ): void => {
      const bundle = {
        data: formatResult(data),
        metadata: formatResult(metadata),
        transient: formatResult(transient),
      };
      postMessage({
        parentHeader: formatResult(kernel._parent_header)['header'],
        bundle,
        type: 'update_display_data',
      });
    };

    const publishStreamCallback = (name: any, text: any): void => {
      const bundle = {
        name: formatResult(name),
        text: formatResult(text),
      };
      postMessage({
        parentHeader: formatResult(kernel._parent_header)['header'],
        bundle,
        type: 'stream',
      });
    };

    stdout_stream.publish_stream_callback = publishStreamCallback;
    stderr_stream.publish_stream_callback = publishStreamCallback;
    interpreter.display_pub.clear_output_callback = clearOutputCallback;
    interpreter.display_pub.display_data_callback = displayDataCallback;
    interpreter.display_pub.update_display_data_callback = updateDisplayDataCallback;
    interpreter.displayhook.publish_execution_result = publishExecutionResult;
    interpreter.input = input;
    interpreter.getpass = getpass;

    const res = await kernel.run(content.code);
    const results = formatResult(res);

    if (results['status'] === 'error') {
      publishExecutionError(results['ename'], results['evalue'], results['traceback']);
    }

    return results;
  },

  /**
   * Complete the code submitted by a user.
   *
   * @param content The incoming message with the code to complete.
   */
  async complete(content: any, parent: any) {
    await this.setup(parent);

    const res = kernel.complete(content.code, content.cursor_pos);
    const results = formatResult(res);
    return results;
  },

  /**
   * Inspect the code submitted by a user.
   *
   * @param content The incoming message with the code to inspect.
   */
  async inspect(
    content: { code: string; cursor_pos: number; detail_level: 0 | 1 },
    parent: any
  ) {
    await this.setup(parent);

    const res = kernel.inspect(content.code, content.cursor_pos, content.detail_level);
    const results = formatResult(res);
    return results;
  },

  /**
   * Check code for completeness submitted by a user.
   *
   * @param content The incoming message with the code to check.
   */
  async isComplete(content: { code: string }, parent: any) {
    await this.setup(parent);

    const res = kernel.is_complete(content.code);
    const results = formatResult(res);
    return results;
  },

  /**
   * Respond to the commInfoRequest.
   *
   * @param content The incoming message with the comm target name.
   */
  async commInfo(content: any, parent: any) {
    await this.setup(parent);

    const res = kernel.comm_info(content.target_name);
    const results = formatResult(res);

    return {
      comms: results,
      status: 'ok',
    };
  },

  /**
   * Respond to the commOpen.
   *
   * @param content The incoming message with the comm open.
   */
  async commOpen(content: any, parent: any) {
    await this.setup(parent);

    const res = kernel.comm_manager.comm_open(pyodide.toPy(content));
    const results = formatResult(res);

    return results;
  },

  /**
   * Respond to the commMsg.
   *
   * @param content The incoming message with the comm msg.
   */
  async commMsg(content: any, parent: any) {
    await this.setup(parent);

    const res = kernel.comm_manager.comm_msg(pyodide.toPy(content));
    const results = formatResult(res);

    return results;
  },

  /**
   * Respond to the commClose.
   *
   * @param content The incoming message with the comm close.
   */
  async commClose(content: any, parent: any) {
    await this.setup(parent);

    const res = kernel.comm_manager.comm_close(pyodide.toPy(content));
    const results = formatResult(res);

    return results;
  },

  /**
   * Resolve the input request by getting back the reply from the main thread
   *
   * @param content The incoming message with the reply
   */
  async inputReply(content: any, parent: any) {
    await this.setup(parent);

    resolveInputReply(content);
  },
};

Comlink.expose(workerKernel);
