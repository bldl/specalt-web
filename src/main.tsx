import ReactDOM from "react-dom/client";

import "./style/index.css";
import "@mantine/core/styles.css";

import { IconBrandGithub, IconTestPipe2 } from "@tabler/icons-react";
import { ActionIcon, AppShell, Group, MantineProvider, Text } from "@mantine/core";

import Editor from "./pages/editor.tsx";
import { initMonaco } from "./utils/monaco.ts";

const languageConfig = await initMonaco();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <MantineProvider theme={{ primaryColor: "violet", defaultRadius: "md" }} forceColorScheme="dark">
        <AppShell padding="md" header={{ height: 60 }}>
            <AppShell.Header>
                <Group justify="space-between" h="100%" px="md">
                    <Group wrap="nowrap" gap="xs">
                        <IconTestPipe2 />
                        <Text fw="bolder">
                            SpecAlt
                        </Text>
                        <Text c="dimmed" fs="italic">
                            - The JavaScript Proposal Laboratory
                        </Text>
                    </Group>
                    <Group>
                        <ActionIcon
                            component="a"
                            href="https://github.com/bldl/specalt-web"
                            target="_blank"
                            variant="light"
                        >
                            <IconBrandGithub size={16} />
                        </ActionIcon>
                    </Group>
                </Group>
            </AppShell.Header>
            <AppShell.Main>
                <Editor languageConfig={languageConfig} />
            </AppShell.Main>
        </AppShell>
    </MantineProvider>,
);
