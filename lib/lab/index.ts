import { Concern, Model } from "../language/generated/ast";

import { AstNode, buildAst } from "./ast";
import { extractModel } from "../model";

export type Value = string | boolean;

export interface Given
{
    value: Value;
    expression: string;
}

export interface Condition
{
    name: string;
    value: AstNode;
}

export interface TweakableConcern
{
    value: Value;
    raises: { name?: string; expression?: AstNode }[];
}

export interface Tweakable
{
    name: string;
    expression: string;
    output: Value[];
    default: Value;
    concerns: TweakableConcern[];
}

export interface Laboratory
{
    title?: string;
    description?: string;

    version?: string;
    authors?: string[];

    givens: Given[];
    concerns: Concern[];

    conditions: Condition[];
    tweakables: Tweakable[];
}

// TODO: Cleanup
export function createLab({ laboratory, concerns, propositions, conditions }: Model): Laboratory
{
    return {
        title: laboratory?.titles[0] ?? "Unknown",
        authors: laboratory?.authors,
        description: laboratory?.descriptions[0].contents ?? "Unknown",
        version: laboratory?.versions[0] ?? "v1",
        concerns,
        givens: propositions.filter(x => x.valueClauses.length === 1).map(x =>
        {
            const val = x.valueClauses[0];
            return { expression: x.expression, value: `${val}` };
        }),
        tweakables: propositions.filter(x => x.valueClauses.length !== 1).map(x =>
        {
            return {
                name: x.name,
                expression: x.expression,
                output: x.valueClauses.map(i => i.value),
                default: x.valueClauses.find(y => y.default)!.value,
                concerns: x.valueClauses.map(i => ({
                    value: i.value,
                    raises: i.raises.map(r => ({
                        name: r.concern.ref?.name,
                        expression: r.condition?.expression
                            ? buildAst.fromExpression(r.condition.expression)
                            : undefined,
                    })),
                })),
            };
        }),
        conditions: conditions.map(cond => ({
            name: cond.name,
            value: buildAst.fromExpression(cond.condition.expression),
        })),
    };
}

export async function parseLab(input: string)
{
    const model = await extractModel(input);

    if (model.isErr())
    {
        throw model.error;
    }

    return createLab(model.value);
}
