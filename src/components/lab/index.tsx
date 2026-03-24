import Markdown from "../markdown";

import { Badge, Group, rem, ScrollArea, Stack, StackProps, Title } from "@mantine/core";

import { Item } from "./item";
import { Error } from "../error";
import { ParsedLab } from "../../pages";
import { evaluate } from "../../parser/utils";

export interface LabProps extends Omit<StackProps, "align">
{
    drawId: number;
    lab: ParsedLab;
    redraw: () => void;
}

export function Lab({ lab, redraw, drawId, ...props }: LabProps)
{
    if (!lab.last)
    {
        return <Error kind="missing" {...props} />;
    }

    const { title, authors, description, tweakables, givens, propositions } = lab.last;
    const concerns = evaluate(propositions.flatMap(prop => prop.concerns()));

    console.log(concerns);

    return (
        <Stack align="center" {...props}>
            {!lab.success && <Error kind="outdated" />}

            {title && <Title>{title}</Title>}

            <Group wrap="nowrap">
                {authors?.map(author => (
                    <Badge
                        mih={rem(25)}
                        key={author}
                    >
                        {author}
                    </Badge>
                ))}
                <Badge
                    color={concerns.length > 1 ? "red" : "green"}
                    mih={rem(25)}
                >
                    Active Concerns: {concerns.length}
                </Badge>
            </Group>

            {description && <Markdown>{description}</Markdown>}

            <ScrollArea w="100%">
                <Stack px="xl" align="center" key={drawId}>
                    {givens.map(given => (
                        <Item
                            w="100%"
                            item={given}
                            key={given.expression}
                        />
                    ))}
                    {tweakables.map(tweakable => (
                        <Item
                            w="100%"
                            redraw={redraw}
                            item={tweakable}
                            key={tweakable.expression}
                        />
                    ))}
                </Stack>
            </ScrollArea>
        </Stack>
    );
}
