import type { ValidationAcceptor, ValidationChecks } from "langium";
import type { JSPLFormatServices } from "./jspl-format-module";

import {
    AndExpression,
    Concern,
    Condition,
    Group,
    type JSPLAstType,
    LaboratoryInformation,
    Model,
    Negation,
    OrExpression,
    Proposition,
    PropositionalExpression,
    Referenceable,
    Statement,
} from "./generated/ast";

const extractReferenceables = {
    from: function(expression: PropositionalExpression)
    {
        const output = new Set<Referenceable>();
        extractReferenceables.fromExpression(expression, output);
        return output;
    },
    fromExpression: function(expression: PropositionalExpression, output: Set<Referenceable>)
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
    fromOrExpression: function(expression: OrExpression, output: Set<Referenceable>)
    {
        extractReferenceables.fromExpression(expression.left, output);
        extractReferenceables.fromExpression(expression.right, output);
    },
    fromAndExpression: function(expression: AndExpression, output: Set<Referenceable>)
    {
        extractReferenceables.fromExpression(expression.left, output);
        extractReferenceables.fromExpression(expression.right, output);
    },
    fromNegation: function(expression: Negation, output: Set<Referenceable>)
    {
        extractReferenceables.fromExpression(expression.inner, output);
    },
    fromGroup: function(expression: Group, output: Set<Referenceable>)
    {
        extractReferenceables.fromExpression(expression.inner, output);
    },
    fromStatement: function(statement: Statement, output: Set<Referenceable>)
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
                .forEach(result.add);
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

                extractReferenceables.from(concern.condition.expression).forEach(result.add);
            }
        }

        if (!prop.disable)
        {
            continue;
        }

        for (const stmt of prop.disable.statements)
        {
            extractReferenceables.from(stmt.condition.expression).forEach(result.add);
        }
    }

    return result;
}

/**
 * Register custom validation checks.
 */
export function registerValidationChecks({ validation }: JSPLFormatServices)
{
    const { ValidationRegistry: registry, JSPLFormatValidator: validator } = validation;

    const checks: ValidationChecks<JSPLAstType> = {
        Model: [
            validator.uniqueConcernIdentifiers,
            validator.uniqueReferenceableIdentifiers,
            validator.checkForUnusedConcerns,
            validator.checkForUnusedConditions,
        ],
        Proposition: [
            validator.propositionHasExactlyOneDefaultOrJustOneValue,
        ],
        Condition: [
            validator.noRecursionInConditions,
        ],
        LaboratoryInformation: [
            validator.noDuplicateFieldsInLaboratoryInformation,
        ],
        Statement: [
            validator.statementReferencesValidValue,
        ],
    };

    registry.register(checks, validator);
}

export class JSPLFormatValidator
{
    uniqueConcernIdentifiers(model: Model, accept: ValidationAcceptor)
    {
        const reported = new Set<string>();

        for (const concern of model.concerns)
        {
            if (!reported.has(concern.name))
            {
                reported.add(concern.name);
                continue;
            }

            accept("error", `Concern has non-unique name '${concern.name}'.`, { node: concern, property: "name" });
        }
    }

    uniqueReferenceableIdentifiers(model: Model, accept: ValidationAcceptor)
    {
        const reported = new Map<string, Condition | Proposition>();

        // TODO: Remove Code-Duplication here

        for (const cond of model.conditions)
        {
            if (!reported.has(cond.name))
            {
                reported.set(cond.name, cond);
                continue;
            }

            const nodes = [cond, reported.get(cond.name)!];

            nodes.forEach(node =>
                accept(
                    "error",
                    `Condition has non-unique name '${node.name}'. All names of Propositions and Conditions must be unique, to be properly referenced.`,
                    { node, property: "name" },
                )
            );
        }

        for (const prop of model.propositions)
        {
            if (!reported.has(prop.name))
            {
                reported.set(prop.name, prop);
                continue;
            }

            const nodes = [prop, reported.get(prop.name)!];

            nodes.forEach(node =>
                accept(
                    "error",
                    `Proposition has non-unique name '${node.name}'. All names of Propositions and Conditions must be unique, to be properly referenced.`,
                    { node, property: "name" },
                )
            );
        }
    }

