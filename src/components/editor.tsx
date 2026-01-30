import * as vscode from "vscode";
import * as monaco from "@codingame/monaco-vscode-editor-api";

import { useEffect, useState } from "react";
import { initMonaco, vscodeConfig } from "../utils/monaco";
import { LanguageClientConfig } from "monaco-languageclient/lcwrapper";
import { MonacoEditorProps, MonacoEditorReactComp } from "@typefox/monaco-editor-react";
import { Loader, Stack } from "@mantine/core";

type Omitted = "vscodeApiConfig" | "languageClientConfig" | "onVscodeApiInitDone" | "onEditorStartDone";

export interface EditorProps extends Omit<MonacoEditorProps, Omitted>
{
    lastDraft: string;
    updateLab: (value: string) => void;
}

const languageConfigPromise = initMonaco();

export function Editor({ updateLab, lastDraft, ...props }: EditorProps)
{
    const [languageConfig, setLanguageConfig] = useState<LanguageClientConfig | undefined>();

    useEffect(() =>
    {
        languageConfigPromise.then(setLanguageConfig);
    }, []);

    if (!languageConfig)
    {
        return (
            <Stack className="editor" align="center" justify="center">
                <Loader />
            </Stack>
        );
    }

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
