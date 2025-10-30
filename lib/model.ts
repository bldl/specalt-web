import { Diagnostic } from "vscode-languageserver";
import { AstNode, EmptyFileSystem, LangiumDocument, LangiumServices, URI } from "langium";

import type { Model } from "../src/language/generated/ast";
import { createJavaScriptPropositionalLaboratoryFormatServices as createJSPLFormatServices } from "../src/language/java-script-propositional-laboratory-format-module";

import { err, ok, Result } from "neverthrow";

type Res<T> = Result<T, Diagnostic[]>;

export async function extractDocument(
    content: string,
    services: LangiumServices,
): Promise<Res<LangiumDocument<AstNode>>>
{
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(content, URI.file("tmp.jspl"));
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);

    if (validationErrors.length > 0)
    {
        return err(validationErrors);
    }

    return ok(document);
}

export async function extractAstNode<T extends AstNode>(fileName: string, services: LangiumServices): Promise<Res<T>>
{
    return (await extractDocument(fileName, services)).andThen(doc => ok(doc.parseResult?.value as T));
}

export function extractModel(input: string): Promise<Res<Model>>
{
    const services = createJSPLFormatServices(EmptyFileSystem).JavaScriptPropositionalLaboratoryFormat;
    return extractAstNode<Model>(input, services);
}
