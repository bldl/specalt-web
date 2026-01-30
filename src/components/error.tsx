import { Alert, Stack, StackProps, ThemeIcon } from "@mantine/core";
import { IconAlertCircle, IconX } from "@tabler/icons-react";

interface ErrorProps extends StackProps
{
    kind: "missing" | "outdated";
}

export function Error({ kind, ...props }: ErrorProps)
{
    if (kind === "outdated")
    {
        return (
            <Stack w="100%" align="center" {...props}>
                <Alert w="95%" icon={<IconAlertCircle size={16} />} color="red" title="Notice">
                    The shown data is outdated because the last changes could not be parsed properly
                </Alert>
            </Stack>
        );
    }

    return (
        <Stack justify="center" align="center" {...props}>
            <ThemeIcon variant="light" radius="xl" color="red" size="xl">
                <IconX />
            </ThemeIcon>
            Could not parse Laboratory! Please check for errors...
        </Stack>
    );
}
