import { AstNode, EmptyFileSystem, LangiumDocument, LangiumServices, URI } from "langium";

import { type Model } from "./language/generated/ast";
import { createJSPLFormatServices } from "./language/jspl-format-module";

import { Res } from "./utils";
import { err, ok } from "neverthrow";

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
    const services = createJSPLFormatServices(EmptyFileSystem).JSPLFormat;
    return extractAstNode<Model>(input, services);
}
