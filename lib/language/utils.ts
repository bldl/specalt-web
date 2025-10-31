import {
    AndExpression,
    Concern,
    Group,
    Model,
    Negation,
    OrExpression,
    PropositionalExpression,
    Referenceable,
    Statement,
} from "./generated/ast";

export type LogicalExpressionExtractor<T, Ts extends any[] = []> = {
    fromExpression: (expr: PropositionalExpression, ...state: Ts) => T;
    fromOrExpression: (expr: OrExpression, ...state: Ts) => T;
    fromAndExpression: (expr: AndExpression, ...state: Ts) => T;
    fromNegation: (expr: Negation, ...state: Ts) => T;
    fromGroup: (expr: Group, ...state: Ts) => T;
    fromStatement: (expr: Statement, ...state: Ts) => T;
};

export const extractReferenceables: LogicalExpressionExtractor<void, [Set<Referenceable>]> & {
    from: (expr: PropositionalExpression) => Set<Referenceable>;
} = {
    from: (expression: PropositionalExpression) =>
    {
        const output = new Set<Referenceable>();
        extractReferenceables.fromExpression(expression, output);
        return output;
    },
    fromExpression: (expression: PropositionalExpression, output: Set<Referenceable>) =>
    {
        if (expression === undefined)
        {
            return;
        }

        switch (expression.$type)
        {
            case "OrExpression":
                extractReferenceables.fromOrExpression(expression as OrExpression, output);
                break;
            case "AndExpression":
                extractReferenceables.fromAndExpression(expression as AndExpression, output);
                break;
            case "Negation":
                extractReferenceables.fromNegation(expression as Negation, output);
                break;
            case "Group":
                extractReferenceables.fromGroup(expression as Group, output);
                break;
            case "Statement":
                extractReferenceables.fromStatement(expression as Statement, output);
                break;
        }
    },
    fromOrExpression: (expression: OrExpression, output: Set<Referenceable>) =>
    {
        extractReferenceables.fromExpression(expression.left, output);
        extractReferenceables.fromExpression(expression.right, output);
    },
    fromAndExpression: (expression: AndExpression, output: Set<Referenceable>) =>
    {
        extractReferenceables.fromExpression(expression.left, output);
        extractReferenceables.fromExpression(expression.right, output);
    },
    fromNegation: (expression: Negation, output: Set<Referenceable>) =>
    {
        extractReferenceables.fromExpression(expression.inner, output);
    },
    fromGroup: (expression: Group, output: Set<Referenceable>) =>
    {
        extractReferenceables.fromExpression(expression.inner, output);
    },
    fromStatement: (statement: Statement, output: Set<Referenceable>) =>
    {
        const { ref } = statement.reference;

        if (ref === undefined)
        {
            return;
        }

        output.add(ref);
    },
};

export function getAllUsedConcerns(model: Model)
{
    const result = new Set<Concern>();

    for (const proposition of model.propositions)
    {
        for (const clause of proposition.valueClauses)
        {
            // TODO: Can concern be undefined?
            clause.raises.map(x => x.concern?.ref)
                .filter(x => x !== undefined)
                .forEach(item => result.add(item));
        }
    }

    return result;
}

export function getAllUsedReferenceables(model: Model)
{
    const result = new Set<Referenceable>();

    for (const prop of model.propositions)
    {
        for (const clause of prop.valueClauses)
        {
            for (const concern of clause.raises)
            {
                if (!concern.condition)
                {
                    continue;
                }

                extractReferenceables.from(concern.condition.expression).forEach(item => result.add(item));
            }
        }

        if (!prop.disable)
        {
            continue;
        }

        for (const stmt of prop.disable.statements)
        {
            extractReferenceables.from(stmt.condition.expression).forEach(item => result.add(item));
        }
    }

    return result;
}
