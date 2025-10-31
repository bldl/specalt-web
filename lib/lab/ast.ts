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
    left: AstNode;
    right: AstNode;
    op: "or" | "and";
}

export interface Lookup
{
    left: string;
    $left: "condition" | "proposition";
    right: string | boolean;
    op: "eq" | "neq";
}

export interface Unary
{
    value: AstNode;
    op: "not";
}

export interface Group
{
    inner: AstNode;
}

export type AstNode = Binary | Unary | Group | Lookup;

export const buildAst: LogicalExpressionExtractor<AstNode> = {
    fromOrExpression: function(expression: OrExpression)
    {
        return {
            left: buildAst.fromExpression(expression.left),
            right: buildAst.fromExpression(expression.right),
            op: "or",
        };
    },
    fromAndExpression: function(expression: AndExpression)
    {
        return {
            left: buildAst.fromExpression(expression.left),
            right: buildAst.fromExpression(expression.right),
            op: "and",
        };
    },
    fromNegation: function(expression: NegationExpression)
    {
        return {
            value: buildAst.fromExpression(expression.inner),
            op: "not",
        };
    },
    fromGroup: function(expression: GroupExpression)
    {
        return { inner: buildAst.fromExpression(expression.inner) };
    },
    fromStatement: function(expression: StatementExpression)
    {
        const reference = expression.reference.ref!;
        const op = expression.negation ? "neq" : "eq";

        switch (reference.$type)
        {
            case "Condition":
                return {
                    op,
                    left: reference.name,
                    $left: "condition",
                    right: expression.value,
                };
            case "Proposition":
                return {
                    op,
                    left: reference.name,
                    $left: "proposition",
                    right: expression.value,
                };
        }
    },
    fromExpression: function(expression: PropositionalExpression)
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
