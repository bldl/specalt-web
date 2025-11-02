import { Value } from ".";
import {
    AndExpression,
    Group as GroupExpression,
    Negation as NegationExpression,
    OrExpression,
    PropositionalExpression,
    Statement as StatementExpression,
} from "../language/generated/ast";
import { LogicalExpressionExtractor } from "../language/utils";

export interface Binary
{
    $type: "binary";
    left: AstNode;
    right: AstNode;
    op: "or" | "and" | "eq" | "neq";
}

export interface Lookup
{
    $type: "lookup";
    what: string;
    type: "condition" | "proposition";
}

export interface Unary
{
    $type: "unary";
    value: AstNode;
    op: "not";
}

export interface Group
{
    $type: "group";
    inner: AstNode;
}

export interface Literal
{
    $type: "literal";
    value: Value;
}

export type AstNode = Binary | Unary | Group | Lookup | Literal;

export const buildAst: LogicalExpressionExtractor<AstNode> = {
    fromOrExpression: (expression: OrExpression) =>
    {
        return {
            left: buildAst.fromExpression(expression.left),
            right: buildAst.fromExpression(expression.right),
            op: "or",
            $type: "binary",
        };
    },
    fromAndExpression: (expression: AndExpression) =>
    {
        return {
            left: buildAst.fromExpression(expression.left),
            right: buildAst.fromExpression(expression.right),
            op: "and",
            $type: "binary",
        };
    },
    fromNegation: (expression: NegationExpression) =>
    {
        return {
            value: buildAst.fromExpression(expression.inner),
            op: "not",
            $type: "unary",
        };
    },
    fromGroup: (expression: GroupExpression) =>
    {
        return { inner: buildAst.fromExpression(expression.inner), $type: "group" };
    },
    fromStatement: (expression: StatementExpression) =>
    {
        const reference = expression.reference.ref!;
        const op = expression.negation ? "neq" : "eq";

        switch (reference.$type)
        {
            case "Condition":
                return {
                    op,
                    left: {
                        $type: "lookup",
                        what: reference.name,
                        type: "condition",
                    },
                    right: { $type: "literal", value: expression.value },
                    $type: "binary",
                };
            case "Proposition":
                return {
                    op,
                    left: {
                        $type: "lookup",
                        what: reference.name,
                        type: "proposition",
                    },
                    right: { $type: "literal", value: expression.value },
                    $type: "binary",
                };
        }
    },
    fromExpression: (expression: PropositionalExpression) =>
    {
        switch (expression.$type)
        {
            case "OrExpression":
                return buildAst.fromOrExpression(expression as OrExpression);
            case "AndExpression":
                return buildAst.fromAndExpression(expression as AndExpression);
            case "Negation":
                return buildAst.fromNegation(expression as NegationExpression);
            case "Group":
                return buildAst.fromGroup(expression as GroupExpression);
            case "Statement":
                return buildAst.fromStatement(expression as StatementExpression);
        }
    },
};
