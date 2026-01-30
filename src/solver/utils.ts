import { collapse, Expression, getAllConditionsForRaises } from "../../lib/language/utils";
import { loadSolver } from "../../solver/wasm/loader";
import { Laboratory } from "../parser";
import { Value } from "../parser/utils";

export interface GeneratedInput
{
    objective: string;
    variables: string[];
    constraints: string[];
}

interface Mapping
{
    propositions: Map<string, Map<Value, string>>; // Proposition-Name => [Proposition-Value, Variable-Name]
    concerns: Map<string, string>; // Concern-Name => Variable-Name
}

interface State
{
    mappings: Mapping;
    input: GeneratedInput;
    laboratory: Laboratory;
}

type VarGen = Generator<string, never>;

function* variable(prefix: string, input: GeneratedInput): VarGen
{
    let index = 1; // Start at 1 to preserve old variable naming scheme (eases verification)

    while (true)
    {
        const name = `${prefix}${index++}`;
        input.variables.push(name);
        yield name;
    }
}

function mapTweakableValues({ input, laboratory, mappings }: State)
{
    const x = variable("x", input);

    for (const tweakable of laboratory.tweakables)
    {
        const mapping = new Map<Value, string>();

        for (const value of tweakable.allowedValues)
        {
            mapping.set(value, x.next().value);
        }

        mappings.propositions.set(tweakable.name, mapping); // map all allowed values of tweakable
    }
}

function mapConcerns({ input, laboratory, mappings }: State)
{
    const r = variable("r", input);

    for (const concern of laboratory.concerns.values())
    {
        mappings.concerns.set(concern.name, r.next().value); // map concern to variable
    }
}

function mapTweakableConstraints({ input, laboratory, mappings }: State)
{
    for (const tweakable of laboratory.tweakables)
    {
        const mapped = mappings.propositions.get(tweakable.name)!.values();
        input.constraints.push(`${[...mapped].join("+")} == 1`); // only one value of a tweakable can be set
    }
}

function buildRaiseConstraint(input: GeneratedInput, mappings: Mapping, expr: Expression, zGen: VarGen): string
{
    switch (expr.$type)
    {
        case "OrExpression":
        {
            const z = zGen.next().value;
            const a = buildRaiseConstraint(input, mappings, expr.left, zGen);
            const b = buildRaiseConstraint(input, mappings, expr.right, zGen);

            input.constraints.push(`${z}-${a}-${b} <= 0`);
            input.constraints.push(`${a}-${z} <= 0`);
            input.constraints.push(`${b}-${z} <= 0`);

            return z;
        }
        case "AndExpression":
        {
            const z = zGen.next().value;
            const a = buildRaiseConstraint(input, mappings, expr.left, zGen);
            const b = buildRaiseConstraint(input, mappings, expr.right, zGen);

            input.constraints.push(`${a}+${b}-${z} <= 1`);
            input.constraints.push(`${z}-${a} <= 0`);
            input.constraints.push(`${z}-${b} <= 0`);

            return z;
        }
        case "Negation":
        {
            const z = zGen.next().value;
            const a = buildRaiseConstraint(input, mappings, expr.inner, zGen);

            input.constraints.push(`-${a}-${z} <= -1`);
            input.constraints.push(`${a}+${z} <= 1`);

            return z;
        }
        case "Statement":
        {
            const ref = expr.reference.ref!;

            return ref.$type === "Proposition"
                ? mappings.propositions.get(ref.name)!.get(expr.value)!
                : buildRaiseConstraint(input, mappings, ref.condition.expression, zGen); // Just inline conditions
        }
        case "Group":
            return buildRaiseConstraint(input, mappings, expr.inner, zGen);
    }
}

function mapRaiseConstraints({ input, laboratory, mappings }: State)
{
    const raises = getAllConditionsForRaises(laboratory.model);
    const z = variable("z", input);

    for (const [name, conditions] of raises.entries())
    {
        const expr = collapse(conditions);

        const f = buildRaiseConstraint(input, mappings, expr, z);
        const r = mappings.concerns.get(name)!;

        input.constraints.push(`${f}-${r} == 0`);
    }
}

export interface Input
{
    input: GeneratedInput;
    mappings: Mapping;
}

export function makeInput(laboratory: Laboratory, weights: Map<string, number>)
{
    const input: GeneratedInput = {
        variables: [],
        constraints: [],
        objective: "",
    };

    const mappings: Mapping = {
        propositions: new Map(),
        concerns: new Map(),
    };

    const state: State = {
        input,
        laboratory,
        mappings,
    };

    mapTweakableValues(state);
    mapConcerns(state);

    mapTweakableConstraints(state);
    mapRaiseConstraints(state);

    const concerns: string[] = [];

    for (const concern of laboratory.concerns.keys())
    {
        const weight = weights.get(concern) ?? 1;
        const variable = mappings.concerns.get(concern)!;

        if (weight <= 0)
        {
            continue;
        }

        concerns.push(weight > 1 ? `(${weight}*${variable})` : variable);
    }

    input.objective = concerns.join("+");

    return { input, mappings };
}

const solverPromise = loadSolver();

export interface Solution
{
    success: boolean;
    message?: string;
}

export async function solveTweakables(lab: Laboratory, input: Input): Promise<Solution>
{
    const solver = await solverPromise;
    const constraints = new solver.VecString();

    for (const constraint of input.input.constraints)
    {
        constraints.push_back(constraint);
    }

    const variables = new solver.VecString();

    for (const variable of input.input.variables)
    {
        variables.push_back(variable);
    }

    const solution = solver.solve({
        objective: input.input.objective,
        variables,
        constraints,
    });

    if (!solution.success)
    {
        return { success: false, message: solution.message.toString() };
    }

    const keys = solution.variables.keys();

    for (let i = 0; keys.size() > i; ++i)
    {
        const key = keys.get(i)!;

        if (!key.startsWith("x"))
        {
            continue;
        }

        const variable = solution.variables.get(key)!;

        if (!variable)
        {
            continue;
        }

        const [tweakable, mapping] = [...input.mappings.propositions.entries()].find(
            mapping => [...mapping[1].values()].includes(key),
        )!;

        const value = mapping.entries().find(x => x[1] === key)![0];
        const tweak = lab.tweakables.find(x => x.name === tweakable)!;

        tweak.update(value);
    }

    return { success: true };
}
