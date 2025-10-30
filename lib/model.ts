import { AstNode, EmptyFileSystem, LangiumDocument, LangiumServices, URI } from "langium";

import type { Model } from "../src/language/generated/ast";
import { createJavaScriptPropositionalLaboratoryFormatServices as createJSPLFormatServices } from "../src/language/java-script-propositional-laboratory-format-module.js";

export async function extractDocument(content: string, services: LangiumServices): Promise<LangiumDocument>
{
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(content, URI.file("tmp.jspl"));
    await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
    const validationErrors = (document.diagnostics ?? []).filter(e => e.severity === 1);

    if (validationErrors.length > 0)
    {
        throw validationErrors;
    }

    return document;
}

export async function extractAstNode<T extends AstNode>(fileName: string, services: LangiumServices): Promise<T>
{
    return (await extractDocument(fileName, services)).parseResult?.value as T;
}

export function extractModel(input: string): Promise<Model>
{
    const services = createJSPLFormatServices(EmptyFileSystem).JavaScriptPropositionalLaboratoryFormat;
    return extractAstNode<Model>(input, services);
}
