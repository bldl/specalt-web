import * as vscode from "vscode";
import * as monaco from "@codingame/monaco-vscode-editor-api";

import { initMonaco, vscodeConfig } from "../utils/monaco";
import { MonacoEditorProps, MonacoEditorReactComp } from "@typefox/monaco-editor-react";

type Omitted = "vscodeApiConfig" | "languageClientConfig" | "onVscodeApiInitDone" | "onEditorStartDone";

export interface EditorProps extends Omit<MonacoEditorProps, Omitted>
{
    lastDraft: string;
    updateLab: (value: string) => void;
}

const languageConfig = await initMonaco();

export function Editor({ updateLab, lastDraft, ...props }: EditorProps)
{
    return (
        <MonacoEditorReactComp
            {...props}
            vscodeApiConfig={vscodeConfig}
            languageClientConfig={languageConfig}
            className="editor"
            onVscodeApiInitDone={() =>
                vscode.workspace.onDidChangeTextDocument(
                    ({ document }) => updateLab(document.getText()),
                )}
            onEditorStartDone={app =>
                app?.getEditor()?.setModel(
                    monaco.editor.createModel(lastDraft, "specalt"),
                )}
        />
    );
}
