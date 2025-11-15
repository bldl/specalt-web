import { ChangeEvent, useState } from "react";

import Markdown from "../components/markdown";
import { IconAlertTriangle } from "@tabler/icons-react";

import {
    Alert,
    Badge,
    Card,
    CardProps,
    Code,
    Group,
    NativeSelect,
    rem,
    ScrollArea,
    Stack,
    StackProps,
    Title,
} from "@mantine/core";

import { evaluate } from "../parser/utils";
import { Given, Laboratory, Tweakable } from "../parser";

export interface ItemProps extends Omit<CardProps, "withBorder">
{
    item: Tweakable | Given;
    notify?: () => void;
}

export function Item({ item, notify, ...props }: ItemProps)
{
    const { expression, value } = item;

    const disable = "disable" in item ? evaluate(item.disable) : true;
    const concerns = "concerns" in item ? evaluate(item.concerns) : [];
    const allowedValues = "allowedValues" in item ? item.allowedValues.map(value => `${value}`) : [`${item.value}`];

    const update = ({ currentTarget }: ChangeEvent<HTMLSelectElement>) =>
    {
        if ("update" in item)
        {
            item.update(item.type === "boolean" ? currentTarget.value === "true" : currentTarget.value);
        }

        notify?.();
    };

    return (
        <Card withBorder {...props}>
            <Stack>
                <Group wrap="nowrap" justify="space-between">
                    <Code>
                        {expression}
                    </Code>
                    <NativeSelect
                        onChange={update}
                        disabled={disable}
                        data={allowedValues}
                        value={`${evaluate(value)}`}
                    />
                </Group>
                {concerns.length > 0
                    && (
                        <Stack>
                            {concerns.map(concern => (
                                <Alert
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

export interface LabProps extends Omit<StackProps, "align">
{
    laboratory?: Laboratory;
}

export function Lab({ laboratory, ...props }: LabProps)
{
    if (!laboratory)
    {
        return <></>;
    }

    const [ver, setVer] = useState(0);
    const { title, authors, description, tweakables, givens } = laboratory;

    return (
        <Stack align="center" {...props}>
            {title && <Title>{title}</Title>}
            <Group wrap="nowrap">
                {authors?.map(author => <Badge mih={rem(25)} key={author}>{author}</Badge>)}
            </Group>
            {description && <Markdown>{description}</Markdown>}
            <ScrollArea w="100%">
                <Stack align="center" key={ver}>
                    {givens.map(given => (
                        <Item
                            w="90%"
                            item={given}
                            key={given.expression}
                        />
                    ))}
                    {tweakables.map(tweakable => (
                        <Item
                            w="90%"
                            item={tweakable}
                            key={tweakable.expression}
                            notify={() => setVer(ver + 1)}
                        />
                    ))}
                </Stack>
            </ScrollArea>
        </Stack>
    );
}
