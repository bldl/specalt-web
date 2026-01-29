import { ChangeEvent } from "react";
import Markdown from "react-markdown";

import { IconAlertTriangle } from "@tabler/icons-react";
import { Alert, Card, CardProps, Code, Group, NativeSelect, Stack, Text } from "@mantine/core";

import { evaluate } from "../../parser/utils";
import { Given, Tweakable } from "../../parser";

export interface ItemProps extends Omit<CardProps, "withBorder">
{
    item: Tweakable | Given;
    redraw?: () => void;
}

export function Item({ item, redraw, ...props }: ItemProps)
{
    const { expression, value } = item;

    const disable = "disable" in item ? evaluate(item.disable) : { value: true, message: "" };
    const concerns = "concerns" in item ? evaluate(item.concerns) : [];
    const allowedValues = "allowedValues" in item ? item.allowedValues.map(value => `${value}`) : [`${item.value}`];

    const update = ({ currentTarget }: ChangeEvent<HTMLSelectElement>) =>
    {
        if ("update" in item)
        {
            item.update(item.type === "boolean" ? currentTarget.value === "true" : currentTarget.value);
        }

        redraw?.();
    };

    return (
        <Card withBorder {...props}>
            <Stack>
                <Group wrap="nowrap" justify="space-between">
                    <Code td={disable.message ? "line-through" : undefined}>
                        {expression}
                    </Code>
                    <NativeSelect
                        onChange={update}
                        disabled={disable.value}
                        data={allowedValues}
                        value={`${evaluate(value)}`}
                    />
                </Group>
                {disable.message && (
                    <Text c="dimmed" size="xs">
                        Disabled due to: <Code>{disable.message}</Code>
                    </Text>
                )}
                {concerns.length > 0
                    && (
                        <Stack>
                            {concerns.map(concern => (
                                <Alert
                                    key={concern.name}
                                    icon={<IconAlertTriangle size={16} />}
                                    color="orange"
                                    variant="transparent"
                                    title={concern.summary}
                                >
                                    <Markdown>
                                        {concern.description}
                                    </Markdown>
                                </Alert>
                            ))}
                        </Stack>
                    )}
            </Stack>
        </Card>
    );
}
