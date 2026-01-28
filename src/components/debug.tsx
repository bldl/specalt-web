import { Code, Divider, ScrollArea, Stack, StackProps } from "@mantine/core";

import { Input } from "../solver/utils";
import { ObjectInspector } from "react-inspector";

export interface DebuggerProps extends StackProps
{
    input: Input;
}

export function Debugger({ input, ...props }: DebuggerProps)
{
    return (
        <Stack p="md" {...props}>
            <ScrollArea>
                <Divider label="Inspector" />
                <ObjectInspector theme="chromeDark" data={input} />
                <Divider label="Objective" />
                <Code block>{input.input.objective}</Code>
                <Divider label="Constraints" />
                <Code block>{input.input.constraints.join("\n")}</Code>
            </ScrollArea>
        </Stack>
    );
}
