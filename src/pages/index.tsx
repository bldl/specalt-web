import { useEffect, useState } from "react";
import { useClipboard, useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import {
    ActionIcon,
    AppShell,
    Button,
    Center,
    Group,
    Modal,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import {
    IconBrain,
    IconBrandGithub,
    IconBug,
    IconCheck,
    IconCode,
    IconEye,
    IconShare,
    IconShare3,
    IconTestPipe,
    IconX,
} from "@tabler/icons-react";

import { Mutex } from "async-mutex";
import { fromThrowable } from "neverthrow";

import { Lab } from "../components/lab";
import { Editor } from "../components/editor";
import { Optimizer } from "../components/optimizer";

import { Laboratory, parseLaboratory } from "../parser";
import { currentSearch, Tab, updateSearch } from "../utils/search";

import exampleCode from "../../examples/in/records_and_tuples.spa?raw";
import { Input } from "../solver/utils";
import { Debugger } from "../components/debug";
import { notifications } from "@mantine/notifications";

interface MainProps
{
    tab: Tab;
    lab?: Laboratory;
    lastDraft: string;
    updateLab: (value: string) => void;
}

function Main({ tab, lab, lastDraft, updateLab }: MainProps)
{
    const [version, setVersion] = useState(0);
    const redraw = () => setVersion(version + 1);
    const [input, setInput] = useState<Input | undefined>();

    switch (tab)
    {
        case "preview":
            return <Lab w="100%" h="100%" lab={lab} redraw={redraw} drawId={version} />;
        case "editor":
            return (
                <>
                    <Editor className="editor" lastDraft={lastDraft} updateLab={updateLab} />
                    <Lab w="50%" lab={lab} redraw={redraw} drawId={version} />
                </>
            );
        case "optimize":
            return (
                <>
                    <Lab w="50%" lab={lab} redraw={redraw} drawId={version} />
                    <Optimizer w="50%" lab={lab} redraw={redraw} updateInput={setInput} />
                </>
            );
        case "debug":
            return (
                <>
                    <Optimizer w="50%" lab={lab} redraw={redraw} updateInput={setInput} />
                    {input && <Debugger w="50%" input={input} />}
                </>
            );
    }
}

const mutex = new Mutex();
const setLocalStorage = fromThrowable((key: string, value: string) => localStorage.setItem(key, value), e => e);

export function Root()
{
    const search = currentSearch();
    const clipboard = useClipboard();

    const [share, setShare] = useState("");
    const [opened, { open, close }] = useDisclosure(false);

    const [tab, setTab] = useState<Tab>(currentSearch().tab ?? "editor");
    const [lab, setLab] = useState<Laboratory | undefined>();

    const save = useDebouncedCallback(setLocalStorage, 1000);
    const [lastDraft, setLastDraft] = useState<string | undefined>();

    const updateLab = (value: string) =>
    {
        mutex.runExclusive(() =>
            parseLaboratory(value).then(
                result => result.andTee(setLab),
            )
        );

        save("draft", value);
        updateSearch({ url: "" });
    };

    const performShare = () =>
    {
        updateSearch({ url: share });
        clipboard.copy(window.location.href);

        notifications.show({
            withBorder: true,
            position: "top-right",
            color: "green",
            title: "Success",
            icon: <IconCheck size={16} />,
            message: "Link copied to clipbaord",
        });
    };

    const loadCode = (value: string = localStorage.getItem("draft") || exampleCode) =>
    {
        setLastDraft(value);
        updateLab(value);
    };

    useEffect(() =>
    {
        if (search.url)
        {
            fetch(search.url).then(result => result.text())
                .then(loadCode)
                .catch(() =>
                {
                    notifications.show({
                        withBorder: true,
                        position: "top-right",
                        color: "red",
                        title: "Error",
                        icon: <IconX size={16} />,
                        message: "Failed to load shared url!",
                    });

                    loadCode();
                });

            return;
        }

        loadCode();
    }, []);

    useEffect(() =>
    {
        updateSearch({ tab });
    }, [tab]);

    return (
        <AppShell padding="md" header={{ height: 60 }}>
            <Modal opened={opened} onClose={close} centered>
                <Stack>
                    <Text>
                        As SpecAlt is served via GitHub Pages and runs entirely in the browser (without any backend), it
                        is not possible for us to host files for sharing currently.
                    </Text>
                    <Text>
                        However, we can automatically load files from hosters (such Github Gists) that allow CORS
                        access.
                    </Text>
                    <Text>
                        To share this laboratory, please upload your current draft to a hoster of your choice that
                        fullfills the aforementioned requirements and provide the link below!
                    </Text>
                    <TextInput
                        placeholder="https://gist.githubusercontent.com/..."
                        value={share}
                        onChange={e => setShare(e.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button leftSection={<IconShare size={16} />} onClick={performShare}>
                            Share
                        </Button>
                    </Group>
                </Stack>
            </Modal>
            <AppShell.Header>
                <Group wrap="nowrap" h="100%" px="md" className="header">
                    <Group wrap="nowrap" gap="xs" style={{ flexGrow: 1, flexBasis: 0 }}>
                        <IconTestPipe />
                        <Text fw="bolOptimizeder">
                            SpecAlt
                        </Text>
                        <Text c="dimmed" fs="italic" visibleFrom="md">
                            - The JavaScript Proposal Laboratory
                        </Text>
                    </Group>
                    <SegmentedControl
                        withItemsBorders={false}
                        data={[
                            {
                                value: "preview",
                                label: (
                                    <Center style={{ gap: 10 }}>
                                        <IconEye size={16} />
                                        <span>Preview</span>
                                    </Center>
                                ),
                            },
                            {
                                value: "editor",
                                label: (
                                    <Center style={{ gap: 10 }}>
                                        <IconCode size={16} />
                                        <span>Edit</span>
                                    </Center>
                                ),
                            },
                            {
                                value: "optimize",
                                label: (
                                    <Center style={{ gap: 10 }}>
                                        <IconBrain size={16} />
                                        <span>Optimize</span>
                                    </Center>
                                ),
                            },
                            {
                                value: "debug",
                                label: (
                                    <Center style={{ gap: 10 }}>
                                        <IconBug size={16} />
                                        <span>Debug</span>
                                    </Center>
                                ),
                            },
                        ]}
                        value={tab}
                        onChange={value => setTab(value as Tab)}
                    />
                    <Group justify="flex-end" style={{ flexGrow: 1, flexBasis: 0 }}>
                        <ActionIcon
                            color="lime"
                            onClick={open}
                            variant="light"
                        >
                            <IconShare3 size={16} />
                        </ActionIcon>
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
            <AppShell.Main className="main">
                {lastDraft && (
                    <Main
                        tab={tab}
                        lab={lab}
                        lastDraft={lastDraft}
                        updateLab={updateLab}
                    />
                )}
            </AppShell.Main>
        </AppShell>
    );
}
