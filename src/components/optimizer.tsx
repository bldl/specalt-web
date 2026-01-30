import { useEffect, useMemo, useState } from "react";

import {
    Button,
    Card,
    Code,
    Group,
    NumberInput,
    ScrollArea,
    Spoiler,
    Stack,
    StackProps,
    Text,
    Title,
} from "@mantine/core";

import Markdown from "react-markdown";
import { notifications } from "@mantine/notifications";
import { IconBug, IconSend2 } from "@tabler/icons-react";

import { Error } from "./error";
import { ParsedLab } from "../pages";
import { Laboratory } from "../parser";
import { currentSearch, SerializedWeights, updateSearch } from "../utils/search";
import { Input, makeInput, solveTweakables } from "../solver/utils";

export interface OptimizerProps extends StackProps
{
    lab: ParsedLab;
    redraw?: () => void;
    updateInput: (value: Input) => void;
}

function allowedWeights(lab: Laboratory, weights?: SerializedWeights): weights is SerializedWeights
{
    const concerns = Object.keys(weights ?? {});
    return lab.concerns.keys().every(key => concerns.includes(key));
}

export function Optimizer({ lab, redraw, updateInput, ...props }: OptimizerProps)
{
    if (!lab.last)
    {
        return <Error kind="missing" {...props} />;
    }

    const current = currentSearch();

    const [weights, setWeights] = useState(
        allowedWeights(lab.last, current.weights)
            ? new Map(Object.entries(current.weights))
            : new Map(
                lab.last.concerns.values().map(
                    concern => [concern.name, 1 as number] as const,
                ),
            ),
    );

    const input = useMemo(() => makeInput(lab.last!, weights), [lab, weights]);
    useEffect(() => updateInput(input), [input]);

    const update = (name: string, value: number) =>
    {
        weights.set(name, value);
        setWeights(new Map(weights));
        updateSearch({ weights: Object.fromEntries(weights) });
    };

    const solve = async () =>
    {
        const id = notifications.show({
            loading: true,
            title: "Crunching the Numbers!",
            message: "Please wait, this might take a second...",
            autoClose: false,
            withCloseButton: false,
        });

        const { success, message } = await solveTweakables(lab.last!, input);

        notifications.hide(id);

        if (success)
        {
            return redraw?.();
        }

        console.error("Solver failed with", message);

        notifications.show({
            withBorder: true,
            position: "top-right",
            color: "red",
            title: "Oh no!",
            icon: <IconBug size={16} />,
            message: `The solver failed with: ${message}`,
        });
    };

    return (
        <Stack {...props}>
            {!lab.success && <Error kind="outdated" />}

            <Title ta="center">
                Optimize
            </Title>

            <Text ta="center" c="dimmed">
                Using higher weights will prefer the given setting more
            </Text>

            <ScrollArea w="100%">
                <Stack align="end" p="md">
                    {[...weights.entries()].map(([name, value]) => (
                        <Card w="100%" withBorder key={name}>
                            <Stack>
                                <Group wrap="nowrap" justify="space-between">
                                    <Code>
                                        {name}
                                    </Code>
                                    <NumberInput
                                        w={75}
                                        value={value}
                                        allowNegative={false}
                                        onChange={value => update(name, value as number)}
                                    />
                                </Group>
                                <Spoiler
                                    classNames={{ control: "spoiler" }}
                                    maxHeight={0}
                                    hideLabel="Hide Description"
                                    showLabel="Show Description"
                                >
                                    <Markdown>
                                        {lab.last!.concerns.get(name)!.description}
                                    </Markdown>
                                </Spoiler>
                            </Stack>
                        </Card>
                    ))}
                </Stack>
            </ScrollArea>

            <Group justify="flex-end">
                <Button leftSection={<IconSend2 size={16} />} onClick={solve}>
                    Run
                </Button>
            </Group>
        </Stack>
    );
}
