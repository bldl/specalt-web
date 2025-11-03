/// <reference lib="WebWorker" />

import { EmptyFileSystem } from "langium";
import { type DefaultSharedModuleContext, startLanguageServer } from "langium";
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from "vscode-languageserver/browser.js";

import { createJSPLFormatServices } from "../../lib/language/jspl-format-module";

const messageReader = new BrowserMessageReader(self as DedicatedWorkerGlobalScope);
const messageWriter = new BrowserMessageWriter(self as DedicatedWorkerGlobalScope);

const context = {
    connection: createConnection(messageReader, messageWriter),
    ...EmptyFileSystem,
} as unknown as DefaultSharedModuleContext;

const { shared } = createJSPLFormatServices(context);

startLanguageServer(shared);
