import type { ValidationAcceptor, ValidationChecks } from "langium";

import { type SpecAltFormatServices } from "./specalt-format-module";
import { extractReferenceables, getAllUsedConcerns, getAllUsedReferenceables } from "./utils";
import { Condition, LaboratoryInformation, Model, Proposition, type SpecAltAstType, Statement } from "./generated/ast";

export function registerValidationChecks({ validation }: SpecAltFormatServices)
{
    const { ValidationRegistry: registry, SpecAltFormatValidator: validator } = validation;

    const checks: ValidationChecks<SpecAltAstType> = {
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

export class SpecAltFormatValidator
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

        if (defaults.length === 1)
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

        const referenceable = statement.reference.ref;
        const value = statement.value;

        if (referenceable.$type === "Condition" && typeof value !== "boolean")
        {
            return accept("error", "Stated value is not a valid value of the referenced object.", {
                node: statement,
                property: "value",
            });
        } else if (referenceable.$type === "Condition")
        {
            return;
        }

        const proposition = referenceable as Proposition;

        if (!proposition.valueClauses || proposition.valueClauses.some(x => x.value === value))
        {
            return;
        }

        accept("error", "Stated value is not a valid value of the referenced object.", {
            node: statement,
            property: "value",
        });
    }
}