    checkForUnusedConcerns(model: Model, accept: ValidationAcceptor)
    {
        const used = getAllUsedConcerns(model);
        const unused = model.concerns.filter(con => !used.has(con));

        for (const node of unused)
        {
            accept("warning", "Concern is defined, but never used.", { node, property: "name" });
        }
    }

    checkForUnusedConditions(model: Model, accept: ValidationAcceptor)
    {
        const used = getAllUsedReferenceables(model);
        const unused = model.conditions.filter(cond => !used.has(cond));

        for (const node of unused)
        {
            accept("warning", "Condition is defined, but never used.", { node, property: "name" });
        }
    }

    propositionHasExactlyOneDefaultOrJustOneValue(proposition: Proposition, accept: ValidationAcceptor)
    {
        const { name, valueClauses } = proposition;

        // Singleton is default implicitly
        if (valueClauses.length == 1 && !valueClauses[0].default)
        {
            return accept(
                "info",
                `${valueClauses[0].value} of proposition ${name} is assumed to be default`,
                { node: valueClauses[0], property: "default" },
            );
        }

        const defaults = valueClauses.filter(clause => clause.default);

        if (defaults.length > 1)
        {
            return accept("error", `Proposition has multiple default values.`, {
                node: defaults[1],
                property: "default",
            });
        }

        if (defaults.length !== 1)
        {
            return;
        }

        accept("error", `Proposition has no default value.`, { node: proposition, property: "name" });
    }

    noRecursionInConditions(node: Condition, accept: ValidationAcceptor)
    {
        const { name, condition } = node;

        const extracted = extractReferenceables.from(condition.expression);
        const hasRecursion = [...extracted].some(ref => ref.name === name);

        if (!hasRecursion)
        {
            return;
        }

        accept("error", `Recursion is not allowed here.`, { node, property: "name" });
    }

    // TODO: What's the use case of this? Why not make it impossible on grammar level?
    noDuplicateFieldsInLaboratoryInformation(information: LaboratoryInformation, accept: ValidationAcceptor)
    {
        if (information.descriptions.length > 1)
        {
            accept("error", "Multiple descriptions for one laboratory are not allowed.", { node: information });
        }
        if (information.titles.length > 1)
        {
            accept("error", "Multiple titles for one laboratory are not allowed.", { node: information });
        }
        if (information.icons.length > 1)
        {
            accept("error", "Multiple icons for one laboratory are not allowed.", { node: information });
        }
        if (information.formats.length > 1)
        {
            accept("error", "Multiple default formats for one laboratory are not allowed.", { node: information });
        }
        if (information.authors.length > 1)
        {
            accept("error", "Multiple authors for one laboratory are not allowed.", { node: information });
        }
        if (information.versions.length > 1)
        {
            accept("error", "Multiple versions for one laboratory are not allowed.", { node: information });
        }
    }

    // TODO: Cleanup
    statementReferencesValidValue(statement: Statement, accept: ValidationAcceptor): void
    {
        if (statement === undefined) return;
        if (statement.value === undefined) return;
        if (statement.reference === undefined) return;
        if (statement.reference.ref === undefined) return;

        // Extract referenced referenceable
        const referenceable = statement.reference.ref;
        const value = statement.value;

        if (referenceable.$type === "Condition")
        {
            if (typeof value === "boolean") return;
            accept("error", "Stated value is not a valid value of the referenced object.", {
                node: statement,
                property: "value",
            });
            return;
        }

        const proposition = referenceable as Proposition;

        if (!proposition.valueClauses || !proposition.valueClauses.some(x => x.value === value))
        {
            return;
        }

        accept("error", "Stated value is not a valid value of the referenced object.", {
            node: statement,
            property: "value",
        });
    }
}
