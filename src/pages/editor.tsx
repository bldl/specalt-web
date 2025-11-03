import * as vscode from "vscode";
import * as monaco from "@codingame/monaco-vscode-editor-api";

import { useState } from "react";
import { Group } from "@mantine/core";
import { MonacoEditorReactComp } from "@typefox/monaco-editor-react";

import { vscodeConfig } from "../utils/monaco";
import { LanguageClientConfig } from "monaco-languageclient/lcwrapper";

import { Lab } from "../components/lab";
import { Laboratory, parseLaboratory } from "../parser";

import exampleCode from "../../examples/in/records_and_tuples.jspl?raw";

export default function({ languageConfig }: { languageConfig: LanguageClientConfig })
{
    const [current, setCurrent] = useState<Laboratory | undefined>();

    return (
        <Group wrap="nowrap" className="main">
            <MonacoEditorReactComp
                vscodeApiConfig={vscodeConfig}
                languageClientConfig={languageConfig}
                className="editor"
                onVscodeApiInitDone={() =>
                {
                    const onChange = async (input: string) => (await parseLaboratory(input)).andTee(setCurrent);
                    onChange(exampleCode);
                    vscode.workspace.onDidChangeTextDocument(async ({ document }) => onChange(document.getText()));
                }}
                onEditorStartDone={app =>
                {
                    app?.getEditor()?.setModel(monaco.editor.createModel(exampleCode, "jspl"));
                }}
            />
            <Lab
                w="50%"
                h="100%"
                laboratory={current}
            />
        </Group>
    );
}
