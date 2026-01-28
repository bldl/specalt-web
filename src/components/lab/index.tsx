import Markdown from "react-markdown";

import { Badge, Group, rem, ScrollArea, Stack, StackProps, Title } from "@mantine/core";

import { Item } from "./item";
import { Error } from "../error";
import { Laboratory } from "../../parser";

export interface LabProps extends Omit<StackProps, "align">
{
    drawId: number;
    lab?: Laboratory;
    redraw: () => void;
}

export function Lab({ lab, redraw, drawId, ...props }: LabProps)
{
    if (!lab)
    {
        return <Error {...props} />;
    }

    const { title, authors, description, tweakables, givens } = lab;

    return (
        <Stack align="center" {...props}>
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
