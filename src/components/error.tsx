import { Stack, StackProps, ThemeIcon } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

export function Error(props: StackProps)
{
    return (
        <Stack justify="center" align="center" {...props}>
            <ThemeIcon variant="light" radius="xl" color="red" size="xl">
                <IconX />
            </ThemeIcon>
            Could not parse Laboratory! Please check for errors...
        </Stack>
    );
}
